import express from 'express';
import cors from 'cors';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDatabase, seedFiveUsers } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite database and seed 5 users
initDatabase();

// ==========================================
// 1. AUTHENTICATION ENDPOINTS (US35, US36, US37)
// ==========================================

// US35: Login
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe login e senha.' });
  }

  const stmt = db.prepare(`
    SELECT * FROM users 
    WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
  `);
  const user = stmt.get(login.trim(), login.trim());

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ 
      error: 'Sua conta foi desativada pelo Administrador. Acesso revogado.' 
    });
  }

  const parsedPermissions = JSON.parse(user.permissions || '{}');
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    is_active: user.is_active === 1,
    subscription_tier: user.subscription_tier,
    is_public: user.is_public === 1,
    permissions: parsedPermissions,
    streak_days: user.streak_days,
    points: user.points
  });
});

// US35: Cadastro
app.post('/api/auth/register', (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  const cleanUsername = username?.trim() || email.split('@')[0];

  const checkStmt = db.prepare(`
    SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
  `);
  const existing = checkStmt.get(email, cleanUsername);
  if (existing) {
    return res.status(409).json({ error: 'E-mail ou nome de usuário já cadastrado.' });
  }

  const initials = name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('') || 'EU';
  const newId = `usr_${Date.now()}`;
  const defaultPermissions = JSON.stringify({
    focus: true,
    workouts: true,
    telemetry: true,
    social: true,
    habits: true
  });

  const insert = db.prepare(`
    INSERT INTO users (
      id, username, email, password, name, avatar, role,
      is_active, subscription_tier, is_public, permissions,
      streak_days, points, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'user', 1, 'Gratuito', 1, ?, 0, 0, ?)
  `);

  insert.run(
    newId,
    cleanUsername,
    email.trim(),
    password,
    name.trim(),
    initials,
    defaultPermissions,
    new Date().toISOString()
  );

  db.prepare(`
    INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
    VALUES (?, 0, 10, '[]', '23:30', '07:00', 0)
  `).run(newId);

  res.status(201).json({
    id: newId,
    username: cleanUsername,
    email: email.trim(),
    name: name.trim(),
    avatar: initials,
    role: 'user',
    is_active: true,
    subscription_tier: 'Gratuito',
    is_public: true,
    permissions: JSON.parse(defaultPermissions),
    streak_days: 0,
    points: 0
  });
});

// US36: Solicitação de Token
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });

  const stmt = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`);
  const user = stmt.get(email);
  if (!user) return res.status(404).json({ error: 'Nenhum usuário encontrado com este e-mail.' });

  const token = Math.floor(100000 + Math.random() * 900000).toString();
  db.prepare(`UPDATE users SET reset_token = ? WHERE id = ?`).run(token, user.id);

  res.json({
    success: true,
    email: user.email,
    token,
    message: 'Token de recuperação gerado no SQLite com sucesso.'
  });
});

// US36: Validação de Token
app.post('/api/auth/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Dados incompletos para redefinição.' });
  }

  const stmt = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`);
  const user = stmt.get(email);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (user.reset_token !== token.trim()) {
    return res.status(400).json({ error: 'Token de recuperação inválido.' });
  }

  db.prepare(`UPDATE users SET password = ?, reset_token = NULL WHERE id = ?`).run(newPassword, user.id);
  res.json({ success: true, message: 'Senha atualizada com sucesso!' });
});

// US37: Atualizar Perfil
app.put('/api/user/:id/profile', (req, res) => {
  const { id } = req.params;
  const { name, is_public } = req.body;

  db.prepare(`UPDATE users SET name = COALESCE(?, name), is_public = ? WHERE id = ?`)
    .run(name, is_public ? 1 : 0, id);

  res.json({ success: true });
});

// ==========================================
// 2. PORTAL DE ADMINISTRAÇÃO
// ==========================================

app.get('/api/admin/users', (req, res) => {
  const users = db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all().map(u => ({
    ...u,
    is_active: u.is_active === 1,
    is_public: u.is_public === 1,
    permissions: JSON.parse(u.permissions || '{}')
  }));
  res.json({ users });
});

app.post('/api/admin/user/:id/subscription', (req, res) => {
  const { id } = req.params;
  const { subscription_tier } = req.body;
  db.prepare(`UPDATE users SET subscription_tier = ? WHERE id = ?`).run(subscription_tier, id);
  res.json({ success: true, message: `Assinatura atualizada para ${subscription_tier}` });
});

app.post('/api/admin/user/:id/toggle-active', (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  db.prepare(`UPDATE users SET is_active = ? WHERE id = ?`).run(is_active ? 1 : 0, id);
  res.json({ success: true, is_active: !!is_active });
});

