import express from 'express';
import cors from 'cors';
import { db, initDatabase, resetSystemData } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
initDatabase(false);

// ==========================================
// 1. AUTHENTICATION ENDPOINTS (US35, US36, US37)
// ==========================================

// US35: Login (supports username or email, checks if active)
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe login e senha.' });
  }

  const stmt = db.prepare(`
    SELECT * FROM users 
    WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
  `);
  const user = stmt.get(login, login);

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  // Verifica se o usuário está ativo (Controle de permissões do Admin)
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

// US35: Cadastro (Register)
app.post('/api/auth/register', (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  const cleanUsername = username?.trim() || email.split('@')[0];

  // Verificar duplicidade
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

  // Initialize empty health record for new user
  const initHealth = db.prepare(`
    INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
    VALUES (?, 0, 10, '[]', '23:30', '07:00', 0)
  `);
  initHealth.run(newId);

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

// US36: Solicitação de Token para Recuperação de Senha
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
  }

  const stmt = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`);
  const user = stmt.get(email);
  if (!user) {
    return res.status(404).json({ error: 'Nenhum usuário encontrado com este e-mail.' });
  }

  // Generate 6-digit mock security token
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const updateStmt = db.prepare(`UPDATE users SET reset_token = ? WHERE id = ?`);
  updateStmt.run(token, user.id);

  res.json({
    success: true,
    email: user.email,
    token,
    message: 'Token de recuperação gerado e salvo no banco de dados com sucesso.'
  });
});

// US36: Validação de Token e Redefinição de Senha
app.post('/api/auth/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Dados incompletos para redefinição.' });
  }

  const stmt = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`);
  const user = stmt.get(email);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (user.reset_token !== token.trim()) {
    return res.status(400).json({ error: 'Token de recuperação inválido ou expirado.' });
  }

  const updateStmt = db.prepare(`UPDATE users SET password = ?, reset_token = NULL WHERE id = ?`);
  updateStmt.run(newPassword, user.id);

  res.json({ success: true, message: 'Senha atualizada no banco de dados com sucesso!' });
});

// US37: Atualizar Perfil e Privacidade (Público/Privado)
app.put('/api/user/:id/profile', (req, res) => {
  const { id } = req.params;
  const { name, bio, is_public } = req.body;

  const stmt = db.prepare(`
    UPDATE users SET 
      name = COALESCE(?, name),
      is_public = ?
    WHERE id = ?
  `);
  stmt.run(name, is_public ? 1 : 0, id);

  res.json({ success: true });
});

// ==========================================
// 2. PORTAL DE ADMINISTRAÇÃO (Requisito 2)
// ==========================================

