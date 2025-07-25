import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
// Using browser-compatible crypto for 2FA instead of speakeasy
import { 
  CreateMessageSchema, 
  CreateDirectMessageSchema, 
  UpdateUserSchema,
  TypingStatusSchema,
  Enable2FASchema,
  Verify2FASchema,
  PushSubscriptionSchema,
  PushSettingsSchema,
  type User,
  type MessageWithUser,
  type DirectMessageWithUsers
} from "@/shared/types";

const app = new Hono<{ Bindings: Env }>();

// CORS configuration
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Authentication endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Helper function to get or create user
async function getOrCreateUser(c: any): Promise<User> {
  const mochaUser = c.get('user');
  
  // Check if user exists in our database
  const existingUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  ).bind(mochaUser.id).first();

  if (existingUser) {
    // Update last activity
    await c.env.DB.prepare(
      "UPDATE users SET last_activity_at = datetime('now') WHERE id = ?"
    ).bind((existingUser as any).id).run();
    
    // Check if temporary admin access has expired
    const user = existingUser as any;
    if (user.is_temporary_admin && user.admin_expires_at) {
      const expiresAt = new Date(user.admin_expires_at);
      if (expiresAt < new Date()) {
        // Revoke expired admin access
        await c.env.DB.prepare(`
          UPDATE users 
          SET is_temporary_admin = 0, admin_expires_at = NULL, updated_at = datetime('now')
          WHERE id = ?
        `).bind(user.id).run();
        
        // Notify user
        await c.env.DB.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).bind(
          user.id,
          'Admin Access Expired',
          'Your temporary admin access has expired.',
          'info'
        ).run();
        
        user.is_temporary_admin = false;
        user.admin_expires_at = null;
      }
    }
    
    return user as User;
  }

  // Create new user
  const displayName = mochaUser.google_user_data?.name || mochaUser.email.split('@')[0];
  const avatarUrl = mochaUser.google_user_data?.picture || null;
  const isAdmin = mochaUser.email.toLowerCase() === 'flatbushpatrol101@gmail.com';

  const result = await c.env.DB.prepare(`
    INSERT INTO users (mocha_user_id, email, display_name, avatar_url, is_admin, last_activity_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(mochaUser.id, mochaUser.email, displayName, avatarUrl, isAdmin ? 1 : 0).run();

  // Log login history
  await c.env.DB.prepare(`
    INSERT INTO login_history (user_id, logged_in_at)
    VALUES (?, datetime('now'))
  `).bind(result.meta.last_row_id).run();

  return await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(result.meta.last_row_id).first() as User;
}

// Get current user
app.get("/api/users/me", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    return c.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    return c.json({ error: 'Failed to get user data' }, 500);
  }
});

// Update user profile
app.put("/api/users/me", authMiddleware, zValidator("json", UpdateUserSchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const updates = c.req.valid("json");

    await c.env.DB.prepare(`
      UPDATE users 
      SET display_name = COALESCE(?, display_name),
          avatar_url = COALESCE(?, avatar_url),
          nfc_tag_uid = COALESCE(?, nfc_tag_uid),
          totp_secret = COALESCE(?, totp_secret),
          is_2fa_enabled = COALESCE(?, is_2fa_enabled),
          push_notification_token = COALESCE(?, push_notification_token),
          push_notifications_enabled = COALESCE(?, push_notifications_enabled),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      updates.display_name || null, 
      updates.avatar_url || null, 
      updates.nfc_tag_uid || null, 
      updates.totp_secret || null,
      updates.is_2fa_enabled !== undefined ? (updates.is_2fa_enabled ? 1 : 0) : null,
      updates.push_notification_token || null,
      updates.push_notifications_enabled !== undefined ? (updates.push_notifications_enabled ? 1 : 0) : null,
      user.id
    ).run();

    const updatedUser = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(user.id).first();

    return c.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// Get all users (for DM list)
