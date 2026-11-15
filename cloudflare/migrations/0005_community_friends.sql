-- 0005_community_friends.sql
-- Conexões de comunidade e amizades na rede Ethos (aditiva).
CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  friend_name TEXT NOT NULL,
  friend_avatar TEXT NOT NULL DEFAULT '',
  friend_bio TEXT DEFAULT '',
  friend_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_sent',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
