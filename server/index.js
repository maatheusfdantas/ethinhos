import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDatabase, seedFiveUsers } from './db.js';
import { registerGoogleCalendarAuthRoutes } from './googleCalendarAuth.js';
import {
  hashPassword,
  verifyPassword,
  encryptAES256GCM,
  decryptAES256GCM,
  issueSessionTokens,
  rotateRefreshToken,
  checkLoginBruteForce,
  recordLoginFailure,
  clearLoginFailures,
  createRateLimiter,
  securityHeadersMiddleware,
  sanitizeObject,
  logSecurityEvent,
  createEncryptedDatabaseBackup
} from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// 0. CAMADA DE SEGURANÇA HTTP, CORS RESTRITO E SANITIZAÇÃO
// ==========================================
app.use(securityHeadersMiddleware);

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001'
)
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Permite requisições same-origin / server-to-server ou origens na allowlist
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origem bloqueada pela política de CORS do Ethos.'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '256kb' }));

// Sanitização automática contra XSS e Prototype Pollution em payloads JSON
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
});

// Rate Limiting Global da API (180 req/min por IP)
app.use('/api', createRateLimiter({ windowMs: 60_000, maxRequests: 180, bucketName: 'api_global' }));

// Rate Limiting Estrito para Endpoints de Autenticação (15 req/min por IP)
const authRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 15, bucketName: 'api_auth' });

// Inicializar banco de dados SQLite, tabelas de segurança e 5 usuários seedados
initDatabase();
registerGoogleCalendarAuthRoutes(app);

// ==========================================
// 1. ENDPOINTS DE AUTENTICAÇÃO SEGURA (SCRYPT + JWT + REFRESH ROTATION)
// ==========================================

// Login com proteção contra Brute Force, Hashing scrypt e emissão de JWT + Refresh Token
app.post('/api/auth/login', authRateLimiter, (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe login e senha.' });
  }

  const normalizedLogin = String(login).trim().toLowerCase();
  const bruteCheck = checkLoginBruteForce(`${req.ip}:${normalizedLogin}`);
  if (!bruteCheck.allowed) {
    logSecurityEvent(db, {
      correlationId: req.correlationId,
      eventType: 'BRUTE_FORCE_LOCKOUT',
      ipAddress: req.ip,
      metadata: { login: normalizedLogin, waitSeconds: bruteCheck.waitSeconds }
    });
    return res.status(429).json({ error: bruteCheck.message });
  }

  const stmt = db.prepare(`
    SELECT * FROM users 
    WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
  `);
  const user = stmt.get(normalizedLogin, normalizedLogin);

  // Mensagem genérica ou verificação constante para evitar enumeração/timing attacks
  if (!user || !verifyPassword(String(password), user.password)) {
    const failStatus = recordLoginFailure(`${req.ip}:${normalizedLogin}`);
    logSecurityEvent(db, {
      correlationId: req.correlationId,
      eventType: 'LOGIN_FAILED',
      actorUserId: user?.id || null,
      ipAddress: req.ip,
      metadata: { login: normalizedLogin, attempts: failStatus.count, locked: failStatus.locked }
    });
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu usuário e senha.' });
  }

  if (user.is_active === 0) {
    logSecurityEvent(db, {
      correlationId: req.correlationId,
      eventType: 'LOGIN_BLOCKED_INACTIVE_USER',
      actorUserId: user.id,
      ipAddress: req.ip,
      metadata: { username: user.username }
    });
    return res.status(403).json({
      error: 'Sua conta foi desativada pelo Administrador. Acesso revogado.'
    });
  }

  // Se a senha no banco ainda não estava no formato scrypt$, migra transparentemente
  if (!String(user.password).startsWith('scrypt$')) {
    db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hashPassword(String(password)), user.id);
  }

  clearLoginFailures(`${req.ip}:${normalizedLogin}`);
  const tokens = issueSessionTokens(db, user, req);

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'LOGIN_SUCCESS',
    actorUserId: user.id,
    ipAddress: req.ip,
    metadata: { username: user.username, role: user.role }
  });

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
    points: user.points,
    weight: user.weight || 70.0,
    height: user.height || 1.75,
    auth: tokens
  });
});

