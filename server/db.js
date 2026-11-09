import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, initSecurityTables, encryptAES256GCM } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'ethos.db');

export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  // 1. Tabela de Usuários (Senhas protegidas com scrypt + salt individual)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      subscription_tier TEXT NOT NULL DEFAULT 'Gratuito',
      is_public INTEGER NOT NULL DEFAULT 1,
      permissions TEXT NOT NULL,
      streak_days INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      reset_token TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Tabela de Hábitos
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      target INTEGER NOT NULL DEFAULT 1,
      current INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'vezes',
      effort TEXT NOT NULL DEFAULT 'Médio',
      priority TEXT NOT NULL DEFAULT 'Média',
      tag_id TEXT,
      repeat_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
      completed INTEGER NOT NULL DEFAULT 0,
      completion_style TEXT NOT NULL DEFAULT 'quick',
      created_at TEXT NOT NULL
    );
  `);

  // 3. Tabela de Eventos e Compromissos
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      start_time TEXT,
      end_time TEXT,
      category TEXT DEFAULT 'Geral',
      repeat_rule TEXT DEFAULT 'Nunca',
      location TEXT,
      notes TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // 4. Tabela de Saúde e Hidratação
  db.exec(`
    CREATE TABLE IF NOT EXISTS health (
      user_id TEXT PRIMARY KEY,
      water_glasses INTEGER NOT NULL DEFAULT 0,
      water_target INTEGER NOT NULL DEFAULT 10,
      glass_ml INTEGER NOT NULL DEFAULT 250,
      water_history TEXT NOT NULL DEFAULT '[]',
      sleep_bed_time TEXT NOT NULL DEFAULT '23:30',
      sleep_wake_time TEXT NOT NULL DEFAULT '07:00',
      sleep_logged INTEGER NOT NULL DEFAULT 0
    );
  `);

  try {
    db.exec(`ALTER TABLE health ADD COLUMN glass_ml INTEGER NOT NULL DEFAULT 250;`);
  } catch (e) {}

  // 5. Tabela de Treinos e Musculação
  db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      exercises TEXT NOT NULL DEFAULT '[]'
    );
  `);

  // 6. Tabela de Amizades N:N
  db.exec(`
    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      friend_name TEXT NOT NULL,
      friend_avatar TEXT NOT NULL,
      friend_bio TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'none'
    );
  `);

  // 7. Tabela de Feed Social
  db.exec(`
    CREATE TABLE IF NOT EXISTS feed (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      reactions TEXT NOT NULL DEFAULT '{"like":0,"fire":0,"trophy":0}',
      user_reacted TEXT
    );
  `);

  // 8. Tabela de Tags / Categorias Customizadas + Modelo Modular (Categories, Subclasses, Category_Members)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      bg TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Bookmark',
      is_shared INTEGER NOT NULL DEFAULT 0,
      has_subclasses INTEGER NOT NULL DEFAULT 0
    );
  `);

  try {
    db.exec(`ALTER TABLE tags ADD COLUMN icon TEXT NOT NULL DEFAULT 'Bookmark';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE tags ADD COLUMN is_shared INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE tags ADD COLUMN has_subclasses INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}

  // Tabela Categories (O Núcleo — separa o Rótulo das Capacidades)
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      bg TEXT NOT NULL DEFAULT 'rgba(129, 140, 248, 0.15)',
      icon TEXT NOT NULL DEFAULT 'Bookmark',
      is_shared INTEGER NOT NULL DEFAULT 0,
      has_subclasses INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Tabela Subclasses (Contextos Detalhados / Matérias)
  db.exec(`
    CREATE TABLE IF NOT EXISTS subclasses (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Média',
      metadata TEXT NOT NULL DEFAULT '{"hours":0}',
      created_at TEXT NOT NULL
    );
  `);

  // Tabela Category_Members (Para Categorias Compartilhadas / Modo Colaborativo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_members (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      member_email TEXT,
      member_name TEXT,
      role TEXT NOT NULL DEFAULT 'collaborator',
      created_at TEXT NOT NULL
    );
  `);

  try {
    db.exec(`ALTER TABLE habits ADD COLUMN subclass_id TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE habits ADD COLUMN subclass_name TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE habits ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'done';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE habits ADD COLUMN period_type TEXT NOT NULL DEFAULT 'day';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE habits ADD COLUMN period_config TEXT NOT NULL DEFAULT '{}';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN subclass_id TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN subclass_name TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN author_name TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE checkins ADD COLUMN subclass_id TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE checkins ADD COLUMN subclass_name TEXT;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE users ADD COLUMN weight REAL DEFAULT 70.0;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN height REAL DEFAULT 1.75;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN priority TEXT NOT NULL DEFAULT 'Média';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN end_date TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN repeat_config TEXT DEFAULT '{}';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN reminders TEXT DEFAULT '[]';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN buffer_before INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN buffer_after INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN is_floating INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN energy_level TEXT DEFAULT 'deep_focus';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN meeting_url TEXT DEFAULT '';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN visibility TEXT DEFAULT 'private';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE events ADD COLUMN conflict_policy TEXT DEFAULT 'allow';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE friends ADD COLUMN friend_username TEXT;`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN playlists TEXT DEFAULT '[]';`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN shared_metrics TEXT DEFAULT '{}';`);
  } catch (e) {}

  // 9. Tabela de Checkins de Hábitos (Engine Analítica)
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      habit_id TEXT NOT NULL,
      event_date TEXT NOT NULL,
      logged_at TEXT,
      value REAL NOT NULL DEFAULT 1.0,
      status_override TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 10. Tabelas de Segurança (Sessões Rotativas, Logs de Auditoria, Tokens de Recuperação)
  initSecurityTables(db);

  // 11. Tabela de Maus Hábitos & Vícios (Superação e Sobriedade)
  db.exec(`
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
  `);

  // Sincronizar os Usuários Obrigatórios com senhas hasheadas via scrypt
  seedFiveUsers();
}

export function seedFiveUsers() {
  const allPerms = JSON.stringify({ focus: true, workouts: true, telemetry: true, social: true, habits: true });

  try {
    db.exec(`DELETE FROM users WHERE id != 'usr_admin';`);
  } catch (e) {}

  const allSeedUsers = [
    {
      id: 'usr_admin',
      username: 'admin',
      email: 'admin@ethos.local',
      password: hashPassword('Admin@2026!Ethos'),
      name: 'Administrador Ethos',
      avatar: 'AD',
      role: 'admin',
      is_active: 1,
      subscription_tier: 'Enterprise / Fundador',
      is_public: 1,
      permissions: allPerms,
      streak_days: 0,
      points: 0
    }
  ];

  for (const u of allSeedUsers) {
    const existing = db.prepare(`SELECT id FROM users WHERE id = ? OR username = ? OR email = ?`).get(u.id, u.username, u.email);
    if (!existing) {
      db.prepare(`
        INSERT INTO users (
          id, username, email, password, name, avatar, role,
          is_active, subscription_tier, is_public, permissions,
          streak_days, points, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        u.id, u.username, u.email, u.password, u.name, u.avatar, u.role,
        u.is_active, u.subscription_tier, u.is_public, u.permissions,
        u.streak_days, u.points, new Date().toISOString()
      );
    } else {
      db.prepare(`
        UPDATE users SET 
          username = ?,
          email = ?,
          password = ?, 
          role = ?, 
          name = ?,
          subscription_tier = ?, 
          permissions = ?,
          points = 0,
          streak_days = 0
        WHERE id = ? OR username = ? OR email = ?
      `).run(u.username, u.email, u.password, u.role, u.name, u.subscription_tier, u.permissions, u.id, u.username, u.email);
    }
  }
}

export function seedDefaultCategories() {
  // Inicializa sem categorias pré-preenchidas para garantir que nenhum dado antigo ou não criado pelo usuário exista
}
