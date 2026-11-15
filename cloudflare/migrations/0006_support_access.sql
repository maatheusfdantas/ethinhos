-- 0006: acesso de suporte consentido e temporário (aditiva). O cliente libera, o admin só lê enquanto ativo.
CREATE TABLE IF NOT EXISTS support_access_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ticket_id TEXT NOT NULL,
  scopes TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_support_access_user ON support_access_grants (user_id);
