-- 0001_core.sql
-- Núcleo do Ethos: rotina, compromissos (hábitos e tarefas), registros e categorias.
--
-- Regras:
-- - Compromisso é só definição. Progresso vive APENAS em `entries`.
-- - `entries` é append-only: cada toque gera uma linha; progresso do dia = SUM(value)
--   das linhas com deleted_at IS NULL. Desfazer = preencher deleted_at.
-- - Ids são gerados no cliente (UUID): reenviar o mesmo id é idempotente.
-- - `date` é a data LOCAL do usuário (YYYY-MM-DD), calculada com users.timezone.
--   Instantes (*_at) são ISO 8601 UTC.
-- - `core_categories` unificará tags/categories/subclasses legados na Fase 5;
--   até lá o nome evita conflito com a tabela legada `categories`, que a
--   sincronização antiga apaga e regrava a cada sync.

-- Fuso do usuário (IANA). Padrão: Brasil.
ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

CREATE TABLE IF NOT EXISTS routines (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Minha rotina' CHECK (length(name) BETWEEN 1 AND 80),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id);

CREATE TABLE IF NOT EXISTS core_categories (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  color        TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT 'Bookmark',
  position     INTEGER NOT NULL DEFAULT 0,
  archived_at  TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_core_categories_user ON core_categories(user_id);

CREATE TABLE IF NOT EXISTS commitments (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id      TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('habit', 'task')),
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  category_id     TEXT REFERENCES core_categories(id) ON DELETE SET NULL,
  measure_type    TEXT NOT NULL CHECK (measure_type IN ('check', 'count', 'duration', 'quantity')),
  measure_target  REAL NOT NULL CHECK (measure_target > 0),
  measure_unit    TEXT,
  -- JSON: {"freq":"daily"} | {"freq":"weekdays","days":[1,3,5]} | {"freq":"weekly_count","count":3} | {"freq":"once","date":"YYYY-MM-DD"}
  recurrence      TEXT NOT NULL CHECK (json_valid(recurrence)),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  start_date      TEXT NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commitments_user_status ON commitments(user_id, status);

CREATE TABLE IF NOT EXISTS entries (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commitment_id  TEXT NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  date           TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  value          REAL NOT NULL,
  note           TEXT CHECK (note IS NULL OR length(note) <= 500),
  source         TEXT NOT NULL DEFAULT 'tap' CHECK (source IN ('tap', 'manual', 'timer', 'import')),
  recorded_at    TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  deleted_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_entries_commitment_date ON entries(commitment_id, date);
