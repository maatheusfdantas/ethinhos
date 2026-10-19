import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'ethos.db');

export const db = new DatabaseSync(dbPath);

export function initDatabase(zeroOut = false) {
  // 1. Create Users Table
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

  // 2. Create Habits Table
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

  // 3. Create Health Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS health (
      user_id TEXT PRIMARY KEY,
      water_glasses INTEGER NOT NULL DEFAULT 0,
      water_target INTEGER NOT NULL DEFAULT 10,
      water_history TEXT NOT NULL DEFAULT '[]',
      sleep_bed_time TEXT NOT NULL DEFAULT '23:30',
      sleep_wake_time TEXT NOT NULL DEFAULT '07:00',
      sleep_logged INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 4. Create Workouts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      exercises TEXT NOT NULL DEFAULT '[]'
    );
  `);

  // 5. Create Friends Table (Relacionamento N:N)
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

  // 6. Create Social Feed Table
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

  // 7. Create Tags Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      bg TEXT NOT NULL
    );
  `);

  // Se o usuário solicitou zerar o sistema
  if (zeroOut) {
    db.exec(`DELETE FROM habits;`);
    db.exec(`DELETE FROM health;`);
    db.exec(`DELETE FROM feed;`);
    db.exec(`DELETE FROM friends;`);
    db.exec(`DELETE FROM workouts;`);
    db.exec(`DELETE FROM tags;`);
    // Delete non-admin users if zeroing
    db.exec(`DELETE FROM users WHERE role != 'admin';`);
  }

  // Seed Admin User (Requisito 2: login: admin, senha: Foguete não tem ré)
  const findAdmin = db.prepare(`SELECT * FROM users WHERE username = ? OR email = ?`);
  const adminRow = findAdmin.get('admin', 'admin@ethos.dev');

  const defaultAdminPermissions = JSON.stringify({
    focus: true,
    workouts: true,
    telemetry: true,
    social: true,
    habits: true
  });

  if (!adminRow) {
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, username, email, password, name, avatar, role,
        is_active, subscription_tier, is_public, permissions,
        streak_days, points, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'usr_admin',
      'admin',
      'admin@ethos.dev',
      'Foguete não tem ré',
      'Administrador Ethos',
      'AD',
      'admin',
      1,
      'Enterprise / Fundador',
      1,
      defaultAdminPermissions,
      0,
      500,
      new Date().toISOString()
    );
    console.log('[SQLite DB] Conta Admin criada: login "admin", senha "Foguete não tem ré"');
  } else {
    // Garantir que a senha e permissões do admin estejam corretas
    const updateAdmin = db.prepare(`
      UPDATE users SET 
        password = ?,
        role = 'admin',
        is_active = 1,
        permissions = ?
      WHERE username = 'admin' OR email = 'admin@ethos.dev'
    `);
    updateAdmin.run('Foguete não tem ré', defaultAdminPermissions);
  }
}

// Reset/Zerar sistema completamente
export function resetSystemData() {
  db.exec(`DELETE FROM habits;`);
  db.exec(`DELETE FROM health;`);
  db.exec(`DELETE FROM feed;`);
  db.exec(`DELETE FROM friends;`);
  db.exec(`DELETE FROM workouts;`);
  db.exec(`DELETE FROM tags;`);
  db.exec(`DELETE FROM users WHERE role != 'admin';`);

  // Reset admin streak/points to zero
  db.exec(`UPDATE users SET streak_days = 0, points = 0 WHERE username = 'admin';`);
  console.log('[SQLite DB] Sistema zerado com sucesso! Pronto para testes limpos.');
}