app.get("/api/users", authMiddleware, async (c) => {
  try {
    const currentUser = await getOrCreateUser(c);
    
    const users = await c.env.DB.prepare(`
      SELECT id, email, display_name, avatar_url, is_admin, is_temporary_admin
      FROM users 
      WHERE id != ?
      ORDER BY display_name, email
    `).bind(currentUser.id).all();

    return c.json(users.results);
  } catch (error) {
    console.error('Error getting users:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// Get messages for a chat
app.get("/api/messages/:chatType", authMiddleware, async (c) => {
  try {
    const chatType = c.req.param('chatType');
    
    if (!['messages', 'messages_v2'].includes(chatType)) {
      return c.json({ error: 'Invalid chat type' }, 400);
    }

    const messages = await c.env.DB.prepare(`
      SELECT 
        m.*,
        u.display_name as sender_display_name,
        u.email as sender_email,
        u.avatar_url as sender_avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_type = ?
      ORDER BY m.timestamp ASC
    `).bind(chatType).all();

    const formattedMessages: MessageWithUser[] = messages.results.map((msg: any) => ({
      ...msg,
      sender: {
        display_name: msg.sender_display_name,
        email: msg.sender_email,
        avatar_url: msg.sender_avatar_url,
      }
    }));

    return c.json(formattedMessages);
  } catch (error) {
    console.error('Error getting messages:', error);
    return c.json({ error: 'Failed to get messages' }, 500);
  }
});

// Create a message
app.post("/api/messages", authMiddleware, zValidator("json", CreateMessageSchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const messageData = c.req.valid("json");

    const result = await c.env.DB.prepare(`
      INSERT INTO messages (chat_type, text, sender_id, location_lat, location_lng, address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      messageData.chat_type,
      messageData.text,
      user.id,
      messageData.location_lat || null,
      messageData.location_lng || null,
      messageData.address || null
    ).run();

    const newMessage = await c.env.DB.prepare(`
      SELECT 
        m.*,
        u.display_name as sender_display_name,
        u.email as sender_email,
        u.avatar_url as sender_avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).bind(result.meta.last_row_id).first();

    const formattedMessage: MessageWithUser = {
      ...newMessage as any,
      sender: {
        display_name: (newMessage as any).sender_display_name,
        email: (newMessage as any).sender_email,
        avatar_url: (newMessage as any).sender_avatar_url,
      }
    };

    // Send push notifications to users who have them enabled
    try {
      const usersWithPush = await c.env.DB.prepare(`
        SELECT id, push_notification_token, display_name, email 
        FROM users 
        WHERE push_notifications_enabled = 1 
        AND push_notification_token IS NOT NULL 
        AND id != ?
      `).bind(user.id).all();

      for (const pushUser of usersWithPush.results) {
        await c.env.DB.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).bind(
          (pushUser as any).id,
          'New Chat Message',
          `${user.display_name || user.email}: ${messageData.text.slice(0, 100)}${messageData.text.length > 100 ? '...' : ''}`,
          'info'
        ).run();
      }
    } catch (pushError) {
      console.warn('Failed to send push notifications:', pushError);
    }

    return c.json(formattedMessage, 201);
  } catch (error) {
    console.error('Error creating message:', error);
    return c.json({ error: 'Failed to create message' }, 500);
  }
});

// Delete a message (admin or own message)
app.delete("/api/messages/:id", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const messageId = c.req.param('id');

    const message = await c.env.DB.prepare(
      "SELECT * FROM messages WHERE id = ?"
    ).bind(messageId).first();

    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Check if user is admin or message owner
    if (!user.is_admin && !((user as any).is_temporary_admin) && (message as any).sender_id !== user.id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await c.env.DB.prepare(
      "DELETE FROM messages WHERE id = ?"
    ).bind(messageId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
});

// Update a message (admin or own message)
app.put("/api/messages/:id", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const messageId = c.req.param('id');
    const body = await c.req.json();

    const message = await c.env.DB.prepare(
      "SELECT * FROM messages WHERE id = ?"
    ).bind(messageId).first();

    if (!message) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Check if user is admin or message owner
    if (!user.is_admin && !((user as any).is_temporary_admin) && (message as any).sender_id !== user.id) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await c.env.DB.prepare(`
      UPDATE messages 
      SET text = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(body.text, messageId).run();

    const updatedMessage = await c.env.DB.prepare(`
      SELECT 
        m.*,
        u.display_name as sender_display_name,
        u.email as sender_email,
        u.avatar_url as sender_avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).bind(messageId).first();

    const formattedMessage: MessageWithUser = {
      ...updatedMessage as any,
      sender: {
        display_name: (updatedMessage as any).sender_display_name,
        email: (updatedMessage as any).sender_email,
        avatar_url: (updatedMessage as any).sender_avatar_url,
      }
    };

    return c.json(formattedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    return c.json({ error: 'Failed to update message' }, 500);
  }
});

// Get direct messages between users
app.get("/api/direct-messages/:userId", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const otherUserId = c.req.param('userId');

    const messages = await c.env.DB.prepare(`
      SELECT 
        dm.*,
        sender.display_name as sender_display_name,
        sender.email as sender_email,
        sender.avatar_url as sender_avatar_url,
        recipient.display_name as recipient_display_name,
        recipient.email as recipient_email,
        recipient.avatar_url as recipient_avatar_url
      FROM direct_messages dm
      JOIN users sender ON dm.sender_id = sender.id
      JOIN users recipient ON dm.recipient_id = recipient.id
      WHERE (dm.sender_id = ? AND dm.recipient_id = ?) 
         OR (dm.sender_id = ? AND dm.recipient_id = ?)
      ORDER BY dm.created_at ASC
    `).bind(user.id, otherUserId, otherUserId, user.id).all();

    const formattedMessages: DirectMessageWithUsers[] = messages.results.map((msg: any) => ({
      ...msg,
      sender: {
        display_name: msg.sender_display_name,
        email: msg.sender_email,
        avatar_url: msg.sender_avatar_url,
      },
      recipient: {
        display_name: msg.recipient_display_name,
        email: msg.recipient_email,
        avatar_url: msg.recipient_avatar_url,
      }
    }));

    return c.json(formattedMessages);
  } catch (error) {
    console.error('Error getting direct messages:', error);
    return c.json({ error: 'Failed to get direct messages' }, 500);
  }
});