// Cadastro com senha hasheada via scrypt + salt individual
app.post('/api/auth/register', authRateLimiter, (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'A senha deve possuir pelo menos 6 caracteres.' });
  }

  const cleanUsername = username?.trim() || email.split('@')[0];

  const checkStmt = db.prepare(`
    SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
  `);
  const existing = checkStmt.get(email, cleanUsername);
  if (existing) {
    return res.status(409).json({ error: 'E-mail ou nome de usuário já cadastrado.' });
  }

  const initials = name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || 'EU';
  const newId = `usr_${Date.now()}`;
  const passwordHash = hashPassword(String(password));
  const defaultPermissions = JSON.stringify({
    focus: true,
    workouts: true,
    telemetry: true,
    social: true,
    habits: true
  });

  db.prepare(`
    INSERT INTO users (
      id, username, email, password, name, avatar, role,
      is_active, subscription_tier, is_public, permissions,
      streak_days, points, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'user', 1, 'Gratuito', 1, ?, 0, 0, ?)
  `).run(
    newId,
    cleanUsername,
    email.trim(),
    passwordHash,
    name.trim(),
    initials,
    defaultPermissions,
    new Date().toISOString()
  );

  db.prepare(`
    INSERT INTO health (user_id, water_glasses, water_target, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
    VALUES (?, 0, 10, '[]', '23:30', '07:00', 0)
  `).run(newId);

  const newUserObj = { id: newId, username: cleanUsername, role: 'user' };
  const tokens = issueSessionTokens(db, newUserObj, req);

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'USER_REGISTERED',
    actorUserId: newId,
    ipAddress: req.ip,
    metadata: { username: cleanUsername, email: email.trim() }
  });

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
    points: 0,
    auth: tokens
  });
});

// Rotação de Refresh Token com detecção de reuso
app.post('/api/auth/refresh', authRateLimiter, (req, res) => {
  const { refreshToken } = req.body;
  const result = rotateRefreshToken(db, refreshToken, req);
  if (result.error) {
    return res.status(result.status || 401).json({ error: result.error });
  }
  return res.json({
    success: true,
    ...result.tokens
  });
});

// Revogação de sessão e Logout em todos os dispositivos
app.post('/api/auth/logout-all', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Informe o userId.' });

  const info = db.prepare(`UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?`).run(userId);
  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'SESSION_REVOKED_ALL_DEVICES',
    actorUserId: userId,
    ipAddress: req.ip,
    metadata: { sessionsRevoked: info.changes }
  });

  res.json({
    success: true,
    message: 'Todas as sessões ativas foram revogadas com sucesso.',
    sessionsRevoked: info.changes
  });
});

// Solicitação de Token de Recuperação (Uso Único + Expiração Curta de 15 min + Hash SHA-256)
app.post('/api/auth/forgot-password', authRateLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });

  const stmt = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`);
  const user = stmt.get(email);
  if (!user) return res.status(404).json({ error: 'Nenhum usuário encontrado com este e-mail.' });

  const rawToken = crypto.randomInt(100000, 999999).toString();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  // Invalida tokens anteriores pendentes do usuário
  db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?`).run(user.id);

  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(`prt_${crypto.randomUUID()}`, user.id, tokenHash, expiresAt, new Date().toISOString());

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'PASSWORD_RESET_REQUESTED',
    actorUserId: user.id,
    ipAddress: req.ip,
    metadata: { email: user.email, expiresAt }
  });

  res.json({
    success: true,
    email: user.email,
    token: rawToken, // Exibido apenas para fins de teste local sem servidor SMTP
    expiresInMinutes: 15,
    message: 'Token de uso único (expiração 15 min) gerado e armazenado com hash SHA-256.'
  });
});

