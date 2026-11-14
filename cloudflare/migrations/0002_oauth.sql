-- 0002: login com Google e Microsoft (aditiva; nada é removido ou alterado).
-- Também é criado em tempo de execução por functions/api/_lib/db.js (CREATE IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS oauth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  UNIQUE(provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS idx_oauth_identities_user ON oauth_identities (user_id);

CREATE TABLE IF NOT EXISTS oauth_login_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