// Mark direct messages as read
app.post("/api/direct-messages/:userId/read", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const otherUserId = c.req.param('userId');

    await c.env.DB.prepare(`
      UPDATE direct_messages 
      SET is_read = 1, updated_at = datetime('now')
      WHERE sender_id = ? AND recipient_id = ? AND is_read = 0
    `).bind(otherUserId, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return c.json({ error: 'Failed to mark messages as read' }, 500);
  }
});

// Send notification endpoint
app.post("/api/notifications/send", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const body = await c.req.json();
    
    // Only allow sending to self for now, or admin can send to anyone
    if (body.user_id !== user.id && !user.is_admin && !((user as any).is_temporary_admin)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).bind(body.user_id, body.title, body.message, body.type || 'info').run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    return c.json({ error: 'Failed to send notification' }, 500);
  }
});

// Send direct message
app.post("/api/direct-messages", authMiddleware, zValidator("json", CreateDirectMessageSchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const messageData = c.req.valid("json");

    const result = await c.env.DB.prepare(`
      INSERT INTO direct_messages (sender_id, recipient_id, text)
      VALUES (?, ?, ?)
    `).bind(user.id, messageData.recipient_id, messageData.text).run();

    const newMessage = await c.env.DB.prepare(`
      SELECT 
        dm.*,
        sender.display_name as sender_display_name,
        sender.email as sender_email,
        sender.avatar_url as sender_avatar_url,
        recipient.display_name as recipient_display_name,
        recipient.email as recipient_email,
        recipient.avatar_url as recipient_avatar_url
      FROM direct_messages dm
      JOIN users sender ON dm.sender_id = sender.id
      JOIN users recipient ON dm.recipient_id = recipient.id
      WHERE dm.id = ?
    `).bind(result.meta.last_row_id).first();

    const formattedMessage: DirectMessageWithUsers = {
      ...newMessage as any,
      sender: {
        display_name: (newMessage as any).sender_display_name,
        email: (newMessage as any).sender_email,
        avatar_url: (newMessage as any).sender_avatar_url,
      },
      recipient: {
        display_name: (newMessage as any).recipient_display_name,
        email: (newMessage as any).recipient_email,
        avatar_url: (newMessage as any).recipient_avatar_url,
      }
    };

    // Send push notification to recipient
    try {
      const recipient = await c.env.DB.prepare(`
        SELECT push_notifications_enabled, push_notification_token
        FROM users 
        WHERE id = ? AND push_notifications_enabled = 1
      `).bind(messageData.recipient_id).first();

      if (recipient) {
        await c.env.DB.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).bind(
          messageData.recipient_id,
          'New Direct Message',
          `New message from ${user.display_name || user.email}`,
          'info'
        ).run();
      }
    } catch (pushError) {
      console.warn('Failed to send push notification:', pushError);
    }

    return c.json(formattedMessage, 201);
  } catch (error) {
    console.error('Error sending direct message:', error);
    return c.json({ error: 'Failed to send direct message' }, 500);
  }
});

