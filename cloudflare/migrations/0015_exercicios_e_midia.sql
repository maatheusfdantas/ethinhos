-- Proposta 07 (aprovada em 20/11/2026): biblioteca de exercícios própria, exercícios personalizados,
-- correção de nomes pelo Personal, capa e foto dos espaços/turmas e denúncia de imagem.
-- Só acrescenta (CREATE ... IF NOT EXISTS). Reversão: rollback do deploy; as tabelas ficam sem uso.
-- A base de exercícios (250) entra pelo seed cloudflare/seeds/exercicios-v1.sql, aplicado depois desta migração.

CREATE TABLE IF NOT EXISTS exercise_library (
  id TEXT PRIMARY KEY,
  name_pt TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  muscle_group TEXT NOT NULL,
  primary_json TEXT NOT NULL DEFAULT '[]',
  secondary_json TEXT NOT NULL DEFAULT '[]',
  equipment TEXT,
  level TEXT,
  type TEXT,
  metric TEXT NOT NULL DEFAULT 'reps' CHECK (metric IN ('reps', 'tempo')),
  instructions_json TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL,
  source_id TEXT,
  source_version TEXT,
  license TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pendente' CHECK (review_status IN ('pendente', 'revisado')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exercise_library_group ON exercise_library (muscle_group);

-- Personalizados: do espaço (Personal) ou da própria pessoa. Nunca apagados nem sobrescritos por reimportação da base.
CREATE TABLE IF NOT EXISTS exercise_custom (
  id TEXT PRIMARY KEY,
  owner_kind TEXT NOT NULL CHECK (owner_kind IN ('espaco', 'pessoa')),
  owner_id TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  muscle_group TEXT NOT NULL DEFAULT 'Personalizados',
  primary_json TEXT NOT NULL DEFAULT '[]',
  secondary_json TEXT NOT NULL DEFAULT '[]',
  equipment TEXT,
  metric TEXT NOT NULL DEFAULT 'reps' CHECK (metric IN ('reps', 'tempo')),
  instructions_json TEXT NOT NULL DEFAULT '[]',
  based_on TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exercise_custom_owner ON exercise_custom (owner_kind, owner_id, status);

-- Correção do nome de um exercício da base, válida só no espaço de quem corrigiu.
CREATE TABLE IF NOT EXISTS exercise_name_fix (
  space_id TEXT NOT NULL,
  library_id TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (space_id, library_id)
);

-- Imagens do espaço: foto redonda do profissional (group_id = '') e capa retangular de cada turma.
CREATE TABLE IF NOT EXISTS space_media (
  space_id TEXT NOT NULL,
  group_id TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('foto', 'capa')),
  media_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (space_id, group_id, kind)
);

-- Denúncias de imagem feitas por participantes; o admin vê e pode remover.
CREATE TABLE IF NOT EXISTS space_media_reports (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  media_key TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'resolvida')),
  created_at TEXT NOT NULL,
  UNIQUE (media_key, reporter_id)
);
CREATE INDEX IF NOT EXISTS idx_space_media_reports_status ON space_media_reports (status, created_at);