// Validação de Token de Uso Único e Redefinição com Hashing scrypt
app.post('/api/auth/reset-password', authRateLimiter, (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Dados incompletos para redefinição.' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(email);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const candidateHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
  const resetRecord = db
    .prepare(`
      SELECT * FROM password_reset_tokens
      WHERE user_id = ? AND token_hash = ? AND used = 0
      ORDER BY created_at DESC LIMIT 1
    `)
    .get(user.id, candidateHash);

  if (!resetRecord) {
    return res.status(400).json({ error: 'Token de recuperação inválido ou já utilizado.' });
  }

  if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
    db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`).run(resetRecord.id);
    return res.status(400).json({ error: 'Token de recuperação expirado (limite de 15 minutos).' });
  }

  // Marca token como usado (uso único), atualiza senha com scrypt e revoga todas as sessões antigas
  const newPasswordHash = hashPassword(String(newPassword));
  db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`).run(resetRecord.id);
  db.prepare(`UPDATE users SET password = ?, reset_token = NULL WHERE id = ?`).run(newPasswordHash, user.id);
  db.prepare(`UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?`).run(user.id);

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'PASSWORD_CHANGED_AND_SESSIONS_REVOKED',
    actorUserId: user.id,
    ipAddress: req.ip,
    metadata: { email: user.email }
  });

  res.json({ success: true, message: 'Senha atualizada com scrypt e sessões antigas revogadas!' });
});

// Atualizar Perfil (Sem Mass Assignment de role/permissions)
app.put('/api/user/:id/profile', (req, res) => {
  const { id } = req.params;
  const { name, is_public, weight, height } = req.body;

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      is_public = CASE WHEN ? IS NOT NULL THEN ? ELSE is_public END,
      weight = CASE WHEN ? IS NOT NULL THEN ? ELSE weight END,
      height = CASE WHEN ? IS NOT NULL THEN ? ELSE height END
    WHERE id = ?
  `).run(
    name || null,
    is_public !== undefined ? (is_public ? 1 : 0) : null,
    is_public !== undefined ? (is_public ? 1 : 0) : null,
    weight !== undefined && weight !== null ? Number(weight) : null,
    weight !== undefined && weight !== null ? Number(weight) : null,
    height !== undefined && height !== null ? Number(height) : null,
    height !== undefined && height !== null ? Number(height) : null,
    id
  );

  res.json({ success: true });
});

// ==========================================
// 2. PORTAL DE ADMINISTRAÇÃO (SEM EXPOR HASH DE SENHA)
// ==========================================

app.get('/api/admin/users', (_req, res) => {
  const users = db
    .prepare(`
      SELECT id, username, email, name, avatar, role, is_active, subscription_tier,
             is_public, permissions, streak_days, points, created_at
      FROM users ORDER BY created_at DESC
    `)
    .all()
    .map((u) => ({
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
  if (!is_active) {
    db.prepare(`UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?`).run(id);
  }
  res.json({ success: true, is_active: Boolean(is_active) });
});

app.post('/api/admin/user/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  db.prepare(`UPDATE users SET permissions = ? WHERE id = ?`).run(JSON.stringify(permissions), id);
  res.json({ success: true, permissions });
});

app.post('/api/system/reset', (_req, res) => {
  seedFiveUsers();
  res.json({ success: true, message: 'Sistema sincronizado com os 5 perfis padrão.' });
});

// ==========================================
// 3. HABITS, EVENTS (COM CRIPTOGRAFIA AES-256-GCM EM REPOUSO) & HEALTH DATA
// ==========================================

app.get('/api/user/:id/data', (req, res) => {
  const { id } = req.params;

  const habits = db.prepare(`SELECT * FROM habits WHERE user_id = ?`).all(id).map((h) => ({
    ...h,
    completed: h.completed === 1,
    repeatDays: JSON.parse(h.repeat_days || '[1,2,3,4,5]')
  }));

  // Descriptografa observações pessoais (notes) com AES-256-GCM ao entregar ao titular
  const events = db
    .prepare(`SELECT * FROM events WHERE user_id = ? ORDER BY date ASC, start_time ASC`)
    .all(id)
    .map((e) => ({
      ...e,
      notes: decryptAES256GCM(e.notes || ''),
      allDay: e.all_day === 1,
      completed: e.completed === 1,
      startTime: e.start_time,
      endTime: e.end_time,
      repeat: e.repeat_rule
    }));

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

  const tags = db.prepare(`SELECT * FROM tags WHERE user_id = ? OR user_id = 'global'`).all(id);

  const user = db
    .prepare(
      `SELECT id, username, email, name, avatar, role, is_active, subscription_tier, is_public, streak_days, points, weight, height FROM users WHERE id = ?`
    )
    .get(id);

  res.json({ habits, events, health, tags, user });
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
    habitId,
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

  res.status(201).json({ success: true, id: habitId });
});

// Atualizar Hábito
app.put('/api/user/:id/habit/:habitId', (req, res) => {
  const { id, habitId } = req.params;
  const { current, completed } = req.body;
  db.prepare(`UPDATE habits SET current = ?, completed = ? WHERE id = ? AND user_id = ?`).run(
    current,
    completed ? 1 : 0,
    habitId,
    id
  );
  res.json({ success: true });
});

// Deletar Hábito
app.delete('/api/user/:id/habit/:habitId', (req, res) => {
  const { id, habitId } = req.params;
  db.prepare(`DELETE FROM habits WHERE id = ? AND user_id = ?`).run(habitId, id);
  res.json({ success: true });
});

// Criar Evento (Observações pessoais criptografadas com AES-256-GCM em repouso)
app.post('/api/user/:id/event', (req, res) => {
  const { id } = req.params;
  const event = req.body;
  const eventId = event.id || `ev_${Date.now()}`;
  const encryptedNotes = encryptAES256GCM(event.notes || event.description || '');

  db.prepare(`
    INSERT INTO events (
      id, user_id, title, date, all_day, start_time, end_time,
      category, repeat_rule, location, notes, priority, completed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    eventId,
    id,
    event.title,
    event.date,
    event.allDay ? 1 : 0,
    event.startTime || '09:00',
    event.endTime || '10:00',
    event.category || 'Geral',
    event.repeat || 'Nunca',
    event.location || '',
    encryptedNotes,
    event.priority || 'Média',
    new Date().toISOString()
  );

  res.status(201).json({ success: true, id: eventId });
});

