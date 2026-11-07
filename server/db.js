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

  // Remove todos os outros usuários cadastrados, mantendo estritamente o admin e o usuário de teste
  try {
    db.exec(`DELETE FROM users WHERE id NOT IN ('usr_admin', 'usr_teste');`);
  } catch (e) {}

  const allSeedUsers = [
    {
      id: 'usr_admin',
      username: 'admin',
      email: 'admin@ethos.dev',
      password: hashPassword('Admin@2026!Ethos'),
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
    {
      id: 'usr_teste',
      username: 'teste',
      email: 'teste@ethos.dev',
      password: hashPassword('Teste@2026!Ethos'),
      name: 'Usuário Teste',
      avatar: 'UT',
      role: 'user',
      is_active: 1,
      subscription_tier: 'Pro (Anual)',
      is_public: 1,
      permissions: allPerms,
      streak_days: 1,
      points: 500
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
          password = ?, 
          role = ?, 
          name = ?,
          subscription_tier = ?, 
          permissions = ?
        WHERE id = ? OR username = ? OR email = ?
      `).run(u.password, u.role, u.name, u.subscription_tier, u.permissions, u.id, u.username, u.email);
    }
  }

  seedUserData('usr_matheus_pro', 'pro');
  seedUserData('usr_lucas_dev', 'mid');
  seedUserData('usr_bruno_preguica', 'low');
  seedUserData('usr_clean', 'clean');
  seedDefaultCategories();
}

export function seedDefaultCategories() {
  const nowIso = new Date().toISOString();
  const baseCategories = [
    { id: 'tag_facul', user_id: 'global', name: 'Faculdade', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', icon: 'BookOpen', is_shared: 1, has_subclasses: 1 },
    { id: 'tag_trab', user_id: 'global', name: 'Trabalho', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.15)', icon: 'Bookmark', is_shared: 0, has_subclasses: 0 },
    { id: 'tag_saude', user_id: 'global', name: 'Saúde', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', icon: 'Dumbbell', is_shared: 0, has_subclasses: 0 },
    { id: 'tag_pessoal', user_id: 'global', name: 'Pessoal', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', icon: 'Sparkles', is_shared: 0, has_subclasses: 0 },
    { id: 'tag_casa', user_id: 'global', name: 'Casa', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', icon: 'Home', is_shared: 0, has_subclasses: 0 }
  ];

  for (const cat of baseCategories) {
    const existing = db.prepare(`SELECT id FROM categories WHERE id = ?`).get(cat.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO categories (id, user_id, name, color, bg, icon, is_shared, has_subclasses, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(cat.id, cat.user_id, cat.name, cat.color, cat.bg, cat.icon, cat.is_shared, cat.has_subclasses, nowIso);
    }
  }

  // Sub-classes iniciais de "Faculdade" (Redes: 8h, Cálculo: 7h -> 15h totais na semana)
  const faculSubs = [
    { id: 'sub_redes', category_id: 'tag_facul', name: 'Redes de Computadores', priority: 'Alta', metadata: JSON.stringify({ hours: 8, order: 1 }) },
    { id: 'sub_calculo', category_id: 'tag_facul', name: 'Cálculo', priority: 'Alta', metadata: JSON.stringify({ hours: 7, order: 2 }) }
  ];
  for (const sub of faculSubs) {
    const exSub = db.prepare(`SELECT id FROM subclasses WHERE id = ?`).get(sub.id);
    if (!exSub) {
      db.prepare(`
        INSERT INTO subclasses (id, category_id, name, priority, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(sub.id, sub.category_id, sub.name, sub.priority, sub.metadata, nowIso);
    }
  }

  // Membro colaborador inicial em "Faculdade" (Sebastian)
  const exMember = db.prepare(`SELECT id FROM category_members WHERE id = 'mem_sebastian'`).get();
  if (!exMember) {
    db.prepare(`
      INSERT INTO category_members (id, category_id, user_id, member_email, member_name, role, created_at)
      VALUES ('mem_sebastian', 'tag_facul', 'usr_sebastian', 'sebastian@ethos.dev', 'Sebastian', 'collaborator', ?)
    `).run(nowIso);
  }
}

function seedUserData(userId, profileType) {
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
    const insertHabit = db.prepare(`
      INSERT INTO habits (id, user_id, title, category, icon_name, target, current, unit, effort, priority, tag_id, repeat_days, completed, completion_style, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertHabit.run(`hab_p1_${userId}`, userId, 'Estudar Sistemas Operacionais', 'Faculdade', 'BookOpen', 1, 1, 'sessão', 'Alto', 'Alta', 'tag_facul', '[1,2,3,4,5]', 1, 'quick', new Date().toISOString());
    insertHabit.run(`hab_p2_${userId}`, userId, 'Treino Hipertrofia A (Superiores)', 'Saúde', 'Dumbbell', 1, 1, 'treino', 'Alto', 'Alta', 'tag_saude', '[1,3,5]', 1, 'quick', new Date().toISOString());
    insertHabit.run(`hab_p3_${userId}`, userId, 'Leitura de Arquitetura Limpa (30 págs)', 'Trabalho', 'Bookmark', 30, 30, 'páginas', 'Médio', 'Média', 'tag_trab', '[0,1,2,3,4,5,6]', 1, 'numeric', new Date().toISOString());
    insertHabit.run(`hab_p4_${userId}`, userId, 'Meditação Mindfulness & Respiração', 'Pessoal', 'Sparkles', 1, 1, 'sessão', 'Baixo', 'Baixa', 'tag_pessoal', '[0,1,2,3,4,5,6]', 1, 'quick', new Date().toISOString());
    insertHabit.run(`hab_p5_${userId}`, userId, 'Revisão e Planejamento Semanal', 'Trabalho', 'CheckCircle2', 1, 0, 'check', 'Médio', 'Média', 'tag_trab', '[0]', 0, 'quick', new Date().toISOString());

    const insertEvent = db.prepare(`
      INSERT INTO events (id, user_id, title, date, all_day, start_time, end_time, category, repeat_rule, location, notes, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const todayStr = new Date().toISOString().split('T')[0];
    // Observações pessoais criptografadas em repouso com AES-256-GCM
    insertEvent.run(`ev_p1_${userId}`, userId, 'Prova de Sistemas Operacionais', todayStr, 0, '09:00', '11:00', 'Faculdade', 'Nunca', 'Sala 204 - Bloco C', encryptAES256GCM('Levar calculadora e documento'), 0, new Date().toISOString());
    insertEvent.run(`ev_p2_${userId}`, userId, 'Daily Scrum & Alinhamento de Sprint', todayStr, 0, '14:00', '14:45', 'Trabalho', 'Diário', 'Google Meet', encryptAES256GCM('Apresentar métricas de entrega'), 0, new Date().toISOString());
    insertEvent.run(`ev_p3_${userId}`, userId, 'Treino de Força e Musculação', todayStr, 0, '18:30', '19:45', 'Saúde', 'Semanal', 'Smart Fit Centro', encryptAES256GCM('Ficha A: Peito e Tríceps'), 1, new Date().toISOString());

    db.prepare(`
      INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
      VALUES (?, 10, 10, '[{"timestamp":"08:00"},{"timestamp":"10:30"},{"timestamp":"12:00"},{"timestamp":"14:00"},{"timestamp":"15:30"},{"timestamp":"17:00"},{"timestamp":"18:30"},{"timestamp":"20:00"},{"timestamp":"21:00"},{"timestamp":"22:00"}]', '23:00', '07:00', 1)
    `).run(userId);
  }

  if (profileType === 'mid') {
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
    `).run(`ev_m1_${userId}`, userId, 'Mentoria de Carreira Tech', todayStr, 0, '16:00', '17:00', 'Trabalho', 'Nunca', 'Discord', encryptAES256GCM('Tirar dúvidas de arquitetura'), 0, new Date().toISOString());

    db.prepare(`
      INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
      VALUES (?, 6, 10, '[{"timestamp":"09:00"},{"timestamp":"11:30"},{"timestamp":"14:00"},{"timestamp":"16:30"},{"timestamp":"19:00"},{"timestamp":"21:00"}]', '00:00', '06:30', 1)
    `).run(userId);
  }

  if (profileType === 'low') {
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
