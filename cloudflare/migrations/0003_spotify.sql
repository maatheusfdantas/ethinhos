-- 0003: conexão opcional com o Spotify (aditiva). Tokens guardados cifrados (AES-GCM).
CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id TEXT PRIMARY KEY,
  spotify_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  scope TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
