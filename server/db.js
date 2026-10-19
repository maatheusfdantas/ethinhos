import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'ethos.db');

export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  // 1. Users Table
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

  // 2. Habits Table
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

  // 3. Events Table (com Data, Horário de Início e Término - Requisito 2 e 3)
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

  // 4. Health Table
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

  // 5. Workouts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      exercises TEXT NOT NULL DEFAULT '[]'
    );
  `);

  // 6. Friends Table
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

  // 7. Feed Table
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

  // 8. Tags / Categorias Customizadas Table (Requisito 4)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      bg TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Bookmark'
    );
  `);

  // 9. Checkins Table (Motor Analítico)
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

  // Sincronizar os 5 Usuários Obrigatórios (Requisito 6)
  seedFiveUsers();
}

// 5 Usuários Solicitados (Requisito 6)
export function seedFiveUsers() {
  const allPerms = JSON.stringify({ focus: true, workouts: true, telemetry: true, social: true, habits: true });

  const fiveUsers = [
    // 1. Admin
    {
      id: 'usr_admin',
      username: 'admin',
      email: 'admin@ethos.dev',
      password: 'Foguete não tem ré',
      name: 'Administrador Ethos',
      avatar: 'AD',
      role: 'admin',
      is_active: 1,
      subscription_tier: 'Enterprise / Fundador',
      is_public: 1,
      permissions: allPerms,
      streak_days: 0,
      points: 9999
    },
    // 2. Usuário com desempenho e uso muito bom
    {
      id: 'usr_matheus_pro',
      username: 'matheus.pro',
      email: 'matheus@pro.dev',
      password: '123',
      name: 'Matheus Alta Performance',
      avatar: 'MP',
      role: 'user',
      is_active: 1,
      subscription_tier: 'Pro (Anual)',
      is_public: 1,
      permissions: allPerms,
      streak_days: 14,
      points: 3450
    },
    // 3. Usuário intermediário
    {
      id: 'usr_lucas_dev',
      username: 'lucas.dev',
      email: 'lucas@dev.com',
      password: '123',
      name: 'Lucas Intermediário',
      avatar: 'LD',
      role: 'user',
      is_active: 1,
      subscription_tier: 'Pro (Mensal)',
      is_public: 1,
      permissions: allPerms,
      streak_days: 4,
      points: 1250
    },
    // 4. Usuário não empenhado
    {
      id: 'usr_bruno_preguica',
      username: 'bruno.preguica',
      email: 'bruno@gmail.com',
      password: '123',
      name: 'Bruno Não Empenhado',
      avatar: 'BP',
      role: 'user',
      is_active: 1,
      subscription_tier: 'Gratuito',
      is_public: 1,
      permissions: allPerms,
      streak_days: 0,
      points: 180
    },
    // 5. Usuário clean (totalmente zerado)
    {
      id: 'usr_clean',
      username: 'usuario.clean',
      email: 'clean@ethos.dev',
      password: '123',
      name: 'Novo Usuário Clean',
      avatar: 'UC',
      role: 'user',
      is_active: 1,
      subscription_tier: 'Gratuito',
      is_public: 1,
      permissions: allPerms,
      streak_days: 0,
      points: 0
    }
  ];

  for (const u of fiveUsers) {
    const existing = db.prepare(`SELECT id FROM users WHERE username = ? OR email = ?`).get(u.username, u.email);
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
      // Garantir senhas corretas e roles
      db.prepare(`
        UPDATE users SET 
          password = ?, 
          role = ?, 
          name = ?,
          subscription_tier = ?, 
          permissions = ?
        WHERE username = ?
      `).run(u.password, u.role, u.name, u.subscription_tier, u.permissions, u.username);
    }
  }

  // Seed específico para Matheus Alta Performance (hábitos quase todos concluídos, água cheia, eventos)
  seedUserData('usr_matheus_pro', 'pro');

  // Seed intermediário para Lucas
  seedUserData('usr_lucas_dev', 'mid');

  // Seed baixo para Bruno
  seedUserData('usr_bruno_preguica', 'low');

  // Usuário clean fica 100% zerado
  seedUserData('usr_clean', 'clean');
}