app.post('/api/admin/user/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  db.prepare(`UPDATE users SET permissions = ? WHERE id = ?`).run(JSON.stringify(permissions), id);
  res.json({ success: true, permissions });
});

app.post('/api/system/reset', (req, res) => {
  seedFiveUsers();
  res.json({ success: true, message: 'Sistema sincronizado com os 5 perfis padrão.' });
});

// ==========================================
// 3. HABITS, EVENTS & HEALTH DATA
// ==========================================

app.get('/api/user/:id/data', (req, res) => {
  const { id } = req.params;

  // 1. Habits
  const habits = db.prepare(`SELECT * FROM habits WHERE user_id = ?`).all(id).map(h => ({
    ...h,
    completed: h.completed === 1,
    repeatDays: JSON.parse(h.repeat_days || '[1,2,3,4,5]')
  }));

  // 2. Events (com data e horários claros)
  const events = db.prepare(`SELECT * FROM events WHERE user_id = ? ORDER BY date ASC, start_time ASC`).all(id).map(e => ({
    ...e,
    allDay: e.all_day === 1,
    completed: e.completed === 1,
    startTime: e.start_time,
    endTime: e.end_time,
    repeat: e.repeat_rule
  }));

  // 3. Health
  let health = db.prepare(`SELECT * FROM health WHERE user_id = ?`).get(id);
  if (!health) {
    health = {
      waterGlasses: 0,
      waterTarget: 10,
      glassMl: 250,
      waterHistory: [],
      sleep: { bedTime: '23:30', wakeTime: '07:00', logged: false }
    };
  } else {
    health = {
      waterGlasses: health.water_glasses,
      waterTarget: health.water_target || 10,
      glassMl: health.glass_ml || 250,
      waterHistory: JSON.parse(health.water_history || '[]'),
      sleep: {
        bedTime: health.sleep_bed_time,
        wakeTime: health.sleep_wake_time,
        logged: health.sleep_logged === 1
      }
    };
  }

  // 4. Custom Tags / Categorias
  const tags = db.prepare(`SELECT * FROM tags WHERE user_id = ? OR user_id = 'global'`).all(id);

  res.json({ habits, events, health, tags });
});

