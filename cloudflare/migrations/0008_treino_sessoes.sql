-- Treino ativo (lote D1, plano docs/10-espacos-profissionais.md).
-- Sessões e séries ficam no servidor: trocar de aba ou recarregar não perde nada, e o histórico é real.
-- Só acrescenta tabelas e índices; não altera nem apaga dados existentes.

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,                 -- gerado no navegador (clique duplo/reenvio não cria duas)
  user_id TEXT NOT NULL,
  workout_ref TEXT,                    -- id da ficha própria (users.workouts_json) usada
  assignment_id TEXT,                  -- atribuição de um profissional (lotes seguintes)
  name TEXT NOT NULL,
  content_json TEXT NOT NULL DEFAULT '{}',  -- cópia da ficha no início: a sessão não muda se a ficha mudar
  planned_sets INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida', 'incompleta')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  paused_ms INTEGER NOT NULL DEFAULT 0,
  paused_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions (user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_open ON workout_sessions (user_id, status);

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  exercise_key TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_no INTEGER NOT NULL,
  metric TEXT NOT NULL DEFAULT 'kg' CHECK (metric IN ('kg', 'lado', 'corpo', 'reps', 'tempo')),
  weight_kg REAL,
  reps INTEGER,
  seconds INTEGER,
  done_at TEXT NOT NULL,
  UNIQUE (session_id, exercise_key, set_no)
);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_ex ON workout_sets (user_id, exercise_key, done_at);
