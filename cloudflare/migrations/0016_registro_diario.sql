-- Proposta 15 (aprovada em 22/11/2026): registro de cada dia para a Análise de progresso.
-- Só acrescenta (CREATE ... IF NOT EXISTS). Nada existente é alterado ou apagado.
-- Reversão: rollback do deploy; a tabela e a coluna ficam sem uso.

-- Um resumo por pessoa e por dia (data local da pessoa): hábitos feitos, água, sono e minutos de foco.
-- O app regrava o dia de hoje sempre que algo muda; dias passados não são reescritos pelo app.
CREATE TABLE IF NOT EXISTS daily_log (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  habits_json TEXT NOT NULL DEFAULT '[]',
  habits_total INTEGER NOT NULL DEFAULT 0,
  habits_done INTEGER NOT NULL DEFAULT 0,
  water_glasses INTEGER NOT NULL DEFAULT 0,
  water_target INTEGER NOT NULL DEFAULT 0,
  glass_ml INTEGER NOT NULL DEFAULT 250,
  sleep_logged INTEGER NOT NULL DEFAULT 0,
  sleep_bed TEXT,
  sleep_wake TEXT,
  focus_min INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, date)
);

-- A coluna habits.done_date (dia a que o progresso do hábito pertence) entra pelo ALTER tolerante de
-- functions/api/_lib/db.js, como as outras colunas da tabela habits.