// Listar todos os usuários para o Portal de Admin
app.get('/api/admin/users', (req, res) => {
  const stmt = db.prepare(`
    SELECT id, username, email, name, avatar, role, is_active,
           subscription_tier, is_public, permissions, streak_days,
           points, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  const users = stmt.all().map(u => ({
    ...u,
    is_active: u.is_active === 1,
    is_public: u.is_public === 1,
    permissions: JSON.parse(u.permissions || '{}')
  }));

  res.json({ users });
});

// Atualizar Assinatura do Usuário (Gratuito, Pro, Enterprise)
app.post('/api/admin/user/:id/subscription', (req, res) => {
  const { id } = req.params;
  const { subscription_tier } = req.body;

  const stmt = db.prepare(`UPDATE users SET subscription_tier = ? WHERE id = ?`);
  stmt.run(subscription_tier, id);

  res.json({ success: true, message: `Assinatura atualizada para ${subscription_tier}` });
});

// Ativar ou Desativar Usuário (Controle de Acesso)
app.post('/api/admin/user/:id/toggle-active', (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const stmt = db.prepare(`UPDATE users SET is_active = ? WHERE id = ?`);
  stmt.run(is_active ? 1 : 0, id);

  res.json({ 
    success: true, 
    is_active: !!is_active, 
    message: is_active ? 'Usuário ativado com sucesso.' : 'Usuário desativado com sucesso.' 
  });
});

// Atualizar Permissões Modulares do Usuário
app.post('/api/admin/user/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  const stmt = db.prepare(`UPDATE users SET permissions = ? WHERE id = ?`);
  stmt.run(JSON.stringify(permissions), id);

  res.json({ success: true, permissions, message: 'Permissões atualizadas com sucesso.' });
});

// Requisito 5: Zerar o Sistema
app.post('/api/system/reset', (req, res) => {
  resetSystemData();
  res.json({ 
    success: true, 
    message: 'Sistema zerado com sucesso! Dados limpos prontos para verificação.' 
  });
});

// ==========================================
// 3. HABITS, HEALTH & DATA ENDPOINTS
// ==========================================

// Buscar dados do usuário (Hábitos, Saúde, etc.)
app.get('/api/user/:id/data', (req, res) => {
  const { id } = req.params;

  const habitsStmt = db.prepare(`SELECT * FROM habits WHERE user_id = ?`);
  const habits = habitsStmt.all(id).map(h => ({
    ...h,
    completed: h.completed === 1,
    repeatDays: JSON.parse(h.repeat_days || '[1,2,3,4,5]')
  }));

  const healthStmt = db.prepare(`SELECT * FROM health WHERE user_id = ?`);
  let health = healthStmt.get(id);
  if (!health) {
    health = {
      user_id: id,
      water_glasses: 0,
      water_target: 10,
      water_history: '[]',
      sleep_bed_time: '23:30',
      sleep_wake_time: '07:00',
      sleep_logged: 0
    };
  } else {
    health = {
      waterGlasses: health.water_glasses,
      waterTarget: health.water_target,
      waterHistory: JSON.parse(health.water_history || '[]'),
      sleep: {
        bedTime: health.sleep_bed_time,
        wakeTime: health.sleep_wake_time,
        logged: health.sleep_logged === 1
      }
    };
  }

  res.json({ habits, health });
});

// Criar Hábito
app.post('/api/user/:id/habit', (req, res) => {
  const { id } = req.params;
  const habit = req.body;

  const stmt = db.prepare(`
    INSERT INTO habits (
      id, user_id, title, category, icon_name, target, current,
      unit, effort, priority, tag_id, repeat_days, completed,
      completion_style, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    habit.id || `hab_${Date.now()}`,
    id,
    habit.title,
    habit.category,
    habit.iconName || habit.category,
    habit.target || 1,
    habit.current || 0,
    habit.unit || 'vezes',
    habit.effort || 'Médio',
    habit.priority || 'Média',
    habit.tagId || null,
    JSON.stringify(habit.repeatDays || [1, 2, 3, 4, 5]),
    habit.completed ? 1 : 0,
    habit.completionStyle || 'quick',
    new Date().toISOString()
  );

  res.status(201).json({ success: true, habit });
});

// Atualizar Hábito (Progresso / Conclusão)
app.put('/api/user/:id/habit/:habitId', (req, res) => {
  const { id, habitId } = req.params;
  const { current, completed } = req.body;

  const stmt = db.prepare(`
    UPDATE habits SET current = ?, completed = ?
    WHERE id = ? AND user_id = ?
  `);
  stmt.run(current, completed ? 1 : 0, habitId, id);

  res.json({ success: true });
});

// Deletar Hábito
app.delete('/api/user/:id/habit/:habitId', (req, res) => {
  const { id, habitId } = req.params;
  const stmt = db.prepare(`DELETE FROM habits WHERE id = ? AND user_id = ?`);
  stmt.run(habitId, id);
  res.json({ success: true });
});

// Atualizar Água e Saúde
app.post('/api/user/:id/health', (req, res) => {
  const { id } = req.params;
  const { waterGlasses, waterHistory, sleep } = req.body;

  const stmt = db.prepare(`
    INSERT INTO health (user_id, water_glasses, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      water_glasses = COALESCE(excluded.water_glasses, health.water_glasses),
      water_history = COALESCE(excluded.water_history, health.water_history),
      sleep_bed_time = COALESCE(excluded.sleep_bed_time, health.sleep_bed_time),
      sleep_wake_time = COALESCE(excluded.sleep_wake_time, health.sleep_wake_time),
      sleep_logged = COALESCE(excluded.sleep_logged, health.sleep_logged)
  `);

  stmt.run(
    id,
    waterGlasses ?? 0,
    JSON.stringify(waterHistory || []),
    sleep?.bedTime || '23:30',
    sleep?.wakeTime || '07:00',
    sleep?.logged ? 1 : 0
  );

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`[Ethos SQLite Server] API rodando na porta ${PORT} com banco de dados SQLite.`);
});
