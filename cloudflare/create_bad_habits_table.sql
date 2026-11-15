-- Tabela de Maus Hábitos & Vícios (Superação de Vícios e Monitoramento de Sobriedade)
CREATE TABLE IF NOT EXISTS bad_habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  cost_per_day REAL DEFAULT 0,
  motivational_reason TEXT,
  impact_description TEXT,
  best_streak_days INTEGER DEFAULT 0,
  relapse_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bad_habit_relapses (
  id TEXT PRIMARY KEY,
  bad_habit_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  relapsed_at TEXT NOT NULL,
  days_achieved INTEGER DEFAULT 0,
  trigger TEXT,
  lesson TEXT,
  created_at TEXT NOT NULL
);