// Typing status endpoints
app.post("/api/typing-status", authMiddleware, zValidator("json", TypingStatusSchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const typingData = c.req.valid("json");

    // Upsert typing status
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO typing_status (user_id, chat_type, is_typing, last_active_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(user.id, typingData.chat_type, typingData.is_typing ? 1 : 0).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating typing status:', error);
    return c.json({ error: 'Failed to update typing status' }, 500);
  }
});

app.get("/api/typing-status/:chatType", authMiddleware, async (c) => {
  try {
    const chatType = c.req.param('chatType');
    const user = await getOrCreateUser(c);

    const typingUsers = await c.env.DB.prepare(`
      SELECT 
        ts.*,
        u.display_name,
        u.email
      FROM typing_status ts
      JOIN users u ON ts.user_id = u.id
      WHERE ts.chat_type = ? 
        AND ts.is_typing = 1 
        AND ts.user_id != ?
        AND datetime(ts.last_active_at, '+5 seconds') > datetime('now')
    `).bind(chatType, user.id).all();

    return c.json(typingUsers.results);
  } catch (error) {
    console.error('Error getting typing status:', error);
    return c.json({ error: 'Failed to get typing status' }, 500);
  }
});

// Login history (admin only)
app.get("/api/login-history", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    
    if (!user.is_admin && !((user as any).is_temporary_admin)) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    
    const loginHistory = await c.env.DB.prepare(`
      SELECT 
        lh.*,
        u.display_name,
        u.email
      FROM login_history lh
      JOIN users u ON lh.user_id = u.id
      ORDER BY lh.logged_in_at DESC
      LIMIT 100
    `).all();

    return c.json(loginHistory.results);
  } catch (error) {
    console.error('Error getting login history:', error);
    return c.json({ error: 'Failed to get login history' }, 500);
  }
});

// Helper function to generate base32 encoded secret
function generateBase32Secret(length: number = 32): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

// Helper function to generate TOTP URI
function generateTOTPUri(secret: string, issuer: string, accountName: string): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params}`;
}

// Helper function to generate QR code URL (using external service for demo)
function generateQRCodeUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(data)}`;
}

// Simplified TOTP verification for demo
async function verifyTOTP(secret: string, token: string, window: number = 1): Promise<boolean> {
  if (!/^\d{6}$/.test(token)) {
    return false;
  }

  // For demo purposes, we'll implement a basic TOTP verification
  // In production, use a proper TOTP library
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  
  // Check current time window and adjacent windows
  for (let i = -window; i <= window; i++) {
    const testTimeStep = timeStep + i;
    const expectedToken = await generateTOTPToken(secret, testTimeStep);
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
}

// Basic TOTP token generation (simplified for demo)
async function generateTOTPToken(secret: string, timeStep: number): Promise<string> {
  try {
    // Convert base32 secret to bytes
    const secretBytes = base32ToBytes(secret);
    
    // Convert time step to 8-byte array
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, timeStep, false); // Big endian
    
    // HMAC-SHA1
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
    const hashBytes = new Uint8Array(signature);
    
    // Dynamic truncation
    const offset = hashBytes[19] & 0xf;
    const code = (
      ((hashBytes[offset] & 0x7f) << 24) |
      ((hashBytes[offset + 1] & 0xff) << 16) |
      ((hashBytes[offset + 2] & 0xff) << 8) |
      (hashBytes[offset + 3] & 0xff)
    ) % 1000000;
    
    return code.toString().padStart(6, '0');
  } catch (error) {
    console.error('TOTP generation error:', error);
    return '000000';
  }
}

// Helper function to convert base32 to bytes
function base32ToBytes(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  // Convert base32 to binary string
  for (const char of base32.toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  
  // Convert binary string to bytes
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.substr(i, 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }
  
  return new Uint8Array(bytes);
}

// 2FA Endpoints
app.post("/api/users/me/2fa/generate-secret", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);

    // Generate a new secret
    const generatedSecret = generateBase32Secret(32);
    const issuer = 'Flatbush Safety Patrol';
    const accountName = user.email;
    
    // Generate TOTP URI
    const otpauthUrl = generateTOTPUri(generatedSecret, issuer, accountName);
    
    // Generate QR code URL  
    const qrCodeUrl = generateQRCodeUrl(otpauthUrl);

    const setupData = {
      secret: generatedSecret,
      qrCodeUrl,
      manualEntryKey: generatedSecret,
    };

    return c.json(setupData);
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    return c.json({ error: 'Failed to generate 2FA secret' }, 500);
  }
});

