-- Espaços profissionais: fundação, turmas e convites (lotes A e B, docs/10-espacos-profissionais.md).
-- Só acrescenta tabelas e índices; não altera nem apaga dados existentes.

-- Perfil profissional (um por conta, ativado pelo admin). O papel da conta continua o mesmo.
CREATE TABLE IF NOT EXISTS pro_profiles (
  user_id TEXT PRIMARY KEY,
  model TEXT NOT NULL CHECK (model IN ('personal', 'nutri', 'clinica')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso')),
  space_id TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Um espaço por profissional.
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  name TEXT NOT NULL,
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS space_groups (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('rascunho', 'ativa', 'arquivada')),
  max_members INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_space_groups_space ON space_groups (space_id);

-- Convites: o banco guarda só o hash do código. Turma: vários usos em 24 h. Individual: 1 uso.
CREATE TABLE IF NOT EXISTS space_invites (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  group_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('turma', 'individual')),
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_space_invites_space ON space_invites (space_id);

-- Vínculo profissional-pessoa: no máximo um ativo por espaço e pessoa.
CREATE TABLE IF NOT EXISTS space_links (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  ended_by TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_space_links_active ON space_links (space_id, client_id) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_space_links_client ON space_links (client_id, status);

-- Participação em turma (separada do vínculo).
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'saiu', 'removida')),
  joined_at TEXT NOT NULL,
  left_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_group_members_active ON group_members (group_id, client_id) WHERE status = 'ativa';
CREATE INDEX IF NOT EXISTS idx_group_members_client ON group_members (client_id, status);