// Toggle Conclusão de Evento
app.put('/api/user/:id/event/:eventId/toggle', (req, res) => {
  const { id, eventId } = req.params;
  const { completed } = req.body;
  db.prepare(`UPDATE events SET completed = ? WHERE id = ? AND user_id = ?`).run(
    completed ? 1 : 0,
    eventId,
    id
  );
  res.json({ success: true });
});

// Deletar Evento
app.delete('/api/user/:id/event/:eventId', (req, res) => {
  const { id, eventId } = req.params;
  db.prepare(`DELETE FROM events WHERE id = ? AND user_id = ?`).run(eventId, id);
  res.json({ success: true });
});

// Criar Nova Categoria / Tema
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

// Remover Tag / Categoria Customizada
app.delete('/api/user/:id/tag/:tagId', (req, res) => {
  const { id, tagId } = req.params;
  db.prepare(`DELETE FROM tags WHERE (id = ? OR name = ?) AND (user_id = ? OR user_id = 'global')`).run(
    tagId,
    tagId,
    id
  );
  res.json({ success: true, message: 'Categoria removida.' });
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

app.get('/api/analytics/:id', async (req, res) => {
  const { id } = req.params;
  // Valida o formato do ID para impedir Command Injection
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    return res.status(400).json({ error: 'Identificador de usuário inválido.' });
  }

  try {
    const fastApiResponse = await fetch(`http://127.0.0.1:8000/analytics/${id}`, {
      signal: AbortSignal.timeout(2000)
    });
    if (fastApiResponse.ok) {
      const data = await fastApiResponse.json();
      return res.json(data);
    }
  } catch (_err) {
    // Fallback para CLI
  }

  execFile(
    'py',
    ['-3.12', '-m', 'engine.cli', id],
    {
      cwd: rootDir,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      maxBuffer: 1024 * 1024 * 10
    },
    (error, stdout, _stderr) => {
      if (error) {
        return res.status(500).json({ error: 'Erro ao calcular telemetria analítica.' });
      }
      try {
        const data = JSON.parse(stdout);
        res.json(data);
      } catch (_parseErr) {
        res.status(500).json({ error: 'Falha ao processar retorno da engine analítica.' });
      }
    }
  );
});

// Registrar Check-in de Hábito (Nota pessoal criptografada com AES-256-GCM)
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
    checkinId,
    id,
    habitId,
    todayStr,
    nowIso,
    value ?? 1.0,
    statusOverride || null,
    encryptAES256GCM(note || ''),
    nowIso
  );

  res.json({ success: true, checkin_id: checkinId });
});

