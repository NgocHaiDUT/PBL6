-- AlterTable message_reactions: Change unique constraint
-- From: [message_id, user_id, emoji] (allows multiple emojis per user per message)
-- To: [message_id, user_id] (only ONE emoji per user per message)

-- Step 1: Clean up duplicate reactions (keep most recent one per user per message)
DELETE FROM message_reactions
WHERE id NOT IN (
  SELECT MAX(id)
  FROM message_reactions
  GROUP BY message_id, user_id
);

-- Step 2: Drop old unique constraint
ALTER TABLE message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_user_id_emoji_key;

-- Step 3: Add new unique constraint
ALTER TABLE message_reactions ADD CONSTRAINT message_reactions_message_id_user_id_key UNIQUE (message_id, user_id);
