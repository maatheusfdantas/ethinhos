-- Lote F (Organização Clínica): pendências administrativas internas do espaço.
-- Só organização: sem dado clínico, sem prontuário e sem ligação com o conteúdo das pessoas.
-- Só acrescenta (CREATE ... IF NOT EXISTS). Reversão: rollback do deploy; a tabela fica sem uso.
CREATE TABLE IF NOT EXISTS space_tasks (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  due_on TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'concluida', 'arquivada')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  done_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_space_tasks_space ON space_tasks (space_id, status, due_on);