// Criar Hábito
app.post('/api/user/:id/habit', (req, res) => {
  const { id } = req.params;
  const habit = req.body;
  const habitId = habit.id || `hab_${Date.now()}`;

  db.prepare(`
    INSERT INTO habits (
      id, user_id, title, category, icon_name, target, current,
      unit, effort, priority, tag_id, repeat_days, completed,
      completion_style, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    habitId, id, habit.title, habit.category, habit.iconName || habit.category,
    habit.target || 1, habit.current || 0, habit.unit || 'vezes',
    habit.effort || 'Médio', habit.priority || 'Média', habit.tagId || null,
    JSON.stringify(habit.repeatDays || [1, 2, 3, 4, 5]), habit.completed ? 1 : 0,
    habit.completionStyle || 'quick', new Date().toISOString()
  );

  res.status(201).json({ success: true, id: habitId });
});

// Atualizar Hábito
app.put('/api/user/:id/habit/:habitId', (req, res) => {
  const { id, habitId } = req.params;
  const { current, completed } = req.body;
  db.prepare(`UPDATE habits SET current = ?, completed = ? WHERE id = ? AND user_id = ?`)
    .run(current, completed ? 1 : 0, habitId, id);
  res.json({ success: true });
});

// Deletar Hábito
app.delete('/api/user/:id/habit/:habitId', (req, res) => {
  const { id, habitId } = req.params;
  db.prepare(`DELETE FROM habits WHERE id = ? AND user_id = ?`).run(habitId, id);
  res.json({ success: true });
});

// Criar Evento com Data e Horários (Requisito 3)
app.post('/api/user/:id/event', (req, res) => {
  const { id } = req.params;
  const event = req.body;
  const eventId = event.id || `ev_${Date.now()}`;

  db.prepare(`
    INSERT INTO events (
      id, user_id, title, date, all_day, start_time, end_time,
      category, repeat_rule, location, notes, completed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    eventId, id, event.title, event.date, event.allDay ? 1 : 0,
    event.startTime || '09:00', event.endTime || '10:00',
    event.category || 'Geral', event.repeat || 'Nunca',
    event.location || '', event.notes || '', new Date().toISOString()
  );

  res.status(201).json({ success: true, id: eventId });
});

// Toggle Conclusão de Evento
app.put('/api/user/:id/event/:eventId/toggle', (req, res) => {
  const { id, eventId } = req.params;
  const { completed } = req.body;
  db.prepare(`UPDATE events SET completed = ? WHERE id = ? AND user_id = ?`)
    .run(completed ? 1 : 0, eventId, id);
  res.json({ success: true });
});

// Deletar Evento
app.delete('/api/user/:id/event/:eventId', (req, res) => {
  const { id, eventId } = req.params;
  db.prepare(`DELETE FROM events WHERE id = ? AND user_id = ?`).run(eventId, id);
  res.json({ success: true });
});

// Criar Nova Categoria / Tema (Requisito 4)
app.post('/api/user/:id/tag', (req, res) => {
  const { id } = req.params;
  const { name, color, bg, icon } = req.body;
  const tagId = `tag_${Date.now()}`;

  db.prepare(`
    INSERT INTO tags (id, user_id, name, color, bg, icon)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tagId, id, name, color, bg, icon || 'Bookmark');

  res.status(201).json({ success: true, tag: { id: tagId, name, color, bg, icon: icon || 'Bookmark' } });
});

// Atualizar Água e Saúde
app.post('/api/user/:id/health', (req, res) => {
  const { id } = req.params;
  const { waterGlasses, waterTarget, glassMl, waterHistory, sleep } = req.body;

  db.prepare(`
    INSERT INTO health (user_id, water_glasses, water_target, glass_ml, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      water_glasses = COALESCE(excluded.water_glasses, health.water_glasses),
      water_target = COALESCE(excluded.water_target, health.water_target),
      glass_ml = COALESCE(excluded.glass_ml, health.glass_ml),
      water_history = COALESCE(excluded.water_history, health.water_history),
      sleep_bed_time = COALESCE(excluded.sleep_bed_time, health.sleep_bed_time),
      sleep_wake_time = COALESCE(excluded.sleep_wake_time, health.sleep_wake_time),
      sleep_logged = COALESCE(excluded.sleep_logged, health.sleep_logged)
  `).run(
    id,
    waterGlasses ?? 0,
    waterTarget || 10,
    glassMl || 250,
    JSON.stringify(waterHistory || []),
    sleep?.bedTime || '23:30',
    sleep?.wakeTime || '07:00',
    sleep?.logged ? 1 : 0
  );

  res.json({ success: true });
});

// ==========================================
// 4. MOTOR ANALÍTICO EM PYTHON (FASTAPI + CLI FALLBACK)
// ==========================================

// Endpoint: Buscar Analytics Completo via Python Engine
app.get('/api/analytics/:id', async (req, res) => {
  const { id } = req.params;

  // 1. Tentar consumir da FastAPI microservice na porta 8000
  try {
    const fastApiResponse = await fetch(`http://127.0.0.1:8000/analytics/${id}`, {
      signal: AbortSignal.timeout(2000)
    });
    if (fastApiResponse.ok) {
      const data = await fastApiResponse.json();
      return res.json(data);
    }
  } catch (err) {
    // FastAPI microservice pode não estar inicializado ou em execução; usa CLI fallback
  }

  // 2. Fallback: Executar Python CLI diretamente
  execFile('py', ['-3.12', '-m', 'engine.cli', id], { cwd: rootDir, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error('[Analytics Error]', error, stderr);
      return res.status(500).json({ error: 'Erro ao calcular telemetria via Python Engine.', details: stderr });
    }

    try {
      const data = JSON.parse(stdout);
      res.json(data);
    } catch (parseErr) {
      console.error('[Analytics JSON Parse Error]', parseErr, stdout);
      res.status(500).json({ error: 'Falha ao processar retorno da engine analítica.' });
    }
  });
});

// Endpoint: Registrar Check-in de Hábito
app.post('/api/user/:id/checkin', (req, res) => {
  const { id } = req.params;
  const { habitId, date, value, note, statusOverride } = req.body;
  const todayStr = date || new Date().toISOString().split('T')[0];
  const checkinId = `chk_${habitId}_${todayStr}`;
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO checkins (id, user_id, habit_id, event_date, logged_at, value, status_override, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      value = excluded.value,
      status_override = excluded.status_override,
      note = excluded.note,
      logged_at = excluded.logged_at
  `).run(
    checkinId, id, habitId, todayStr, nowIso,
    value ?? 1.0, statusOverride || null, note || '', nowIso
  );

  res.json({ success: true, checkin_id: checkinId });
});

app.listen(PORT, () => {
  console.log(`[Ethos SQLite Server] API ativa na porta ${PORT} com 5 usuários seedados.`);
});
