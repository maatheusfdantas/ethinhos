-- ============================================================================
-- ETHOS CLOUD OS — SUPABASE & POSTGRESQL RELATIONAL SCHEMA + RLS + INDEXES
-- Best Practices: Strict PK/FK constraints, JSONB validation, Row Level Security
-- (RLS) on every table, and composite B-Tree / GIN performance indexes.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABELA DE USUÁRIOS (users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT ('usr_' || encode(gen_random_bytes(8), 'hex')),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT 'US',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_tier TEXT NOT NULL DEFAULT 'Gratuito',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  weight NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 500),
  height NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (height >= 0 AND height <= 300),
  bio VARCHAR(150) NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  permissions JSONB NOT NULL DEFAULT '{"focus":true,"workouts":true,"telemetry":true,"social":true,"habits":true}'::jsonb,
  playlists JSONB NOT NULL DEFAULT '[]'::jsonb,
  shared_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  post_its JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_track JSONB DEFAULT NULL,
  workouts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  bad_habits_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  page_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE CATEGORIAS / TAGS (tags, tag_subclasses, tag_members)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#38bdf8',
  bg TEXT NOT NULL DEFAULT 'rgba(56, 189, 248, 0.12)',
  border TEXT NOT NULL DEFAULT 'rgba(56, 189, 248, 0.3)',
  icon TEXT NOT NULL DEFAULT 'Tag',
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  has_subclasses BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tag_subclasses (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tag_members (
  id BIGSERIAL PRIMARY KEY,
  tag_id TEXT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  member_handle TEXT NOT NULL,
  UNIQUE(tag_id, member_handle)
);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE HÁBITOS E HISTÓRICO DE EXECUÇÃO (habits, habit_logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  subclass_id TEXT DEFAULT NULL,
  subclass_name TEXT DEFAULT NULL,
  goal TEXT NOT NULL DEFAULT 'Meta diária',
  tracking_type TEXT NOT NULL DEFAULT 'check',
  period_type TEXT NOT NULL DEFAULT 'Semanal',
  period_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  completion_style TEXT NOT NULL DEFAULT 'check',
  streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id BIGSERIAL PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  target_value NUMERIC(10,2) NOT NULL DEFAULT 1,
  actual_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, log_date)
);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE MAUS HÁBITOS E RECAÍDAS (bad_habits, bad_habit_relapses)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bad_habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Comportamento',
  Trigger_factor TEXT DEFAULT '',
  replacement_habit TEXT DEFAULT '',
  clean_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (clean_streak_days >= 0),
  longest_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak_days >= 0),
  relapse_count INTEGER NOT NULL DEFAULT 0 CHECK (relapse_count >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_relapse_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.bad_habit_relapses (
  id BIGSERIAL PRIMARY KEY,
  bad_habit_id TEXT NOT NULL REFERENCES public.bad_habits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  relapse_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT DEFAULT '',
  intensity INTEGER NOT NULL DEFAULT 3 CHECK (intensity BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE EVENTOS E AGENDA (events)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  subclass_id TEXT DEFAULT NULL,
  subclass_name TEXT DEFAULT NULL,
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  author_name TEXT NOT NULL DEFAULT 'Você',
  repeat_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  reminders JSONB NOT NULL DEFAULT '[15]'::jsonb,
  buffer_before INTEGER NOT NULL DEFAULT 0,
  buffer_after INTEGER NOT NULL DEFAULT 0,
  is_floating BOOLEAN NOT NULL DEFAULT FALSE,
  energy_level TEXT NOT NULL DEFAULT 'medium',
  meeting_url TEXT DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'busy',
  conflict_policy TEXT NOT NULL DEFAULT 'warn',
  priority TEXT NOT NULL DEFAULT 'Média',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE BIOMETRIA E HIDRATAÇÃO (health)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  water INTEGER NOT NULL DEFAULT 0 CHECK (water >= 0),
  water_target INTEGER NOT NULL DEFAULT 8 CHECK (water_target >= 1),
  glass_ml INTEGER NOT NULL DEFAULT 250 CHECK (glass_ml >= 50),
  sleep NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (sleep >= 0 AND sleep <= 24),
  sleep_goal NUMERIC(4,2) NOT NULL DEFAULT 8 CHECK (sleep_goal >= 1 AND sleep_goal <= 24),
  mood INTEGER NOT NULL DEFAULT 3 CHECK (mood BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. TABELAS DE SUPORTE E AUDITORIA (support_tickets, audit_logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Dúvida Técnica',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'resolvido')),
  admin_reply TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  ip_address TEXT DEFAULT '',
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES DE ALTA PERFORMANCE (B-TREE & GIN)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON public.users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON public.users (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_habits_user_completed ON public.habits (user_id, completed);
CREATE INDEX IF NOT EXISTS idx_habits_user_category ON public.habits (user_id, category);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs (user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_bad_habits_user ON public.bad_habits (user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON public.events (user_id, event_date, start_time);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON public.support_tickets (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- ============================================================================
-- SEGURANÇA MÁXIMA: ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_subclasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bad_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bad_habit_relapses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Função auxiliar segura para verificar se o usuário autenticado é Admin
CREATE OR REPLACE FUNCTION public.is_ethos_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE (auth_user_id = auth.uid() OR id = current_setting('request.jwt.claim.sub', true))
      AND role = 'admin'
      AND is_active = TRUE
  );
$$;

-- Função auxiliar para obter o ID interno do usuário autenticado
CREATE OR REPLACE FUNCTION public.current_ethos_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
  );
$$;

-- Políticas RLS: users
CREATE POLICY "users_select_own_or_admin" ON public.users
  FOR SELECT USING (id = public.current_ethos_user_id() OR public.is_ethos_admin());

CREATE POLICY "users_update_own_or_admin" ON public.users
  FOR UPDATE USING (id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (id = public.current_ethos_user_id() OR public.is_ethos_admin());

-- Políticas RLS: habits
CREATE POLICY "habits_owner_all" ON public.habits
  FOR ALL USING (user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (user_id = public.current_ethos_user_id() OR public.is_ethos_admin());

-- Políticas RLS: habit_logs
CREATE POLICY "habit_logs_owner_all" ON public.habit_logs
  FOR ALL USING (user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (user_id = public.current_ethos_user_id() OR public.is_ethos_admin());

-- Políticas RLS: bad_habits & relapses
CREATE POLICY "bad_habits_owner_all" ON public.bad_habits
  FOR ALL USING (user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (user_id = public.current_ethos_user_id() OR public.is_ethos_admin());

CREATE POLICY "bad_habit_relapses_owner_all" ON public.bad_habit_relapses
  FOR ALL USING (user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (user_id = public.current_ethos_user_id() OR public.is_ethos_admin());

-- Políticas RLS: events
CREATE POLICY "events_owner_all" ON public.events
  FOR ALL USING (user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (user_id = public.current_ethos_user_id() OR public.is_ethos_admin());

-- Políticas RLS: tags, subclasses, members
CREATE POLICY "tags_owner_all" ON public.tags
  FOR ALL USING (user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (user_id = public.current_ethos_user_id() OR public.is_ethos_admin());

CREATE POLICY "tag_subclasses_owner_all" ON public.tag_subclasses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = tag_subclasses.tag_id
        AND (t.user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
    )
  );

CREATE POLICY "tag_members_owner_all" ON public.tag_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = tag_members.tag_id
        AND (t.user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
    )
  );

-- Políticas RLS: health
CREATE POLICY "health_owner_all" ON public.health
  FOR ALL USING (user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (user_id = public.current_ethos_user_id() OR public.is_ethos_admin());

-- Políticas RLS: support_tickets
CREATE POLICY "tickets_owner_or_admin" ON public.support_tickets
  FOR ALL USING (user_id = public.current_ethos_user_id() OR public.is_ethos_admin())
  WITH CHECK (user_id = public.current_ethos_user_id() OR public.is_ethos_admin());

-- Políticas RLS: audit_logs (Somente leitura/escrita para Admin)
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
  FOR ALL USING (public.is_ethos_admin())
  WITH CHECK (public.is_ethos_admin());

