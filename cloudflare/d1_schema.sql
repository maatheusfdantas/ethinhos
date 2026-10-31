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
  icon TEXT NOT NULL DEFAULT 'Bookmark'
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
