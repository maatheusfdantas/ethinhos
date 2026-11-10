-- ============================================================================
-- ETHOS — ESQUEMA DO BANCO DE DADOS RELACIONAL CLOUDFLARE D1 (SQLite Edge)
-- ============================================================================
-- Execute com:
--   npx wrangler d1 create ethos-db
--   npx wrangler d1 execute ethos-db --remote --file=./cloudflare/d1_schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  subscription_tier TEXT NOT NULL DEFAULT 'Gratuito',
  is_public INTEGER NOT NULL DEFAULT 1,
  permissions TEXT NOT NULL,
  streak_days INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  weight REAL DEFAULT 70.0,
  height REAL DEFAULT 1.75,
  email_verified INTEGER NOT NULL DEFAULT 0,
  reset_token TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  mfa_secret_enc TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,
  current INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'vezes',
  effort TEXT NOT NULL DEFAULT 'Médio',
  priority TEXT NOT NULL DEFAULT 'Média',
  tag_id TEXT,
  subclass_id TEXT,
  subclass_name TEXT,
  tracking_type TEXT NOT NULL DEFAULT 'done',
  period_type TEXT NOT NULL DEFAULT 'day',
  period_config TEXT NOT NULL DEFAULT '{}',
  repeat_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  completed INTEGER NOT NULL DEFAULT 0,
  completion_style TEXT NOT NULL DEFAULT 'quick',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  category TEXT DEFAULT 'Geral',
  repeat_rule TEXT DEFAULT 'Nunca',
  location TEXT,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'Média',
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health (
  user_id TEXT PRIMARY KEY,
  water_glasses INTEGER NOT NULL DEFAULT 0,
  water_target INTEGER NOT NULL DEFAULT 10,
  glass_ml INTEGER NOT NULL DEFAULT 250,
  water_history TEXT NOT NULL DEFAULT '[]',
  sleep_bed_time TEXT NOT NULL DEFAULT '23:30',
  sleep_wake_time TEXT NOT NULL DEFAULT '07:00',
  sleep_logged INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  bg TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Bookmark',
  is_shared INTEGER NOT NULL DEFAULT 0,
  has_subclasses INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- ARQUITETURA DE CATEGORIAS DINÂMICAS E MODULARES (NÚCLEO + CAPACIDADES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  bg TEXT NOT NULL DEFAULT 'rgba(129, 140, 248, 0.15)',
  icon TEXT NOT NULL DEFAULT 'Bookmark',
  is_shared INTEGER NOT NULL DEFAULT 0,
  has_subclasses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subclasses (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Média',
  metadata TEXT NOT NULL DEFAULT '{"hours":0}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS category_members (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  member_email TEXT,
  member_name TEXT,
  role TEXT NOT NULL DEFAULT 'collaborator',
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  habit_id TEXT NOT NULL,
  event_date TEXT NOT NULL,
  logged_at TEXT,
  value REAL NOT NULL DEFAULT 1.0,
  status_override TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  device_info TEXT,
  ip_address TEXT,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  replaced_by_hash TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  ip_address TEXT,
  metadata_json TEXT NOT NULL,
  prev_hash TEXT,
  integrity_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_lookup ON auth_tokens (user_id, type, used);

-- Tabela de Maus Hábitos & Vícios (Superação de Vícios e Monitoramento de Sobriedade)
CREATE TABLE IF NOT EXISTS bad_habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  cost_per_day REAL DEFAULT 0,
  motivational_reason TEXT,
  impact_description TEXT,
  best_streak_days INTEGER DEFAULT 0,
  relapse_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bad_habit_relapses (
  id TEXT PRIMARY KEY,
  bad_habit_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  relapsed_at TEXT NOT NULL,
  days_achieved INTEGER DEFAULT 0,
  trigger TEXT,
  lesson TEXT,
  created_at TEXT NOT NULL
);

-- Tabela de Contas e Credenciais OAuth (Google Calendar & Microsoft Graph)
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TEXT NOT NULL,
  scope TEXT NOT NULL,
  last_sync_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts (provider, provider_account_id);