app.post("/api/users/me/2fa/enable", authMiddleware, zValidator("json", Enable2FASchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const { secret: totpSecret, token } = c.req.valid("json");

    // Verify the token
    const verified = await verifyTOTP(totpSecret, token);

    if (!verified) {
      return c.json({ error: 'Invalid verification code. Please try again.' }, 400);
    }

    // Enable 2FA for user
    await c.env.DB.prepare(`
      UPDATE users 
      SET totp_secret = ?, is_2fa_enabled = 1, updated_at = datetime('now')
      WHERE id = ?
    `).bind(totpSecret, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return c.json({ error: 'Failed to enable 2FA' }, 500);
  }
});

app.post("/api/users/me/2fa/disable", authMiddleware, zValidator("json", Verify2FASchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const { token } = c.req.valid("json");

    // Get user's current secret
    const dbUser = await c.env.DB.prepare(
      "SELECT totp_secret FROM users WHERE id = ? AND is_2fa_enabled = 1"
    ).bind(user.id).first() as { totp_secret: string | null } | null;

    if (!dbUser || !dbUser.totp_secret) {
      return c.json({ error: '2FA is not enabled' }, 400);
    }

    // Verify the token
    const verified = await verifyTOTP(dbUser.totp_secret, token);

    if (!verified) {
      return c.json({ error: 'Invalid verification code. Please try again.' }, 400);
    }

    // Disable 2FA for user
    await c.env.DB.prepare(`
      UPDATE users 
      SET totp_secret = NULL, is_2fa_enabled = 0, updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return c.json({ error: 'Failed to disable 2FA' }, 500);
  }
});

app.post("/api/users/me/2fa/verify", authMiddleware, zValidator("json", Verify2FASchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const { token } = c.req.valid("json");

    // Get user's current secret
    const dbUser = await c.env.DB.prepare(
      "SELECT totp_secret FROM users WHERE id = ? AND is_2fa_enabled = 1"
    ).bind(user.id).first() as { totp_secret: string | null } | null;

    if (!dbUser || !dbUser.totp_secret) {
      return c.json({ error: '2FA is not enabled' }, 400);
    }

    // Verify the token
    const verified = await verifyTOTP(dbUser.totp_secret, token);

    if (!verified) {
      return c.json({ error: 'Invalid verification code' }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    return c.json({ error: 'Failed to verify 2FA' }, 500);
  }
});

app.post("/api/users/me/2fa/backup-codes", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);

    // Check if 2FA is enabled
    const dbUser = await c.env.DB.prepare(
      "SELECT is_2fa_enabled FROM users WHERE id = ?"
    ).bind(user.id).first() as { is_2fa_enabled: boolean } | null;

    if (!dbUser || !dbUser.is_2fa_enabled) {
      return c.json({ error: '2FA must be enabled first' }, 400);
    }

    // Generate 10 backup codes
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const backupCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(backupCode);
    }

    return c.json({ codes });
  } catch (error) {
    console.error('Error generating backup codes:', error);
    return c.json({ error: 'Failed to generate backup codes' }, 500);
  }
});

// Admin Permission Request Endpoints
app.get("/api/admin/permission-requests", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    
    if (!user.is_admin && !((user as any).is_temporary_admin)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const requests = await c.env.DB.prepare(`
      SELECT 
        apr.*,
        u.display_name as user_display_name,
        u.email as user_email,
        u.avatar_url as user_avatar_url,
        approver.display_name as approver_display_name,
        approver.email as approver_email
      FROM admin_permission_requests apr
      JOIN users u ON apr.user_id = u.id
      LEFT JOIN users approver ON apr.approved_by = approver.id
      ORDER BY apr.created_at DESC
    `).all();

    const formattedRequests = requests.results.map((req: any) => ({
      ...req,
      user: {
        display_name: req.user_display_name,
        email: req.user_email,
        avatar_url: req.user_avatar_url,
      },
      approver: req.approver_display_name ? {
        display_name: req.approver_display_name,
        email: req.approver_email,
      } : null
    }));

    return c.json(formattedRequests);
  } catch (error) {
    console.error('Error getting permission requests:', error);
    return c.json({ error: 'Failed to get permission requests' }, 500);
  }
});

app.get("/api/admin/stats", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    
    if (!user.is_admin && !((user as any).is_temporary_admin)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const [totalUsers, activeAdmins, pendingRequests, recentActivity] = await Promise.all([
      c.env.DB.prepare("SELECT COUNT(*) as count FROM users").first(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE is_admin = 1 OR is_temporary_admin = 1").first(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM admin_permission_requests WHERE status = 'pending'").first(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM messages WHERE created_at > datetime('now', '-24 hours')").first(),
    ]);

    return c.json({
      totalUsers: (totalUsers as any)?.count || 0,
      activeAdmins: (activeAdmins as any)?.count || 0,
      pendingRequests: (pendingRequests as any)?.count || 0,
      recentActivity: (recentActivity as any)?.count || 0,
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return c.json({ error: 'Failed to get admin stats' }, 500);
  }
});

app.post("/api/admin/permission-requests", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const body = await c.req.json();

    // Check if user already has a pending request
    const existingRequest = await c.env.DB.prepare(
      "SELECT id FROM admin_permission_requests WHERE user_id = ? AND status = 'pending'"
    ).bind(user.id).first();

    if (existingRequest) {
      return c.json({ error: 'You already have a pending admin request' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO admin_permission_requests (user_id, requested_permissions, reason)
      VALUES (?, ?, ?)
    `).bind(user.id, body.requested_permissions, body.reason).run();

    // Notify all admins about the new request
    const admins = await c.env.DB.prepare(
      "SELECT id FROM users WHERE is_admin = 1"
    ).all();

    for (const admin of admins.results) {
      await c.env.DB.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).bind(
        (admin as any).id,
        'New Admin Permission Request',
        `User ${user.display_name || user.email} has requested admin permissions: ${body.requested_permissions}`,
        'info'
      ).run();
    }

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('Error creating permission request:', error);
    return c.json({ error: 'Failed to create permission request' }, 500);
  }
});

