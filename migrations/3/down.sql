
DROP TABLE admin_permission_requests;
DROP TABLE user_sessions;
DROP TABLE notifications;
ALTER TABLE users DROP COLUMN is_temporary_admin;
ALTER TABLE users DROP COLUMN admin_expires_at;
ALTER TABLE users DROP COLUMN last_activity_at;
