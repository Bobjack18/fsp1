import z from "zod";

/**
 * Types shared between the client and server go here.
 */

export const UserSchema = z.object({
  id: z.number(),
  mocha_user_id: z.string(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  is_admin: z.boolean(),
  nfc_tag_uid: z.string().nullable(),
  totp_secret: z.string().nullable(),
  is_2fa_enabled: z.boolean(),
  push_notification_token: z.string().nullable(),
  push_notifications_enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MessageSchema = z.object({
  id: z.number(),
  chat_type: z.enum(['messages', 'messages_v2']),
  text: z.string(),
  sender_id: z.number(),
  location_lat: z.number().nullable(),
  location_lng: z.number().nullable(),
  address: z.string().nullable(),
  timestamp: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const DirectMessageSchema = z.object({
  id: z.number(),
  sender_id: z.number(),
  recipient_id: z.number(),
  text: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateMessageSchema = z.object({
  chat_type: z.enum(['messages', 'messages_v2']),
  text: z.string().min(1),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  address: z.string().optional(),
});

export const CreateDirectMessageSchema = z.object({
  recipient_id: z.number(),
  text: z.string().min(1),
});

export const UpdateUserSchema = z.object({
  display_name: z.string().optional(),
  avatar_url: z.string().optional(),
  nfc_tag_uid: z.string().optional(),
  totp_secret: z.string().optional(),
  is_2fa_enabled: z.boolean().optional(),
  push_notification_token: z.string().optional(),
  push_notifications_enabled: z.boolean().optional(),
});

export const Enable2FASchema = z.object({
  secret: z.string(),
  token: z.string(),
});

export const Verify2FASchema = z.object({
  token: z.string(),
});

export const PushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  settings: z.object({
    enabled: z.boolean(),
    messages: z.boolean(),
    incidents: z.boolean(),
    alerts: z.boolean(),
    directMessages: z.boolean(),
  }),
});

export const PushSettingsSchema = z.object({
  enabled: z.boolean(),
  messages: z.boolean(),
  incidents: z.boolean(),
  alerts: z.boolean(),
  directMessages: z.boolean(),
});

export const TypingStatusSchema = z.object({
  chat_type: z.enum(['messages', 'messages_v2']),
  is_typing: z.boolean(),
});

export type User = z.infer<typeof UserSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type DirectMessage = z.infer<typeof DirectMessageSchema>;
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
export type CreateDirectMessage = z.infer<typeof CreateDirectMessageSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type TypingStatus = z.infer<typeof TypingStatusSchema>;
export type Enable2FA = z.infer<typeof Enable2FASchema>;
export type Verify2FA = z.infer<typeof Verify2FASchema>;
export type PushSubscription = z.infer<typeof PushSubscriptionSchema>;
export type PushSettings = z.infer<typeof PushSettingsSchema>;

// Extended types with joined data
export interface MessageWithUser extends Message {
  sender: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface DirectMessageWithUsers extends DirectMessage {
  sender: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  recipient: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}