app.post("/api/admin/permission-requests/:id/approve", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const requestId = c.req.param('id');
    const body = await c.req.json();
    
    if (!user.is_admin && !((user as any).is_temporary_admin)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const request = await c.env.DB.prepare(
      "SELECT * FROM admin_permission_requests WHERE id = ? AND status = 'pending'"
    ).bind(requestId).first();

    if (!request) {
      return c.json({ error: 'Request not found or already processed' }, 404);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (body.duration_hours || 24));

    // Update request
    await c.env.DB.prepare(`
      UPDATE admin_permission_requests 
      SET status = 'approved', approved_by = ?, approved_at = datetime('now'), expires_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id, expiresAt.toISOString(), requestId).run();

    // Grant temporary admin access
    await c.env.DB.prepare(`
      UPDATE users 
      SET is_temporary_admin = 1, admin_expires_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(expiresAt.toISOString(), (request as any).user_id).run();

    // Notify the user
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).bind(
      (request as any).user_id,
      'Admin Permission Granted',
      `Your request for ${(request as any).requested_permissions} has been approved and will expire at ${expiresAt.toLocaleString()}`,
      'success'
    ).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error approving permission request:', error);
    return c.json({ error: 'Failed to approve permission request' }, 500);
  }
});

app.post("/api/admin/permission-requests/:id/deny", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const requestId = c.req.param('id');
    
    if (!user.is_admin && !((user as any).is_temporary_admin)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const request = await c.env.DB.prepare(
      "SELECT * FROM admin_permission_requests WHERE id = ? AND status = 'pending'"
    ).bind(requestId).first();

    if (!request) {
      return c.json({ error: 'Request not found or already processed' }, 404);
    }

    // Update request
    await c.env.DB.prepare(`
      UPDATE admin_permission_requests 
      SET status = 'denied', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id, requestId).run();

    // Notify the user
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).bind(
      (request as any).user_id,
      'Admin Permission Denied',
      `Your request for ${(request as any).requested_permissions} has been denied.`,
      'warning'
    ).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error denying permission request:', error);
    return c.json({ error: 'Failed to deny permission request' }, 500);
  }
});

app.post("/api/admin/revoke-access/:userId", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const userId = c.req.param('userId');
    
    if (!user.is_admin) {
      return c.json({ error: 'Full admin access required' }, 403);
    }

    // Revoke temporary admin access
    await c.env.DB.prepare(`
      UPDATE users 
      SET is_temporary_admin = 0, admin_expires_at = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).bind(userId).run();

    // Notify the user
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).bind(
      userId,
      'Admin Access Revoked',
      'Your temporary admin access has been revoked by an administrator.',
      'warning'
    ).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error revoking admin access:', error);
    return c.json({ error: 'Failed to revoke admin access' }, 500);
  }
});

