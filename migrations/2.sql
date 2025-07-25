
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN is_2fa_enabled BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN push_notification_token TEXT;
ALTER TABLE users ADD COLUMN push_notifications_enabled BOOLEAN DEFAULT 0;
