-- 0000_baseline.sql
-- Schema LEGADO exatamente como o backend o cria hoje em tempo de execução
-- (ensureDatabaseReady em functions/api/_lib/db.js, incluindo os ALTER TABLE).
-- Gerado executando ensureDatabaseReady contra SQLite e extraindo sqlite_master.
-- Idempotente (IF NOT EXISTS): em um banco existente não altera nada.
-- Serve de base para as migrations seguintes; o legado sai na Fase 5.

CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, email TEXT UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL, avatar TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', is_active INTEGER NOT NULL DEFAULT 1, subscription_tier TEXT NOT NULL DEFAULT 'Gratuito', is_public INTEGER NOT NULL DEFAULT 1, permissions TEXT NOT NULL, streak_days INTEGER NOT NULL DEFAULT 0, points INTEGER NOT NULL DEFAULT 0, weight REAL DEFAULT 70.0, height REAL DEFAULT 1.75, reset_token TEXT, created_at TEXT NOT NULL, email_verified INTEGER NOT NULL DEFAULT 0, validation_token_preview TEXT, validation_token_expires_at TEXT, bio TEXT DEFAULT '', playlists TEXT DEFAULT '[]', shared_metrics TEXT DEFAULT '{}', post_its TEXT DEFAULT '[]', active_track TEXT DEFAULT '', workouts_json TEXT DEFAULT '[]', bad_habits_json TEXT DEFAULT '[]', page_preferences TEXT DEFAULT '{}');

CREATE TABLE IF NOT EXISTS habits (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, icon_name TEXT NOT NULL, target INTEGER NOT NULL DEFAULT 1, current INTEGER NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'vezes', effort TEXT NOT NULL DEFAULT 'Médio', priority TEXT NOT NULL DEFAULT 'Média', tag_id TEXT, subclass_id TEXT, subclass_name TEXT, tracking_type TEXT NOT NULL DEFAULT 'done', period_type TEXT NOT NULL DEFAULT 'day', period_config TEXT NOT NULL DEFAULT '{}', repeat_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]', completed INTEGER NOT NULL DEFAULT 0, completion_style TEXT NOT NULL DEFAULT 'quick', created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, end_date TEXT, all_day INTEGER NOT NULL DEFAULT 0, start_time TEXT, end_time TEXT, category TEXT DEFAULT 'Geral', subclass_id TEXT, subclass_name TEXT, author_name TEXT, repeat_rule TEXT DEFAULT 'Nunca', repeat_config TEXT DEFAULT '{}', reminders TEXT DEFAULT '[]', buffer_before INTEGER DEFAULT 0, buffer_after INTEGER DEFAULT 0, is_floating INTEGER DEFAULT 0, energy_level TEXT DEFAULT 'deep_focus', meeting_url TEXT DEFAULT '', visibility TEXT DEFAULT 'private', conflict_policy TEXT DEFAULT 'allow', location TEXT, notes TEXT, priority TEXT NOT NULL DEFAULT 'Média', completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS health (user_id TEXT PRIMARY KEY, water_glasses INTEGER NOT NULL DEFAULT 0, water_target INTEGER NOT NULL DEFAULT 10, glass_ml INTEGER NOT NULL DEFAULT 250, water_history TEXT NOT NULL DEFAULT '[]', sleep_bed_time TEXT NOT NULL DEFAULT '23:30', sleep_wake_time TEXT NOT NULL DEFAULT '07:00', sleep_logged INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, bg TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'Bookmark', is_shared INTEGER NOT NULL DEFAULT 0, has_subclasses INTEGER NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, bg TEXT NOT NULL DEFAULT 'rgba(129, 140, 248, 0.15)', icon TEXT NOT NULL DEFAULT 'Bookmark', is_shared INTEGER NOT NULL DEFAULT 0, has_subclasses INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS subclasses (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, name TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'Média', metadata TEXT NOT NULL DEFAULT '{"hours":0}', created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS category_members (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, user_id TEXT NOT NULL, member_email TEXT, member_name TEXT, role TEXT NOT NULL DEFAULT 'collaborator', created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS bad_habits (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, icon_name TEXT NOT NULL, started_at TEXT NOT NULL, cost_per_day REAL DEFAULT 0, motivational_reason TEXT, impact_description TEXT, best_streak_days INTEGER DEFAULT 0, relapse_count INTEGER DEFAULT 0, created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS bad_habit_relapses (id TEXT PRIMARY KEY, bad_habit_id TEXT NOT NULL, user_id TEXT NOT NULL, relapsed_at TEXT NOT NULL, days_achieved INTEGER DEFAULT 0, trigger TEXT, lesson TEXT, created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS auth_audit_logs (id TEXT PRIMARY KEY, user_id TEXT, event_type TEXT NOT NULL, ip_address TEXT, user_agent TEXT, metadata TEXT, correlation_id TEXT, created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS waitlist (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, interest TEXT DEFAULT 'Acesso Antecipado Ethos', source TEXT DEFAULT 'https://ethos-landing-7j3.pages.dev', status TEXT DEFAULT 'pendente', created_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_email TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Dúvida / Uso do Sistema', priority TEXT NOT NULL DEFAULT 'Média', subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'aberto', admin_reply TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS auth_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL, type TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);

