/**
 * Inicialização do D1 legado (tabelas em tempo de execução) e fallback em memória.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

import { hashPasswordEdge } from './auth.js';
import { ALL_PERMS } from './constants.js';

// ============================================================================
// 5. INICIALIZAÇÃO AUTOMÁTICA DO BANCO RELACIONAL CLOUDFLARE D1 (`env.DB`)
// ============================================================================
export let d1Initialized = false;

export const edgeFallbackMemory = {
  initialized: false,
  users: new Map(),
  habits: new Map(),
  events: new Map(),
  health: new Map(),
  tags: new Map(),
  waitlist: [],
  supportTickets: [],
  googleTokens: new Map(),
  googleCreds: { clientId: '', clientSecret: '' }
};

export async function ensureDatabaseReady(env) {
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];

  // Admin inicial: só é criado se ADMIN_INITIAL_PASSWORD estiver definido no ambiente.
  // Não existe senha padrão no código. O hash (PBKDF2, caro) só é calculado ao semear.
  const buildDefaultUsers = async () => {
    const initialPassword = env?.ADMIN_INITIAL_PASSWORD;
    if (!initialPassword) return [];
    return [
      {
        id: 'usr_admin',
        username: 'admin',
        email: 'admin@ethos.local',
        password: await hashPasswordEdge(initialPassword),
        name: 'Administrador Ethos',
        avatar: 'AD',
        role: 'admin',
        is_active: 1,
        subscription_tier: 'Enterprise / Fundador',
        is_public: 1,
        permissions: ALL_PERMS,
        streak_days: 0,
        points: 0,
        weight: 75.0,
        height: 1.78
      }
    ];
  };

  if (env && env.DB) {
    if (d1Initialized) return { mode: 'd1', db: env.DB };

    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, email TEXT UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL, avatar TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', is_active INTEGER NOT NULL DEFAULT 1, subscription_tier TEXT NOT NULL DEFAULT 'Gratuito', is_public INTEGER NOT NULL DEFAULT 1, permissions TEXT NOT NULL, streak_days INTEGER NOT NULL DEFAULT 0, points INTEGER NOT NULL DEFAULT 0, weight REAL DEFAULT 70.0, height REAL DEFAULT 1.75, reset_token TEXT, created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS habits (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, icon_name TEXT NOT NULL, target INTEGER NOT NULL DEFAULT 1, current INTEGER NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'vezes', effort TEXT NOT NULL DEFAULT 'Médio', priority TEXT NOT NULL DEFAULT 'Média', tag_id TEXT, subclass_id TEXT, subclass_name TEXT, tracking_type TEXT NOT NULL DEFAULT 'done', period_type TEXT NOT NULL DEFAULT 'day', period_config TEXT NOT NULL DEFAULT '{}', repeat_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]', completed INTEGER NOT NULL DEFAULT 0, completion_style TEXT NOT NULL DEFAULT 'quick', created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, end_date TEXT, all_day INTEGER NOT NULL DEFAULT 0, start_time TEXT, end_time TEXT, category TEXT DEFAULT 'Geral', subclass_id TEXT, subclass_name TEXT, author_name TEXT, repeat_rule TEXT DEFAULT 'Nunca', repeat_config TEXT DEFAULT '{}', reminders TEXT DEFAULT '[]', buffer_before INTEGER DEFAULT 0, buffer_after INTEGER DEFAULT 0, is_floating INTEGER DEFAULT 0, energy_level TEXT DEFAULT 'deep_focus', meeting_url TEXT DEFAULT '', visibility TEXT DEFAULT 'private', conflict_policy TEXT DEFAULT 'allow', location TEXT, notes TEXT, priority TEXT NOT NULL DEFAULT 'Média', completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS health (user_id TEXT PRIMARY KEY, water_glasses INTEGER NOT NULL DEFAULT 0, water_target INTEGER NOT NULL DEFAULT 10, glass_ml INTEGER NOT NULL DEFAULT 250, water_history TEXT NOT NULL DEFAULT '[]', sleep_bed_time TEXT NOT NULL DEFAULT '23:30', sleep_wake_time TEXT NOT NULL DEFAULT '07:00', sleep_logged INTEGER NOT NULL DEFAULT 0)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, bg TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'Bookmark', is_shared INTEGER NOT NULL DEFAULT 0, has_subclasses INTEGER NOT NULL DEFAULT 0)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, bg TEXT NOT NULL DEFAULT 'rgba(129, 140, 248, 0.15)', icon TEXT NOT NULL DEFAULT 'Bookmark', is_shared INTEGER NOT NULL DEFAULT 0, has_subclasses INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS subclasses (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, name TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'Média', metadata TEXT NOT NULL DEFAULT '{"hours":0}', created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS category_members (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, user_id TEXT NOT NULL, member_email TEXT, member_name TEXT, role TEXT NOT NULL DEFAULT 'collaborator', created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS bad_habits (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, icon_name TEXT NOT NULL, started_at TEXT NOT NULL, cost_per_day REAL DEFAULT 0, motivational_reason TEXT, impact_description TEXT, best_streak_days INTEGER DEFAULT 0, relapse_count INTEGER DEFAULT 0, created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS bad_habit_relapses (id TEXT PRIMARY KEY, bad_habit_id TEXT NOT NULL, user_id TEXT NOT NULL, relapsed_at TEXT NOT NULL, days_achieved INTEGER DEFAULT 0, trigger TEXT, lesson TEXT, created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_audit_logs (id TEXT PRIMARY KEY, user_id TEXT, event_type TEXT NOT NULL, ip_address TEXT, user_agent TEXT, metadata TEXT, correlation_id TEXT, created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS waitlist (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, interest TEXT DEFAULT 'Acesso Antecipado Ethos', source TEXT DEFAULT 'https://ethos-landing-7j3.pages.dev', status TEXT DEFAULT 'pendente', created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_email TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Dúvida / Uso do Sistema', priority TEXT NOT NULL DEFAULT 'Média', subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'aberto', admin_reply TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS oauth_identities (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, provider_account_id TEXT NOT NULL, provider_email TEXT, created_at TEXT NOT NULL, last_login_at TEXT, UNIQUE(provider, provider_account_id))`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS oauth_login_codes (code_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS spotify_connections (user_id TEXT PRIMARY KEY, spotify_user_id TEXT NOT NULL UNIQUE, display_name TEXT, access_token_enc TEXT NOT NULL, refresh_token_enc TEXT NOT NULL, expires_at TEXT NOT NULL, scope TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL, type TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`)
    ]);

    const migrations = [
      `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN validation_token_preview TEXT`,
      `ALTER TABLE users ADD COLUMN validation_token_expires_at TEXT`,
      `ALTER TABLE users ADD COLUMN weight REAL DEFAULT 70.0`,
      `ALTER TABLE users ADD COLUMN height REAL DEFAULT 1.75`,
      `ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''`,
      `ALTER TABLE users ADD COLUMN playlists TEXT DEFAULT '[]'`,
      `ALTER TABLE users ADD COLUMN shared_metrics TEXT DEFAULT '{}'`,
      `ALTER TABLE users ADD COLUMN post_its TEXT DEFAULT '[]'`,
      `ALTER TABLE users ADD COLUMN active_track TEXT DEFAULT ''`,
      `ALTER TABLE users ADD COLUMN workouts_json TEXT DEFAULT '[]'`,
      `ALTER TABLE users ADD COLUMN bad_habits_json TEXT DEFAULT '[]'`,
      `ALTER TABLE users ADD COLUMN page_preferences TEXT DEFAULT '{}'`,
      `ALTER TABLE habits ADD COLUMN subclass_id TEXT`,
      `ALTER TABLE habits ADD COLUMN subclass_name TEXT`,
      `ALTER TABLE habits ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'done'`,
      `ALTER TABLE habits ADD COLUMN period_type TEXT NOT NULL DEFAULT 'day'`,
      `ALTER TABLE habits ADD COLUMN period_config TEXT NOT NULL DEFAULT '{}'`,
      `ALTER TABLE habits ADD COLUMN completion_style TEXT NOT NULL DEFAULT 'quick'`,
      `ALTER TABLE events ADD COLUMN end_date TEXT`,
      `ALTER TABLE events ADD COLUMN subclass_id TEXT`,
      `ALTER TABLE events ADD COLUMN subclass_name TEXT`,
      `ALTER TABLE events ADD COLUMN author_name TEXT`,
      `ALTER TABLE events ADD COLUMN repeat_config TEXT DEFAULT '{}'`,
      `ALTER TABLE events ADD COLUMN reminders TEXT DEFAULT '[]'`,
      `ALTER TABLE events ADD COLUMN buffer_before INTEGER DEFAULT 0`,
      `ALTER TABLE events ADD COLUMN buffer_after INTEGER DEFAULT 0`,
      `ALTER TABLE events ADD COLUMN is_floating INTEGER DEFAULT 0`,
      `ALTER TABLE events ADD COLUMN energy_level TEXT DEFAULT 'deep_focus'`,
      `ALTER TABLE events ADD COLUMN meeting_url TEXT DEFAULT ''`,
      `ALTER TABLE events ADD COLUMN visibility TEXT DEFAULT 'private'`,
      `ALTER TABLE events ADD COLUMN conflict_policy TEXT DEFAULT 'allow'`,
      `ALTER TABLE events ADD COLUMN priority TEXT NOT NULL DEFAULT 'Média'`,
      `ALTER TABLE tags ADD COLUMN icon TEXT NOT NULL DEFAULT 'Bookmark'`,
      `ALTER TABLE tags ADD COLUMN is_shared INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE tags ADD COLUMN has_subclasses INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE health ADD COLUMN glass_ml INTEGER NOT NULL DEFAULT 250`
    ];
    for (const sql of migrations) {
      try { await env.DB.prepare(sql).run(); } catch (_e) {}
    }

    const countRow = await env.DB.prepare(`SELECT COUNT(*) as c FROM users`).first();
    if (!countRow || countRow.c === 0) {
      for (const u of await buildDefaultUsers()) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO users (id, username, email, password, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, weight, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            u.id,
            u.username,
            u.email,
            u.password,
            u.name,
            u.avatar,
            u.role,
            u.is_active,
            u.subscription_tier,
            u.is_public,
            u.permissions,
            u.streak_days,
            u.points,
            u.weight,
            u.height,
            nowIso
          )
          .run();
      }
    }

    d1Initialized = true;
    return { mode: 'd1', db: env.DB };
  }

  if (!edgeFallbackMemory.initialized) {
    for (const u of await buildDefaultUsers()) {
      edgeFallbackMemory.users.set(u.id, u);
    }
    edgeFallbackMemory.initialized = true;
  }

  return { mode: 'memory', store: edgeFallbackMemory };
}

