-- 0004: perfil de saúde privado (aditiva). Só a própria conta lê/escreve via /api/account/health.
CREATE TABLE IF NOT EXISTS user_health_profile (
  user_id TEXT PRIMARY KEY,
  goal TEXT,
  activity_level TEXT,
  birth_date TEXT,
  updated_at TEXT NOT NULL
);
