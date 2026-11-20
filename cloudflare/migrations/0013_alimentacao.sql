-- Lote E (Nutricionista): planos alimentares por paciente, versões imutáveis, registros de refeição e modelos.
-- Só acrescenta tabelas e índices (CREATE ... IF NOT EXISTS). O código anterior ignora estas tabelas.
-- Reversão: rollback do deploy; as tabelas ficam sem uso (ou restauração do D1 pelo bookmark registrado antes).

-- Plano de um paciente (um vínculo). Rascunho → publicado (versões) → encerrado.
-- A pessoa vê só planos com pelo menos uma versão publicada; o rascunho é só da nutricionista.
CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'encerrado')),
  draft_json TEXT NOT NULL DEFAULT '{}',
  draft_updated_at TEXT,
  current_version INTEGER NOT NULL DEFAULT 0,
  source_template_id TEXT,
  ends_on TEXT,
  ended_at TEXT,
  end_reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- Um plano em andamento por vínculo (rascunho ou publicado); encerrados ficam no histórico.
CREATE UNIQUE INDEX IF NOT EXISTS uq_meal_plans_open ON meal_plans (link_id) WHERE status IN ('rascunho', 'publicado');
CREATE INDEX IF NOT EXISTS idx_meal_plans_client ON meal_plans (client_id, status);
CREATE INDEX IF NOT EXISTS idx_meal_plans_space ON meal_plans (space_id, status);

-- Versões publicadas: imutáveis. Cada uma vale a partir de starts_on até a próxima começar.
CREATE TABLE IF NOT EXISTS meal_plan_versions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  content_json TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  published_by TEXT NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE (plan_id, version)
);

-- Registros da pessoa: um por refeição e dia. Extras têm meal_key "extra:<id>" e não entram no denominador.
CREATE TABLE IF NOT EXISTS meal_logs (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  date TEXT NOT NULL,
  meal_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('conforme', 'alternativa', 'parcial', 'diferente', 'nao_realizada', 'extra')),
  option_key TEXT,
  substitution TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (plan_id, date, meal_key)
);
CREATE INDEX IF NOT EXISTS idx_meal_logs_client ON meal_logs (client_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_logs_plan ON meal_logs (plan_id, updated_at);

-- Modelos de plano da nutricionista: reaproveitáveis; cada paciente recebe uma cópia própria.
CREATE TABLE IF NOT EXISTS meal_templates (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meal_templates_space ON meal_templates (space_id, status);