function seedUserData(userId, profileType) {
  // Limpar dados anteriores deste usuário para garantir estado consistente
  db.prepare(`DELETE FROM habits WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM events WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM health WHERE user_id = ?`).run(userId);

  if (profileType === 'clean') {
    db.prepare(`
      INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
      VALUES (?, 0, 10, '[]', '23:30', '07:00', 0)
    `).run(userId);
    return;
  }

  if (profileType === 'pro') {
    // 1. Hábitos Pro
    const insertHabit = db.prepare(`
      INSERT INTO habits (id, user_id, title, category, icon_name, target, current, unit, effort, priority, tag_id, repeat_days, completed, completion_style, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertHabit.run(`hab_p1_${userId}`, userId, 'Estudar Sistemas Operacionais', 'Faculdade', 'BookOpen', 1, 1, 'sessão', 'Alto', 'Alta', 'tag_facul', '[1,2,3,4,5]', 1, 'quick', new Date().toISOString());
    insertHabit.run(`hab_p2_${userId}`, userId, 'Treino Hipertrofia A (Superiores)', 'Saúde', 'Dumbbell', 1, 1, 'treino', 'Alto', 'Alta', 'tag_saude', '[1,3,5]', 1, 'quick', new Date().toISOString());
    insertHabit.run(`hab_p3_${userId}`, userId, 'Leitura de Arquitetura Limpa (30 págs)', 'Trabalho', 'Bookmark', 30, 30, 'páginas', 'Médio', 'Média', 'tag_trab', '[0,1,2,3,4,5,6]', 1, 'numeric', new Date().toISOString());
    insertHabit.run(`hab_p4_${userId}`, userId, 'Meditação Mindfulness & Respiração', 'Pessoal', 'Sparkles', 1, 1, 'sessão', 'Baixo', 'Baixa', 'tag_pessoal', '[0,1,2,3,4,5,6]', 1, 'quick', new Date().toISOString());
    insertHabit.run(`hab_p5_${userId}`, userId, 'Revisão e Planejamento Semanal', 'Trabalho', 'CheckCircle2', 1, 0, 'check', 'Médio', 'Média', 'tag_trab', '[0]', 0, 'quick', new Date().toISOString());

    // 2. Eventos na Agenda Pro (com data e horários claros)
    const insertEvent = db.prepare(`
      INSERT INTO events (id, user_id, title, date, all_day, start_time, end_time, category, repeat_rule, location, notes, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const todayStr = new Date().toISOString().split('T')[0];
    insertEvent.run(`ev_p1_${userId}`, userId, 'Prova de Sistemas Operacionais', todayStr, 0, '09:00', '11:00', 'Faculdade', 'Nunca', 'Sala 204 - Bloco C', 'Levar calculadora e documento', 0, new Date().toISOString());
    insertEvent.run(`ev_p2_${userId}`, userId, 'Daily Scrum & Alinhamento de Sprint', todayStr, 0, '14:00', '14:45', 'Trabalho', 'Diário', 'Google Meet', 'Apresentar métricas de entrega', 0, new Date().toISOString());
    insertEvent.run(`ev_p3_${userId}`, userId, 'Treino de Força e Musculação', todayStr, 0, '18:30', '19:45', 'Saúde', 'Semanal', 'Smart Fit Centro', 'Ficha A: Peito e Tríceps', 1, new Date().toISOString());

    // 3. Saúde Pro
    db.prepare(`
      INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
      VALUES (?, 10, 10, '[{"timestamp":"08:00"},{"timestamp":"10:30"},{"timestamp":"12:00"},{"timestamp":"14:00"},{"timestamp":"15:30"},{"timestamp":"17:00"},{"timestamp":"18:30"},{"timestamp":"20:00"},{"timestamp":"21:00"},{"timestamp":"22:00"}]', '23:00', '07:00', 1)
    `).run(userId);
  }

  if (profileType === 'mid') {
    // Intermediário: 2 concluídos, 2 pendentes, 6 copos água
    const insertHabit = db.prepare(`
      INSERT INTO habits (id, user_id, title, category, icon_name, target, current, unit, effort, priority, tag_id, repeat_days, completed, completion_style, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertHabit.run(`hab_m1_${userId}`, userId, 'Revisar Pull Requests no GitHub', 'Trabalho', 'Bookmark', 1, 1, 'sessão', 'Médio', 'Alta', 'tag_trab', '[1,2,3,4,5]', 1, 'quick', new Date().toISOString());
    insertHabit.run(`hab_m2_${userId}`, userId, 'Corrida Leve 4km', 'Saúde', 'Dumbbell', 1, 1, 'treino', 'Médio', 'Média', 'tag_saude', '[1,3,5]', 1, 'quick', new Date().toISOString());
    insertHabit.run(`hab_m3_${userId}`, userId, 'Estudar Algoritmos em Grafo', 'Faculdade', 'BookOpen', 1, 0, 'sessão', 'Alto', 'Alta', 'tag_facul', '[2,4]', 0, 'quick', new Date().toISOString());
    insertHabit.run(`hab_m4_${userId}`, userId, 'Organizar Mesa de Trabalho', 'Casa', 'Home', 1, 0, 'check', 'Baixo', 'Baixa', 'tag_casa', '[0,6]', 0, 'quick', new Date().toISOString());

    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO events (id, user_id, title, date, all_day, start_time, end_time, category, repeat_rule, location, notes, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`ev_m1_${userId}`, userId, 'Mentoria de Carreira Tech', todayStr, 0, '16:00', '17:00', 'Trabalho', 'Nunca', 'Discord', 'Tirar dúvidas de arquitetura', 0, new Date().toISOString());

    db.prepare(`
      INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
      VALUES (?, 6, 10, '[{"timestamp":"09:00"},{"timestamp":"11:30"},{"timestamp":"14:00"},{"timestamp":"16:30"},{"timestamp":"19:00"},{"timestamp":"21:00"}]', '00:00', '06:30', 1)
    `).run(userId);
  }

  if (profileType === 'low') {
    // Baixo empenho: 1 feito, 2 pendentes, 2 copos de água, sono desregulado
    const insertHabit = db.prepare(`
      INSERT INTO habits (id, user_id, title, category, icon_name, target, current, unit, effort, priority, tag_id, repeat_days, completed, completion_style, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertHabit.run(`hab_l1_${userId}`, userId, 'Caminhar no quarteirão', 'Saúde', 'Dumbbell', 1, 0, 'vezes', 'Baixo', 'Baixa', 'tag_saude', '[1,2,3,4,5]', 0, 'quick', new Date().toISOString());
    insertHabit.run(`hab_l2_${userId}`, userId, 'Assistir aula gravada', 'Faculdade', 'BookOpen', 1, 0, 'sessão', 'Médio', 'Média', 'tag_facul', '[1,3]', 0, 'quick', new Date().toISOString());
    insertHabit.run(`hab_l3_${userId}`, userId, 'Beber 1 copo d’água ao acordar', 'Saúde', 'Sparkles', 1, 1, 'check', 'Baixo', 'Alta', 'tag_saude', '[0,1,2,3,4,5,6]', 1, 'quick', new Date().toISOString());

    db.prepare(`
      INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
      VALUES (?, 2, 10, '[{"timestamp":"10:30"},{"timestamp":"15:00"}]', '02:30', '07:00', 1)
    `).run(userId);
  }
}