// ==========================================
// 5. PRIVACIDADE (LGPD / GDPR), AUDITORIA E BACKUP CRIPTOGRAFADO
// ==========================================

// LGPD Art. 18, V / GDPR Art. 20: Portabilidade e Exportação Completa dos Dados do Titular
app.get('/api/user/:id/privacy/export', (req, res) => {
  const { id } = req.params;
  const user = db
    .prepare(`SELECT id, username, email, name, role, subscription_tier, created_at FROM users WHERE id = ?`)
    .get(id);
  if (!user) return res.status(404).json({ error: 'Titular não encontrado.' });

  const habits = db.prepare(`SELECT * FROM habits WHERE user_id = ?`).all(id);
  const events = db
    .prepare(`SELECT * FROM events WHERE user_id = ?`)
    .all(id)
    .map((e) => ({ ...e, notes: decryptAES256GCM(e.notes || '') }));
  const health = db.prepare(`SELECT * FROM health WHERE user_id = ?`).get(id);

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'DATA_EXPORT_LGPD',
    actorUserId: id,
    ipAddress: req.ip,
    metadata: { exportedHabits: habits.length, exportedEvents: events.length }
  });

  res.json({
    exportedAt: new Date().toISOString(),
    compliance: 'LGPD (Lei 13.709/2018) & GDPR',
    dataController: 'Ethos Habit & Performance System',
    subject: user,
    habits,
    events,
    health
  });
});

// LGPD Art. 18, VI / GDPR Art. 17: Direito ao Esquecimento e Exclusão Segura da Conta
app.delete('/api/user/:id/privacy/erase', (req, res) => {
  const { id } = req.params;
  if (id === 'usr_admin') {
    return res.status(403).json({ error: 'A conta administrativa principal não pode ser removida.' });
  }

  db.prepare(`DELETE FROM habits WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM events WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM health WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM checkins WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM tags WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM user_sessions WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).run(id);
  const info = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'ACCOUNT_ERASURE_LGPD',
    actorUserId: id,
    ipAddress: req.ip,
    metadata: { erased: info.changes > 0 }
  });

  res.json({
    success: true,
    message: 'Conta e todos os dados pessoais associados foram excluídos permanentemente (LGPD/GDPR).'
  });
});

// Geração de Backup Criptografado com AES-256-GCM
app.post('/api/security/backup', (req, res) => {
  const backupResult = createEncryptedDatabaseBackup(db);
  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'ENCRYPTED_BACKUP_CREATED',
    ipAddress: req.ip,
    metadata: backupResult
  });
  res.json({ success: true, backup: backupResult });
});

// Consulta de Trilha de Auditoria Estruturada (com encadeamento HMAC-SHA256)
app.get('/api/security/audit-logs', (_req, res) => {
  const logs = db
    .prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50`)
    .all()
    .map((l) => ({
      ...l,
      metadata: JSON.parse(l.metadata_json || '{}')
    }));
  res.json({ count: logs.length, logs });
});

// Tratador global de erros (Nunca expõe stack traces ou detalhes internos do banco)
app.use((err, req, res, _next) => {
  logSecurityEvent(db, {
    correlationId: req?.correlationId || crypto.randomUUID(),
    eventType: 'UNHANDLED_API_ERROR',
    ipAddress: req?.ip,
    metadata: { message: err?.message || 'Erro interno' }
  });
  res.status(500).json({
    error: 'Ocorreu um erro interno ao processar sua solicitação.',
    correlationId: req?.correlationId
  });
});

app.listen(PORT, () => {
  console.log(`[Ethos Secure Server] API ativa na porta ${PORT} (scrypt + AES-256-GCM + JWT + RateLimit).`);
});
