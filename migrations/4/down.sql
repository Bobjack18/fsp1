
-- Remove test data
DELETE FROM direct_messages WHERE sender_id IN (2, 3, 4, 5) OR recipient_id IN (2, 3, 4, 5);
DELETE FROM messages WHERE sender_id IN (2, 3, 4, 5);
DELETE FROM users WHERE mocha_user_id IN ('test_user_2', 'test_user_3', 'test_user_4', 'test_user_5');