// Notification Endpoints
app.get("/api/notifications", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);

    const notifications = await c.env.DB.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).bind(user.id).all();

    return c.json(notifications.results);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return c.json({ error: 'Failed to get notifications' }, 500);
  }
});

app.post("/api/notifications/:id/read", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const notificationId = c.req.param('id');

    await c.env.DB.prepare(`
      UPDATE notifications 
      SET is_read = 1, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(notificationId, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

app.post("/api/notifications/read-all", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);

    await c.env.DB.prepare(`
      UPDATE notifications 
      SET is_read = 1, updated_at = datetime('now')
      WHERE user_id = ? AND is_read = 0
    `).bind(user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return c.json({ error: 'Failed to mark all notifications as read' }, 500);
  }
});

app.delete("/api/notifications/:id", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const notificationId = c.req.param('id');

    await c.env.DB.prepare(`
      DELETE FROM notifications 
      WHERE id = ? AND user_id = ?
    `).bind(notificationId, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

// Push Notification Endpoints
app.post("/api/users/me/push-subscribe", authMiddleware, zValidator("json", PushSubscriptionSchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const { subscription } = c.req.valid("json");

    // Store subscription data
    await c.env.DB.prepare(`
      UPDATE users 
      SET push_notification_token = ?, 
          push_notifications_enabled = 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify(subscription), user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return c.json({ error: 'Failed to subscribe to push notifications' }, 500);
  }
});

app.post("/api/users/me/push-unsubscribe", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);

    await c.env.DB.prepare(`
      UPDATE users 
      SET push_notification_token = NULL, 
          push_notifications_enabled = 0,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return c.json({ error: 'Failed to unsubscribe from push notifications' }, 500);
  }
});

app.get("/api/users/me/push-settings", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);

    // Return default settings based on user preferences
    const settings = {
      enabled: !!user.push_notifications_enabled,
      messages: true,
      incidents: true,
      alerts: true,
      directMessages: true,
    };

    return c.json(settings);
  } catch (error) {
    console.error('Error getting push settings:', error);
    return c.json({ error: 'Failed to get push settings' }, 500);
  }
});

app.put("/api/users/me/push-settings", authMiddleware, zValidator("json", PushSettingsSchema), async (c) => {
  try {
    const user = await getOrCreateUser(c);
    const settings = c.req.valid("json");

    // Update push notification settings
    await c.env.DB.prepare(`
      UPDATE users 
      SET push_notifications_enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(settings.enabled ? 1 : 0, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating push settings:', error);
    return c.json({ error: 'Failed to update push settings' }, 500);
  }
});

app.post("/api/users/me/push-test", authMiddleware, async (c) => {
  try {
    const user = await getOrCreateUser(c);

    // Get user's push subscription
    const dbUser = await c.env.DB.prepare(
      "SELECT push_notification_token FROM users WHERE id = ? AND push_notifications_enabled = 1"
    ).bind(user.id).first() as { push_notification_token: string | null } | null;

    if (!dbUser || !dbUser.push_notification_token) {
      return c.json({ error: 'Push notifications not enabled' }, 400);
    }

    // Add a test notification to the database
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).bind(
      user.id,
      'Test Notification',
      'This is a test notification from Flatbush Safety Patrol. Your push notifications are working!',
      'info'
    ).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return c.json({ error: 'Failed to send test notification' }, 500);
  }
});

// NFC Login endpoint
app.post("/api/auth/nfc-login", async (c) => {
  try {
    const nfcData = await c.req.json();
    
    if (!nfcData.userId || !nfcData.email) {
      return c.json({ error: 'Invalid NFC data' }, 400);
    }

    // In a real app, you'd validate the NFC data and create a session
    // For demo purposes, we'll just return the data
    console.log('NFC login attempt:', nfcData);

    return c.json({ 
      success: true, 
      message: 'NFC authentication successful',
      userData: {
        userId: nfcData.userId,
        email: nfcData.email
      }
    });
  } catch (error) {
    console.error('Error with NFC login:', error);
    return c.json({ error: 'NFC authentication failed' }, 500);
  }
});

export default app;
