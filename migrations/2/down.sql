
ALTER TABLE users DROP COLUMN totp_secret;
ALTER TABLE users DROP COLUMN is_2fa_enabled;
ALTER TABLE users DROP COLUMN push_notification_token;
ALTER TABLE users DROP COLUMN push_notifications_enabled;
