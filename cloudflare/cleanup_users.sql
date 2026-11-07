-- ============================================================================
-- LIMPEZA GERAL DE USUÁRIOS NO CLOUDFLARE D1
-- Mantém exclusivamente 2 usuários: 'admin' e 'teste'
-- ============================================================================

-- 1. Remove todos os usuários que não sejam usr_admin e usr_teste
DELETE FROM users WHERE id NOT IN ('usr_admin', 'usr_teste');

-- 2. Remove registros vinculados a usuários antigos
DELETE FROM habits WHERE user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM events WHERE user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM health WHERE user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM checkins WHERE user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM user_sessions WHERE user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM audit_logs WHERE actor_user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM auth_tokens WHERE user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM password_reset_tokens WHERE user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM bad_habits WHERE user_id NOT IN ('usr_admin', 'usr_teste');
DELETE FROM bad_habit_relapses WHERE user_id NOT IN ('usr_admin', 'usr_teste');

-- 3. Insere ou atualiza o Administrador
INSERT INTO users (
  id, username, email, password, name, avatar, role,
  is_active, subscription_tier, is_public, permissions,
  streak_days, points, email_verified, created_at
) VALUES (
  'usr_admin',
  'admin',
  'admin@ethos.dev',
  'pbkdf2$796a788aac29452de146496aae8ec3c2$b994609d759224041eb6856971b862897155d4cb30ec1d6cd68a35f634b564a2',
  'Administrador Ethos',
  'AD',
  'admin',
  1,
  'Enterprise / Fundador',
  1,
  '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}',
  0,
  9999,
  1,
  '2026-11-01T00:00:00.000Z'
) ON CONFLICT (id) DO UPDATE SET
  username = 'admin',
  email = 'admin@ethos.dev',
  password = 'pbkdf2$796a788aac29452de146496aae8ec3c2$b994609d759224041eb6856971b862897155d4cb30ec1d6cd68a35f634b564a2',
  name = 'Administrador Ethos',
  role = 'admin',
  is_active = 1,
  email_verified = 1;

-- 4. Insere ou atualiza o Usuário de Teste
INSERT INTO users (
  id, username, email, password, name, avatar, role,
  is_active, subscription_tier, is_public, permissions,
  streak_days, points, email_verified, created_at
) VALUES (
  'usr_teste',
  'teste',
  'teste@ethos.dev',
  'pbkdf2$663dd8840a89df17f69b39d2539eadc5$e5ed0191f53323c19c425ae34740b4829bf26d247f6c612d219807b0c62b4573',
  'Usuário Teste',
  'UT',
  'user',
  1,
  'Pro (Anual)',
  1,
  '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}',
  1,
  500,
  1,
  '2026-11-01T00:00:00.000Z'
) ON CONFLICT (id) DO UPDATE SET
  username = 'teste',
  email = 'teste@ethos.dev',
  password = 'pbkdf2$663dd8840a89df17f69b39d2539eadc5$e5ed0191f53323c19c425ae34740b4829bf26d247f6c612d219807b0c62b4573',
  name = 'Usuário Teste',
  role = 'user',
  is_active = 1,
  email_verified = 1;
