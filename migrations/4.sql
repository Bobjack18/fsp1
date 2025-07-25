
-- Create some test users for direct messaging
INSERT INTO users (mocha_user_id, email, display_name, avatar_url, is_admin, created_at, updated_at)
VALUES 
  ('test_user_2', 'patrol_officer@example.com', 'Patrol Officer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 0, datetime('now'), datetime('now')),
  ('test_user_3', 'dispatcher@example.com', 'Emergency Dispatcher', 'https://images.unsplash.com/photo-1494790108755-2616b612b5e5?w=150&h=150&fit=crop&crop=face', 0, datetime('now'), datetime('now')),
  ('test_user_4', 'supervisor@example.com', 'Field Supervisor', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 0, datetime('now'), datetime('now')),
  ('test_user_5', 'coordinator@example.com', 'Safety Coordinator', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 0, datetime('now'), datetime('now'));

-- Add some sample direct messages for testing
INSERT INTO direct_messages (sender_id, recipient_id, text, created_at)
VALUES 
  (2, 1, 'Hello! Just wanted to check in on the patrol status in sector 3.', datetime('now', '-2 hours')),
  (1, 2, 'All clear in sector 3. Currently monitoring the main street area.', datetime('now', '-1 hour 45 minutes')),
  (3, 1, 'We have a report of suspicious activity on Flatbush Ave. Can you investigate?', datetime('now', '-1 hour')),
  (1, 3, 'On my way to investigate. Will report back in 15 minutes.', datetime('now', '-45 minutes'));

-- Add some sample messages to group chats
INSERT INTO messages (chat_type, text, sender_id, timestamp, created_at)
VALUES
  ('messages', 'Good morning everyone! Starting patrol rounds now.', 2, datetime('now', '-3 hours'), datetime('now', '-3 hours')),
  ('messages', 'Copy that. Weather looks good for today.', 4, datetime('now', '-2 hours 30 minutes'), datetime('now', '-2 hours 30 minutes')),
  ('messages_v2', 'Emergency dispatch - vehicle accident on Ocean Ave and Avenue H', 3, datetime('now', '-1 hour'), datetime('now', '-1 hour')),
  ('messages_v2', 'Responding to Ocean Ave incident. ETA 5 minutes.', 2, datetime('now', '-55 minutes'), datetime('now', '-55 minutes'));
