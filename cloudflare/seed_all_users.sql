-- Sincronização de todos os usuários solicitados no Cloudflare D1
-- Senhas:
-- Admin: Admin@2026!Ethos (ou admin123)
-- Usuários: Ethos@User123! (ou 123)

INSERT OR IGNORE INTO users (
  id, username, email, password, name, avatar, role,
  is_active, subscription_tier, is_public, permissions,
  streak_days, points, weight, height, created_at
) VALUES (
  'usr_admin_local',
  'admin.local',
  'admin@ethos.local',
  'pbkdf2$babef177ccef39013568642d44be82bd$97554bb72236fe958a624336af3bfb928448ea701f8622c83645da94b37d2f69',
  'Administrador Ethos (Local)',
  'AL',
  'admin',
  1,
  'Enterprise / Fundador',
  1,
  '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}',
  0,
  9999,
  75.0,
  1.78,
  datetime('now')
);

INSERT OR IGNORE INTO users (
  id, username, email, password, name, avatar, role,
  is_active, subscription_tier, is_public, permissions,
  streak_days, points, weight, height, created_at
) VALUES (
  'usr_matheus_ethos',
  'matheus',
  'matheus@ethos.dev',
  'pbkdf2$5f3b690ec6b277279350272f6a341bf5$a22cd1d30e777b9cffbe3a12de4218271190d255cbe69e42ddce282478ce7f52',
  'Matheus Ethos',
  'ME',
  'user',
  1,
  'Pro (Anual)',
  1,
  '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}',
  14,
  3450,
  74.0,
  1.78,
  datetime('now')
);

INSERT OR IGNORE INTO users (
  id, username, email, password, name, avatar, role,
  is_active, subscription_tier, is_public, permissions,
  streak_days, points, weight, height, created_at
) VALUES (
  'usr_lucas_ethos',
  'lucas',
  'lucas@ethos.dev',
  'pbkdf2$5f3b690ec6b277279350272f6a341bf5$a22cd1d30e777b9cffbe3a12de4218271190d255cbe69e42ddce282478ce7f52',
  'Lucas Ethos',
  'LE',
  'user',
  1,
  'Pro (Mensal)',
  1,
  '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}',
  4,
  1250,
  70.0,
  1.75,
  datetime('now')
);

INSERT OR IGNORE INTO users (
  id, username, email, password, name, avatar, role,
  is_active, subscription_tier, is_public, permissions,
  streak_days, points, weight, height, created_at
) VALUES (
  'usr_ana_paula',
  'ana.paula',
  'ana@ethos.dev',
  'pbkdf2$5f3b690ec6b277279350272f6a341bf5$a22cd1d30e777b9cffbe3a12de4218271190d255cbe69e42ddce282478ce7f52',
  'Ana Paula Mendes',
  'AP',
  'user',
  1,
  'Pro (Mensal)',
  1,
  '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}',
  7,
  1820,
  58.0,
  1.65,
  datetime('now')
);

INSERT OR IGNORE INTO users (
  id, username, email, password, name, avatar, role,
  is_active, subscription_tier, is_public, permissions,
  streak_days, points, weight, height, created_at
) VALUES (
  'usr_beatriz_costa',
  'beatriz.costa',
  'beatriz@ethos.dev',
  'pbkdf2$5f3b690ec6b277279350272f6a341bf5$a22cd1d30e777b9cffbe3a12de4218271190d255cbe69e42ddce282478ce7f52',
  'Beatriz Costa',
  'BC',
  'user',
  1,
  'Pro (Anual)',
  1,
  '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}',
  12,
  2940,
  62.0,
  1.68,
  datetime('now')
);

INSERT OR IGNORE INTO users (
  id, username, email, password, name, avatar, role,
  is_active, subscription_tier, is_public, permissions,
  streak_days, points, weight, height, created_at
) VALUES (
  'usr_carlos_eduardo',
  'carlos.eduardo',
  'carlos@ethos.dev',
  'pbkdf2$5f3b690ec6b277279350272f6a341bf5$a22cd1d30e777b9cffbe3a12de4218271190d255cbe69e42ddce282478ce7f52',
  'Carlos Eduardo',
  'CE',
  'user',
  1,
  'Gratuito',
  1,
  '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}',
  3,
  620,
  76.0,
  1.80,
  datetime('now')
);

