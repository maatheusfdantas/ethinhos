-- Espaços, lote D2 (docs/11-espacos-ciclo-completo.md): fichas do profissional com versões, atribuições e acompanhamento.
-- Só acrescenta tabelas e índices; não altera nem apaga dados existentes.

-- Fichas e programas do profissional (do espaço). O conteúdo fica nas versões, que são imutáveis.
CREATE TABLE IF NOT EXISTS pro_templates (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'ficha' CHECK (kind IN ('ficha', 'programa')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'arquivada')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pro_templates_space ON pro_templates (space_id, status);

CREATE TABLE IF NOT EXISTS pro_template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (template_id, version)
);

-- Atribuição: cópia da ficha para UMA pessoa (atribuir à turma cria uma por pessoa).
-- group_key = id da turma de origem ('' quando individual): atribuir de novo não duplica.
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'treino' CHECK (kind IN ('treino')),
  template_id TEXT NOT NULL,
  template_version INTEGER NOT NULL,
  group_key TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  content_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  adapted INTEGER NOT NULL DEFAULT 0,
  allow_client_edit INTEGER,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada')),
  end_reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  ended_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_assignments_active ON assignments (space_id, client_id, template_id, group_key) WHERE status = 'ativa';
CREATE INDEX IF NOT EXISTS idx_assignments_client ON assignments (client_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_space ON assignments (space_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_link ON assignments (link_id, status);

-- Histórico de cada cópia (adaptações do profissional, ajustes da pessoa quando permitido, versões novas).
CREATE TABLE IF NOT EXISTS assignment_versions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  author_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (assignment_id, version)
);

-- "Registros novos desde a sua última visita" na visão geral do profissional.
CREATE TABLE IF NOT EXISTS space_seen (
  user_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  seen_at TEXT NOT NULL,
  PRIMARY KEY (user_id, space_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_assignment ON workout_sessions (assignment_id);
