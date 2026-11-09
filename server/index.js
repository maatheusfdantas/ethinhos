// Carrega automaticamente variáveis do arquivo .env
try {
  process.loadEnvFile();
} catch (e) {}

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
  createEncryptedDatabaseBackup,
  verifyEmailExistsViaAPI,
  authenticateJWT,
  enforceOwnership,
  requireAdmin
} from './security.js';
import { sendVerificationEmail, sendPasswordResetEmail, formatTokenDisplay } from './emailService.js';
import {
  createAuthToken,
  validateAndConsumeToken,
  maskEmail,
  TOKEN_EXPIRATION
} from './authTokens.js';

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
  process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,https://ethos-3hs.pages.dev,https://ethos-landing-7j3.pages.dev'
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
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      interest TEXT DEFAULT 'Acesso Antecipado Ethos',
      source TEXT DEFAULT 'https://ethos-landing-7j3.pages.dev',
      status TEXT DEFAULT 'pendente',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Dúvida / Uso do Sistema',
      priority TEXT NOT NULL DEFAULT 'Média',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'aberto',
      admin_reply TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
} catch (e) {}
registerGoogleCalendarAuthRoutes(app);

// Rota pública para Lista de Espera da Landing Page (https://ethos-landing-7j3.pages.dev)
app.post('/api/waitlist', (req, res) => {
  const { name, email, phone, interest, source } = req.body || {};
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Informe nome, e-mail e número de telefone.' });
  }
  const id = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const entry = {
    id,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: String(phone).trim(),
    interest: String(interest || 'Acesso Antecipado Ethos').trim(),
    source: String(source || 'https://ethos-landing-7j3.pages.dev').trim(),
    status: 'pendente',
    created_at: nowIso
  };
  try {
    db.prepare(`INSERT INTO waitlist (id, name, email, phone, interest, source, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)`).run(
      entry.id, entry.name, entry.email, entry.phone, entry.interest, entry.source, entry.created_at
    );
  } catch (e) {}
  res.status(201).json({ success: true, entry });
});

// Rotas de Suporte para Usuários
app.get('/api/support/tickets', (req, res) => {
  const userId = req.query.userId || '';
  try {
    const tickets = userId
      ? db.prepare(`SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`).all(userId)
      : db.prepare(`SELECT * FROM support_tickets ORDER BY created_at DESC`).all();
    return res.json({ tickets });
  } catch (e) {
    return res.json({ tickets: [] });
  }
});

app.post('/api/support/tickets', (req, res) => {
  const body = req.body || {};
  const nowIso = new Date().toISOString();
  const ticket = {
    id: body.id || `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
    user_id: String(body.user_id || 'usr_anon'),
    user_name: String(body.user_name || 'Usuário Ethos'),
    user_email: String(body.user_email || 'usuario@ethos.dev'),
    category: String(body.category || 'Dúvida / Uso do Sistema'),
    priority: String(body.priority || 'Média'),
    subject: String(body.subject || 'Solicitação de Suporte'),
    message: String(body.message || ''),
    status: 'aberto',
    admin_reply: '',
    created_at: nowIso,
    updated_at: nowIso
  };
  if (!ticket.subject || !ticket.message) {
    return res.status(400).json({ error: 'Preencha o assunto e a mensagem.' });
  }
  try {
    db.prepare(`
      INSERT INTO support_tickets (id, user_id, user_name, user_email, category, priority, subject, message, status, admin_reply, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberto', '', ?, ?)
    `).run(ticket.id, ticket.user_id, ticket.user_name, ticket.user_email, ticket.category, ticket.priority, ticket.subject, ticket.message, nowIso, nowIso);
  } catch (e) {}
  res.status(201).json({ success: true, ticket });
});

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
  const isAdminLogin = normalizedLogin === 'admin@ethos.local' || normalizedLogin === 'admin.local' || normalizedLogin === 'admin';
  if (!isAdminLogin) {
    const bruteCheck = checkLoginBruteForce(`${req.ip}:${normalizedLogin}`);
    if (!bruteCheck.allowed) {
      logSecurityEvent(db, {
        correlationId: req.correlationId,
        eventType: 'BRUTE_FORCE_LOCKOUT',
        ipAddress: req.ip,
        metadata: { login: normalizedLogin }
      });
      return res.status(429).json({ error: bruteCheck.message });
    }
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

  // Se o usuário ainda não validou a conta (e não é admin), redireciona para a tela de validação de token
  if (user.role !== 'admin' && user.email_verified === 0) {
    return res.json({
      requireVerification: true,
      userId: user.id,
      username: user.username,
      email: user.email,
      maskedEmail: maskEmail(user.email),
      name: user.name,
      message: 'Sua conta aguarda validação. Insira o código recebido por e-mail ou o token de 48h gerado pelo Administrador.'
    });
  }

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

// Endpoint dedicado para verificação em tempo real da existência do e-mail via API externa
app.get('/api/auth/verify-email', authRateLimiter, async (req, res) => {
  const email = String(req.query.email || '').trim();
  const check = await verifyEmailExistsViaAPI(email);
  if (!check.valid) {
    return res.status(422).json({
      valid: false,
      error: check.reason
    });
  }
  return res.json(check);
});

// Cadastro com verificação real de existência de e-mail via API + senha hasheada via scrypt + salt individual
app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'A senha deve possuir pelo menos 6 caracteres.' });
  }

  // Verificação obrigatória de existência do e-mail via APIs externas (Disify + Google DNS MX)
  const emailVerification = await verifyEmailExistsViaAPI(email);
  if (!emailVerification.valid) {
    return res.status(422).json({
      error: emailVerification.reason || 'O e-mail informado não existe ou não pôde ser verificado.'
    });
  }

  const cleanUsername = username?.trim() || email.split('@')[0];

  const checkStmt = db.prepare(`
    SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)
  `);
  const existing = checkStmt.get(email, cleanUsername);
  if (existing) {
    if (existing.email_verified === 0) {
      db.prepare(`UPDATE users SET password = ?, name = ? WHERE id = ?`).run(
        hashPassword(String(password)),
        name.trim(),
        existing.id
      );
      const tokenData = createAuthToken(db, {
        userId: existing.id,
        type: 'email_verification',
        durationMs: TOKEN_EXPIRATION.EMAIL_VERIFICATION_MS,
        preserveExisting: true
      });
      await sendVerificationEmail({
        email: existing.email,
        name: name.trim(),
        token: tokenData.rawToken,
        expiresInMinutes: tokenData.expiresInMinutes
      });
      return res.status(200).json({
        success: true,
        requireVerification: true,
        userId: existing.id,
        username: existing.username,
        email: existing.email,
        maskedEmail: maskEmail(existing.email),
        name: name.trim(),
        avatar: existing.avatar,
        role: existing.role,
        expiresInMinutes: tokenData.expiresInMinutes,
        message: `Conta pendente de validação. Enviamos um novo código para ${maskEmail(existing.email)} (ou utilize o token de 48h gerado pelo Administrador).`
      });
    }
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
      streak_days, points, email_verified, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'user', 1, 'Gratuito', 1, ?, 0, 0, 0, ?)
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

  // Gera o token de verificação seguro e com expiração
  const tokenData = createAuthToken(db, {
    userId: newId,
    type: 'email_verification',
    durationMs: TOKEN_EXPIRATION.EMAIL_VERIFICATION_MS
  });

  // Dispara o e-mail via Resend
  await sendVerificationEmail({
    email: email.trim(),
    name: name.trim(),
    token: tokenData.rawToken,
    expiresInMinutes: tokenData.expiresInMinutes
  });

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'USER_REGISTERED_PENDING_VERIFICATION',
    actorUserId: newId,
    ipAddress: req.ip,
    metadata: { username: cleanUsername, email: email.trim(), expiresInMinutes: tokenData.expiresInMinutes }
  });

  res.status(201).json({
    success: true,
    requireVerification: true,
    userId: newId,
    username: cleanUsername,
    email: email.trim(),
    maskedEmail: maskEmail(email.trim()),
    name: name.trim(),
    avatar: initials,
    role: 'user',
    expiresInMinutes: tokenData.expiresInMinutes,
    message: `Conta criada com sucesso! Enviamos um código de confirmação para ${maskEmail(email.trim())}.`
  });
});

// Endpoint para validar o token de confirmação de e-mail ao criar a conta
app.post('/api/auth/verify-email-token', authRateLimiter, async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ error: 'Informe o e-mail e o código de verificação recebido.' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)`).get(String(email).trim(), String(email).trim());
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const cleanToken = String(token).replace(/\D/g, '') || String(token).trim();

  if (user.email_verified === 1) {
    try {
      db.prepare(`UPDATE users SET validation_token_preview = NULL, validation_token_expires_at = NULL WHERE id = ?`).run(user.id);
    } catch (_e) {}
    const tokens = issueSessionTokens(db, user, req);
    return res.json({
      success: true,
      alreadyVerified: true,
      message: 'Seu e-mail já foi verificado anteriormente!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        permissions: JSON.parse(user.permissions || '{}')
      },
      auth: tokens
    });
  }

  const validation = validateAndConsumeToken(db, {
    userId: user.id,
    type: 'email_verification',
    rawToken: cleanToken
  });

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error || 'Código inválido ou expirado.' });
  }

  // Marca o e-mail do usuário como verificado e limpa token pendente
  try {
    db.prepare(`UPDATE users SET email_verified = 1, validation_token_preview = NULL, validation_token_expires_at = NULL WHERE id = ?`).run(user.id);
  } catch (_e) {
    db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(user.id);
  }

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'EMAIL_VERIFIED_SUCCESS',
    actorUserId: user.id,
    ipAddress: req.ip,
    metadata: { email: user.email }
  });

  const tokens = issueSessionTokens(db, user, req);

  res.json({
    success: true,
    message: 'E-mail validado com sucesso! Bem-vindo ao Ethos.',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}'),
      streak_days: user.streak_days || 0,
      points: user.points || 0
    },
    auth: tokens
  });
});

// Endpoint para reenviar o código de verificação de conta
app.post('/api/auth/resend-verification', authRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(email);
  if (!user) {
    return res.status(404).json({ error: 'Nenhum usuário encontrado com este e-mail.' });
  }

  if (user.email_verified === 1) {
    return res.json({
      success: true,
      alreadyVerified: true,
      message: 'Este e-mail já foi verificado com sucesso.'
    });
  }

  const tokenData = createAuthToken(db, {
    userId: user.id,
    type: 'email_verification',
    durationMs: TOKEN_EXPIRATION.EMAIL_VERIFICATION_MS
  });

  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    token: tokenData.rawToken,
    expiresInMinutes: tokenData.expiresInMinutes
  });

  res.json({
    success: true,
    maskedEmail: maskEmail(user.email),
    expiresInMinutes: tokenData.expiresInMinutes,
    message: `Novo código de verificação enviado com sucesso para ${maskEmail(user.email)}.`
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

// Solicitação de Token de Recuperação de Senha (Resend + Uso Único + Expiração Curta de 15 min + Hash SHA-256)
app.post('/api/auth/forgot-password', authRateLimiter, async (req, res) => {
  const { email, login } = req.body;
  const inputIdentifier = String(email || login || '').trim().toLowerCase();
  if (!inputIdentifier) return res.status(400).json({ error: 'Informe o e-mail ou nome de usuário cadastrado.' });

  const stmt = db.prepare(`SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?`);
  const user = stmt.get(inputIdentifier, inputIdentifier);
  if (!user) return res.status(404).json({ error: 'Nenhum usuário encontrado com esta credencial.' });

  // Cria token criptograficamente seguro e armazena apenas seu hash no banco
  const tokenData = createAuthToken(db, {
    userId: user.id,
    type: 'password_reset',
    durationMs: TOKEN_EXPIRATION.PASSWORD_RESET_MS
  });

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'PASSWORD_RESET_REQUESTED',
    actorUserId: user.id,
    ipAddress: req.ip,
    metadata: { email: user.email, expiresAt: tokenData.expiresAt }
  });

  // Disparo com Resend (HTML responsivo + fallback inteligente de sandbox)
  const emailResult = await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    token: tokenData.rawToken,
    expiresInMinutes: tokenData.expiresInMinutes
  });

  const deliveredTo = emailResult?.targetEmail || user.email;

  // NUNCA expor o token no payload JSON de resposta ao cliente
  res.json({
    success: true,
    maskedEmail: maskEmail(deliveredTo),
    expiresInMinutes: tokenData.expiresInMinutes,
    message: emailResult?.sandboxRedirected
      ? `Código enviado com sucesso para ${maskEmail(deliveredTo)} (Modo Sandbox do Resend: entregue no seu e-mail cadastrado).`
      : `Código de verificação enviado com sucesso para ${maskEmail(deliveredTo)}. Verifique sua caixa de entrada e spam.`
  });
});

// Validação de Token de Uso Único e Redefinição com Hashing scrypt
app.post('/api/auth/reset-password', authRateLimiter, (req, res) => {
  const { email, login, token, newPassword } = req.body;
  const inputIdentifier = String(email || login || '').trim().toLowerCase();
  if (!inputIdentifier || !token || !newPassword) {
    return res.status(400).json({ error: 'Dados incompletos para redefinição de senha.' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'A nova senha deve possuir pelo menos 6 caracteres.' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?`).get(inputIdentifier, inputIdentifier);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  // Valida e consome o token de forma atômica (Single-Use estrito)
  const validation = validateAndConsumeToken(db, {
    userId: user.id,
    type: 'password_reset',
    rawToken: String(token).trim()
  });

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error || 'Código de recuperação inválido ou expirado.' });
  }

  // Atualiza senha com scrypt + salt individual e revoga todas as sessões anteriores
  const newPasswordHash = hashPassword(String(newPassword));
  db.prepare(`UPDATE users SET password = ?, reset_token = NULL WHERE id = ?`).run(newPasswordHash, user.id);
  db.prepare(`UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?`).run(user.id);

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'PASSWORD_CHANGED_AND_SESSIONS_REVOKED',
    actorUserId: user.id,
    ipAddress: req.ip,
    metadata: { email: user.email }
  });

  res.json({
    success: true,
    message: 'Senha redefinida com sucesso! Todas as sessões anteriores foram desconectadas por segurança.'
  });
});

// Proteção Anti-IDOR e Autenticação JWT Obrigatória para todas as rotas de dados do usuário
app.use('/api/user/:id', authenticateJWT, enforceOwnership('id'));
app.use('/api/admin', authenticateJWT, requireAdmin);

// Atualizar Perfil (Sem Mass Assignment de role/permissions)
try {
  db.exec(`ALTER TABLE users ADD COLUMN page_preferences TEXT;`);
} catch (e) {}

app.put('/api/user/:id/profile', (req, res) => {
  const { id } = req.params;
  const { name, bio, avatar, playlists, sharedMetrics, is_public, weight, height, pagePreferences } = req.body;

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      bio = CASE WHEN ? IS NOT NULL THEN ? ELSE bio END,
      avatar = CASE WHEN ? IS NOT NULL THEN ? ELSE avatar END,
      playlists = CASE WHEN ? IS NOT NULL THEN ? ELSE playlists END,
      shared_metrics = CASE WHEN ? IS NOT NULL THEN ? ELSE shared_metrics END,
      is_public = CASE WHEN ? IS NOT NULL THEN ? ELSE is_public END,
      weight = CASE WHEN ? IS NOT NULL THEN ? ELSE weight END,
      height = CASE WHEN ? IS NOT NULL THEN ? ELSE height END,
      page_preferences = CASE WHEN ? IS NOT NULL THEN ? ELSE page_preferences END
    WHERE id = ?
  `).run(
    name || null,
    bio !== undefined ? bio : null,
    bio !== undefined ? bio : null,
    avatar !== undefined ? avatar : null,
    avatar !== undefined ? avatar : null,
    playlists !== undefined ? JSON.stringify(playlists) : null,
    playlists !== undefined ? JSON.stringify(playlists) : null,
    sharedMetrics !== undefined ? JSON.stringify(sharedMetrics) : null,
    sharedMetrics !== undefined ? JSON.stringify(sharedMetrics) : null,
    is_public !== undefined ? (is_public ? 1 : 0) : null,
    is_public !== undefined ? (is_public ? 1 : 0) : null,
    weight !== undefined && weight !== null ? Number(weight) : null,
    weight !== undefined && weight !== null ? Number(weight) : null,
    height !== undefined && height !== null ? Number(height) : null,
    height !== undefined && height !== null ? Number(height) : null,
    pagePreferences ? JSON.stringify(pagePreferences) : null,
    pagePreferences ? JSON.stringify(pagePreferences) : null,
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
             is_public, permissions, streak_days, points, email_verified,
             validation_token_preview, validation_token_expires_at, created_at
      FROM users ORDER BY created_at DESC
    `)
    .all()
    .map((u) => ({
      ...u,
      is_active: u.is_active === 1,
      is_public: u.is_public === 1,
      email_verified: u.email_verified === 1 || u.role === 'admin',
      permissions: JSON.parse(u.permissions || '{}')
    }));
  res.json({ users });
});

app.post('/api/admin/user/:id/generate-token-48h', async (req, res) => {
  const { id } = req.params;
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const tokenData = createAuthToken(db, {
    userId: user.id,
    type: 'email_verification',
    durationMs: TOKEN_EXPIRATION.ADMIN_VALIDATION_48H_MS,
    preserveExisting: true
  });

  try {
    db.prepare(`
      UPDATE users
      SET validation_token_preview = ?, validation_token_expires_at = ?, email_verified = 0
      WHERE id = ?
    `).run(tokenData.rawToken, tokenData.expiresAt, user.id);
  } catch (_e) {}

  const emailResult = await sendVerificationEmail({
    email: user.email,
    name: user.name,
    token: tokenData.rawToken,
    expiresInMinutes: 2880
  });

  logSecurityEvent(db, {
    correlationId: req.correlationId,
    eventType: 'ADMIN_GENERATED_48H_TOKEN',
    actorUserId: req.auth?.sub || 'usr_admin',
    ipAddress: req.ip,
    metadata: { targetUserId: user.id, email: user.email, expiresAt: tokenData.expiresAt }
  });

  res.json({
    success: true,
    token: tokenData.rawToken,
    formattedToken: formatTokenDisplay(tokenData.rawToken),
    expiresAt: tokenData.expiresAt,
    expiresInHours: 48,
    emailSent: Boolean(emailResult?.success),
    sandboxRedirected: Boolean(emailResult?.sandboxRedirected),
    deliveredTo: emailResult?.targetEmail || user.email,
    message: `Token 48h (${formatTokenDisplay(tokenData.rawToken)}) gerado e enviado para ${user.email}!`
  });
});

app.post('/api/admin/user/:id/verify-account', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare(`
      UPDATE users
      SET email_verified = 1, validation_token_preview = NULL, validation_token_expires_at = NULL
      WHERE id = ?
    `).run(id);
    db.prepare(`UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND type = 'email_verification'`).run(id);
  } catch (_e) {
    db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(id);
  }
  res.json({ success: true, email_verified: true });
});

app.post('/api/admin/send-tokens-all', async (req, res) => {
  const allUsers = db.prepare(`SELECT * FROM users WHERE role != 'admin' ORDER BY created_at DESC`).all();
  const dispatched = [];

  for (const user of allUsers) {
    const tokenData = createAuthToken(db, {
      userId: user.id,
      type: 'email_verification',
      durationMs: TOKEN_EXPIRATION.ADMIN_VALIDATION_48H_MS,
      preserveExisting: true
    });

    try {
      db.prepare(`
        UPDATE users
        SET validation_token_preview = ?, validation_token_expires_at = ?
        WHERE id = ?
      `).run(tokenData.rawToken, tokenData.expiresAt, user.id);
    } catch (_e) {}

    const emailResult = await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: tokenData.rawToken,
      expiresInMinutes: 2880
    });

    dispatched.push({
      userId: user.id,
      name: user.name,
      email: user.email,
      token: tokenData.rawToken,
      formattedToken: formatTokenDisplay(tokenData.rawToken),
      expiresAt: tokenData.expiresAt,
      emailSent: Boolean(emailResult?.success),
      deliveredTo: emailResult?.targetEmail || user.email
    });
  }

  res.json({
    success: true,
    count: dispatched.length,
    dispatched
  });
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

app.post('/api/admin/user/:id/role', (req, res) => {
  const { id } = req.params;
  const nextRole = ['user', 'moderator', 'admin'].includes(req.body.role) ? req.body.role : 'user';
  db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(nextRole, id);
  res.json({ success: true, role: nextRole });
});

app.post('/api/admin/user/:id/reset-password', (req, res) => {
  const { id } = req.params;
  const newPassword = String(req.body.newPassword || '');
  if (newPassword.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
  db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hashPassword(newPassword), id);
  res.json({ success: true });
});

app.delete('/api/admin/user/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'usr_admin') return res.status(403).json({ error: 'Conta administrativa principal protegida.' });
  db.prepare(`DELETE FROM habits WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM events WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM health WHERE user_id = ?`).run(id);
  db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  res.json({ success: true });
});

app.get('/api/admin/waitlist', (_req, res) => {
  const waitlist = db.prepare(`SELECT * FROM waitlist ORDER BY created_at DESC`).all();
  res.json({ waitlist });
});

app.delete('/api/admin/waitlist/:id', (req, res) => {
  db.prepare(`DELETE FROM waitlist WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/tickets', (_req, res) => {
  const tickets = db.prepare(`SELECT * FROM support_tickets ORDER BY created_at DESC`).all();
  res.json({ tickets });
});

app.put('/api/admin/tickets/:id', (req, res) => {
  const { id } = req.params;
  const { status, admin_reply } = req.body;
  db.prepare(`
    UPDATE support_tickets SET
      status = COALESCE(?, status),
      admin_reply = COALESCE(?, admin_reply),
      updated_at = ?
    WHERE id = ?
  `).run(status || null, admin_reply !== undefined ? admin_reply : null, new Date().toISOString(), id);
  res.json({ success: true });
});

app.get('/api/admin/logs', (_req, res) => {
  const auditLogs = db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50`).all().map((l) => ({
    id: l.id,
    event_type: l.event_type,
    actor: l.actor_user_id || 'Sistema',
    target: l.metadata_json || '',
    ip: l.ip_address || '127.0.0.1',
    created_at: l.created_at
  }));
  res.json({ auditLogs });
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

  const habits = db.prepare(`SELECT * FROM habits WHERE user_id = ?`).all(id).map((h) => {
    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(h.period_config || '{}');
    } catch (_e) {}

    return {
      ...h,
      subclassId: h.subclass_id || null,
      subclassName: h.subclass_name || null,
      trackingType: h.tracking_type || (h.completion_style === 'numeric' || h.completion_style === 'increment' ? 'counter' : 'done'),
      periodType: h.period_type || 'day',
      periodConfig: parsedConfig,
      completed: h.completed === 1,
      repeatDays: JSON.parse(h.repeat_days || '[1,2,3,4,5]')
    };
  });

  // Descriptografa observações pessoais (notes) com AES-256-GCM ao entregar ao titular
  const events = db
    .prepare(`SELECT * FROM events WHERE user_id = ? ORDER BY date ASC, start_time ASC`)
    .all(id)
    .map((e) => {
      let parsedRepeatConfig = {};
      let parsedReminders = [];
      try { parsedRepeatConfig = JSON.parse(e.repeat_config || '{}'); } catch (_e) {}
      try { parsedReminders = JSON.parse(e.reminders || '[]'); } catch (_e) {}
      return {
        ...e,
        notes: decryptAES256GCM(e.notes || ''),
        allDay: e.all_day === 1,
        completed: e.completed === 1,
        startTime: e.start_time,
        endTime: e.end_time,
        endDate: e.end_date || e.date,
        repeat: e.repeat_rule || 'Nunca',
        repeatConfig: parsedRepeatConfig,
        reminders: parsedReminders,
        bufferBefore: e.buffer_before || 0,
        bufferAfter: e.buffer_after || 0,
        isFloating: e.is_floating === 1,
        energyLevel: e.energy_level || 'deep_focus',
        meetingUrl: e.meeting_url || '',
        visibility: e.visibility || 'private',
        conflictPolicy: e.conflict_policy || 'allow'
      };
    });

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

  const rawCategories = db
    .prepare(`SELECT * FROM categories WHERE user_id = ? OR user_id = 'global'`)
    .all(id);
  const customTags = db
    .prepare(`SELECT * FROM tags WHERE user_id = ? OR user_id = 'global'`)
    .all(id);

  const mergedCatMap = new Map();
  for (const c of [...rawCategories, ...customTags]) {
    if (!mergedCatMap.has(c.id)) {
      const subs = db
        .prepare(`SELECT * FROM subclasses WHERE category_id = ? ORDER BY created_at ASC`)
        .all(c.id)
        .map((s) => {
          let meta = { hours: 0 };
          try {
            meta = JSON.parse(s.metadata || '{"hours":0}');
          } catch (_e) {}
          return {
            id: s.id,
            category_id: s.category_id,
            name: s.name,
            priority: s.priority || 'Média',
            hours: Number(meta.hours || 0),
            metadata: meta
          };
        });

      const members = db
        .prepare(`SELECT * FROM category_members WHERE category_id = ? ORDER BY created_at ASC`)
        .all(c.id)
        .map((m) => ({
          id: m.id,
          category_id: m.category_id,
          user_id: m.user_id,
          email: m.member_email,
          name: m.member_name || (m.member_email ? m.member_email.split('@')[0] : 'Membro'),
          role: m.role || 'collaborator'
        }));

      mergedCatMap.set(c.id, {
        id: c.id,
        user_id: c.user_id,
        name: c.name,
        color: c.color,
        bg: c.bg,
        icon: c.icon || 'Bookmark',
        is_shared: Boolean(c.is_shared),
        has_subclasses: Boolean(c.has_subclasses) && subs.length > 0,
        subclasses: subs,
        members
      });
    }
  }

  const tags = Array.from(mergedCatMap.values());

  let badHabits = [];
  try {
    badHabits = db.prepare(`SELECT * FROM bad_habits WHERE user_id = ? ORDER BY created_at DESC`).all(id).map((bh) => {
      const relapses = db.prepare(`SELECT * FROM bad_habit_relapses WHERE bad_habit_id = ? ORDER BY relapsed_at DESC`).all(bh.id);
      return {
        ...bh,
        relapses
      };
    });
  } catch (e) {}

  const user = db
    .prepare(
      `SELECT id, username, email, name, avatar, bio, playlists, shared_metrics, role, is_active, subscription_tier, is_public, streak_days, points, weight, height, page_preferences FROM users WHERE id = ?`
    )
    .get(id);

  let pagePreferences = null;
  let parsedPlaylists = [];
  let parsedSharedMetrics = {};
  if (user?.page_preferences) {
    try { pagePreferences = JSON.parse(user.page_preferences); } catch (e) {}
  }
  if (user?.playlists) {
    try { parsedPlaylists = JSON.parse(user.playlists); } catch (e) {}
  }
  if (user?.shared_metrics) {
    try { parsedSharedMetrics = JSON.parse(user.shared_metrics); } catch (e) {}
  }

  res.json({ 
    habits, 
    badHabits, 
    events, 
    health, 
    tags, 
    categories: tags, 
    user: user ? { 
      ...user, 
      pagePreferences,
      playlists: parsedPlaylists,
      sharedMetrics: parsedSharedMetrics
    } : null 
  });
});

// ==========================================
// ENDPOINTS DE MAUS HÁBITOS & VÍCIOS (SOBRIEDADE)
// ==========================================
app.post('/api/user/:id/bad-habit', (req, res) => {
  const { id } = req.params;
  const { title, category, icon_name, started_at, cost_per_day, motivational_reason, impact_description } = req.body;
  if (!title) return res.status(400).json({ error: 'Título é obrigatório.' });

  const habitId = `bh_${Date.now()}`;
  db.prepare(`
    INSERT INTO bad_habits (id, user_id, title, category, icon_name, started_at, cost_per_day, motivational_reason, impact_description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    habitId,
    id,
    title.trim(),
    category || 'Superação Pessoal',
    icon_name || 'ShieldOff',
    started_at || new Date().toISOString(),
    parseFloat(cost_per_day) || 0,
    motivational_reason || '',
    impact_description || 'Melhora progressiva da clareza mental e foco.',
    new Date().toISOString()
  );

  res.json({ success: true, id: habitId });
});

app.delete('/api/user/:id/bad-habit/:habitId', (req, res) => {
  const { id, habitId } = req.params;
  db.prepare(`DELETE FROM bad_habits WHERE id = ? AND user_id = ?`).run(habitId, id);
  db.prepare(`DELETE FROM bad_habit_relapses WHERE bad_habit_id = ? AND user_id = ?`).run(habitId, id);
  res.json({ success: true });
});

app.post('/api/user/:id/bad-habit/:habitId/relapse', (req, res) => {
  const { id, habitId } = req.params;
  const { trigger, lesson, days_achieved } = req.body;

  const relapseId = `rel_${Date.now()}`;
  db.prepare(`
    INSERT INTO bad_habit_relapses (id, bad_habit_id, user_id, relapsed_at, days_achieved, trigger, lesson, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    relapseId,
    habitId,
    id,
    new Date().toISOString(),
    parseInt(days_achieved) || 0,
    trigger || 'Estresse',
    lesson || '',
    new Date().toISOString()
  );

  // Reinicia o contador para agora e incrementa contagem de recaída
  db.prepare(`
    UPDATE bad_habits SET
      started_at = ?,
      relapse_count = relapse_count + 1
    WHERE id = ? AND user_id = ?
  `).run(new Date().toISOString(), habitId, id);

  res.json({ success: true });
});

// Criar Hábito
app.post('/api/user/:id/habit', (req, res) => {
  const { id } = req.params;
  const habit = req.body;
  const habitId = habit.id || `hab_${Date.now()}`;
  const trackingType = habit.trackingType || (habit.completionStyle === 'numeric' || habit.completionStyle === 'increment' ? 'counter' : 'done');
  const periodType = habit.periodType || 'day';
  const periodConfig = typeof habit.periodConfig === 'object' ? JSON.stringify(habit.periodConfig) : (habit.periodConfig || '{}');

  db.prepare(`
    INSERT INTO habits (
      id, user_id, title, category, icon_name, target, current,
      unit, effort, priority, tag_id, subclass_id, subclass_name,
      repeat_days, completed, completion_style, tracking_type, period_type, period_config, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    habit.subclassId || null,
    habit.subclassName || null,
    JSON.stringify(habit.repeatDays || [1, 2, 3, 4, 5]),
    habit.completed ? 1 : 0,
    habit.completionStyle || (trackingType === 'counter' ? 'increment' : 'quick'),
    trackingType,
    periodType,
    periodConfig,
    new Date().toISOString()
  );

  res.status(201).json({ success: true, id: habitId });
});

// Atualizar Hábito (com suporte opcional a sub-classe coringa no dia)
app.put('/api/user/:id/habit/:habitId', (req, res) => {
  const { id, habitId } = req.params;
  const { current, completed, subclassId, subclassName } = req.body;
  db.prepare(`
    UPDATE habits SET
      current = ?,
      completed = ?,
      subclass_id = COALESCE(?, subclass_id),
      subclass_name = COALESCE(?, subclass_name)
    WHERE id = ? AND user_id = ?
  `).run(
    current,
    completed ? 1 : 0,
    subclassId !== undefined ? subclassId : null,
    subclassName !== undefined ? subclassName : null,
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
      id, user_id, title, date, end_date, all_day, start_time, end_time,
      category, subclass_id, subclass_name, author_name,
      repeat_rule, repeat_config, reminders, buffer_before, buffer_after,
      is_floating, energy_level, meeting_url, visibility, conflict_policy,
      location, notes, priority, completed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    eventId,
    id,
    event.title,
    event.date,
    event.endDate || event.date,
    event.allDay ? 1 : 0,
    event.startTime || '09:00',
    event.endTime || '10:00',
    event.category || 'Geral',
    event.subclassId || null,
    event.subclassName || null,
    event.authorName || null,
    event.repeat || 'Nunca',
    JSON.stringify(event.repeatConfig || {}),
    JSON.stringify(event.reminders || []),
    Number(event.bufferBefore) || 0,
    Number(event.bufferAfter) || 0,
    event.isFloating ? 1 : 0,
    event.energyLevel || 'deep_focus',
    event.meetingUrl || '',
    event.visibility || 'private',
    event.conflictPolicy || 'allow',
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

// Passo A: Criação Rápida de Categoria (Nasce puramente Básica: is_shared = false, has_subclasses = false)
app.post('/api/user/:id/tag', (req, res) => {
  const { id } = req.params;
  const { id: customId, name, color, bg, icon } = req.body;
  const tagId = customId || `tag_${Date.now()}`;
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO categories (id, user_id, name, color, bg, icon, is_shared, has_subclasses, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).run(tagId, id, name, color, bg || 'rgba(129, 140, 248, 0.15)', icon || 'Bookmark', nowIso);

  db.prepare(`
    INSERT OR REPLACE INTO tags (id, user_id, name, color, bg, icon, is_shared, has_subclasses)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0)
  `).run(tagId, id, name, color, bg || 'rgba(129, 140, 248, 0.15)', icon || 'Bookmark');

  res.status(201).json({
    success: true,
    tag: {
      id: tagId,
      user_id: id,
      name,
      color,
      bg: bg || 'rgba(129, 140, 248, 0.15)',
      icon: icon || 'Bookmark',
      is_shared: false,
      has_subclasses: false,
      subclasses: [],
      members: []
    }
  });
});

// Passo B & Passo D: Evolução para Configuração Avançada de Categoria (Sub-classes + Compartilhamento + Restrição Antibug)
app.put('/api/user/:id/category/:catId/config', (req, res) => {
  const { id, catId } = req.params;
  const { name, color, bg, icon, is_shared, has_subclasses, subclasses = [], members = [] } = req.body;

  // Restrição Antibug: impede que existam sub-classes vazias caso has_subclasses esteja ativo
  if (has_subclasses && (!Array.isArray(subclasses) || subclasses.length === 0)) {
    return res.status(400).json({
      error: 'Restrição Antibug: Para ativar Sub-classes / Matérias, é obrigatório cadastrar pelo menos 1 sub-classe.'
    });
  }

  const nowIso = new Date().toISOString();
  const existingCat = db.prepare(`SELECT * FROM categories WHERE id = ? OR name = ?`).get(catId, name || catId);
  const resolvedId = existingCat?.id || catId;

  if (existingCat) {
    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        color = COALESCE(?, color),
        bg = COALESCE(?, bg),
        icon = COALESCE(?, icon),
        is_shared = ?,
        has_subclasses = ?
      WHERE id = ?
    `).run(name || null, color || null, bg || null, icon || null, is_shared ? 1 : 0, has_subclasses ? 1 : 0, resolvedId);
  } else {
    db.prepare(`
      INSERT INTO categories (id, user_id, name, color, bg, icon, is_shared, has_subclasses, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resolvedId,
      id,
      name || resolvedId,
      color || '#818cf8',
      bg || 'rgba(129, 140, 248, 0.15)',
      icon || 'Bookmark',
      is_shared ? 1 : 0,
      has_subclasses ? 1 : 0,
      nowIso
    );
  }

  // Sincroniza Subclasses da categoria
  db.prepare(`DELETE FROM subclasses WHERE category_id = ?`).run(resolvedId);
  for (const sub of subclasses) {
    if (!sub?.name?.trim()) continue;
    const subId = sub.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const metaJson = JSON.stringify({ hours: Number(sub.hours || sub.metadata?.hours || 0) });
    db.prepare(`
      INSERT INTO subclasses (id, category_id, name, priority, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(subId, resolvedId, sub.name.trim(), sub.priority || 'Média', metaJson, nowIso);
  }

  // Sincroniza Category_Members (Modo Colaborativo)
  db.prepare(`DELETE FROM category_members WHERE category_id = ?`).run(resolvedId);
  for (const mem of members) {
    if (!mem?.email?.trim() && !mem?.name?.trim()) continue;
    const memId = mem.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO category_members (id, category_id, user_id, member_email, member_name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      memId,
      resolvedId,
      mem.user_id || `usr_${(mem.email || mem.name).toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      (mem.email || '').trim().toLowerCase(),
      (mem.name || mem.email?.split('@')[0] || 'Colaborador').trim(),
      mem.role || 'collaborator',
      nowIso
    );
  }

  res.json({
    success: true,
    categoryId: resolvedId,
    is_shared: Boolean(is_shared),
    has_subclasses: Boolean(has_subclasses)
  });
});

// Passo C & E: Registrar horas/esforço em Sub-classe (Pomodoro ou Hábito Coringa) para Drill-Down Analítico
app.post('/api/user/:id/category/:catId/log-effort', (req, res) => {
  const { catId } = req.params;
  const { subclassId, subclassName, hoursDelta = 0.5 } = req.body;

  if (subclassId || subclassName) {
    const subRow = db
      .prepare(`SELECT * FROM subclasses WHERE (id = ? OR LOWER(name) = LOWER(?)) AND category_id = ?`)
      .get(subclassId || '', subclassName || '', catId);

    if (subRow) {
      let meta = { hours: 0 };
      try {
        meta = JSON.parse(subRow.metadata || '{"hours":0}');
      } catch (_e) {}
      meta.hours = Number((Number(meta.hours || 0) + Number(hoursDelta || 0.5)).toFixed(2));
      db.prepare(`UPDATE subclasses SET metadata = ? WHERE id = ?`).run(JSON.stringify(meta), subRow.id);
    }
  }

  res.json({ success: true });
});

// Remover Tag / Categoria Customizada
app.delete('/api/user/:id/tag/:tagId', (req, res) => {
  const { id, tagId } = req.params;
  db.prepare(`DELETE FROM tags WHERE (id = ? OR name = ?) AND (user_id = ? OR user_id = 'global')`).run(
    tagId,
    tagId,
    id
  );
  db.prepare(`DELETE FROM categories WHERE (id = ? OR name = ?) AND (user_id = ? OR user_id = 'global')`).run(
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


// ==========================================
// ENDPOINTS DE COMUNIDADE & CONEXÕES (@HANDLE)
// ==========================================

// Buscar usuários na rede por @username ou nome
app.get('/api/community/users', authenticateJWT, (req, res) => {
  const currentUserId = req.user?.id || '';
  const q = (req.query.q || '').trim().replace(/^@/, '');

  let users = [];
  if (q) {
    users = db.prepare(`
      SELECT id, username, name, avatar, bio, streak_days, points 
      FROM users 
      WHERE (LOWER(username) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?)) 
        AND id != ?
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`, currentUserId);
  } else {
    users = db.prepare(`
      SELECT id, username, name, avatar, bio, streak_days, points 
      FROM users 
      WHERE id != ?
      ORDER BY streak_days DESC, points DESC
      LIMIT 15
    `).all(currentUserId);
  }

  const enriched = users.map(u => {
    const friendRow = db.prepare(`SELECT status FROM friends WHERE user_id = ? AND friend_id = ?`).get(currentUserId, u.id);
    return {
      ...u,
      status: friendRow?.status || 'none'
    };
  });

  res.json({ users: enriched });
});

// Listar conexões ativas e solicitações do usuário
app.get('/api/user/:id/connections', (req, res) => {
  const { id } = req.params;
  const connections = db.prepare(`
    SELECT f.id, f.friend_id, f.friend_name, f.friend_avatar, f.friend_bio, f.friend_username, f.status,
           u.streak_days, u.points
    FROM friends f
    LEFT JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ?
  `).all(id);

  res.json({ connections });
});

// Enviar solicitação de conexão via @username ou ID
app.post('/api/user/:id/connect', (req, res) => {
  const { id } = req.params;
  const { targetUserId, targetUsername } = req.body;

  let target = null;
  if (targetUserId) {
    target = db.prepare(`SELECT id, username, name, avatar, bio FROM users WHERE id = ?`).get(targetUserId);
  } else if (targetUsername) {
    const cleanU = targetUsername.trim().replace(/^@/, '');
    target = db.prepare(`SELECT id, username, name, avatar, bio FROM users WHERE LOWER(username) = LOWER(?)`).get(cleanU);
  }

  if (!target) {
    return res.status(404).json({ error: 'Usuário não encontrado na rede Ethos.' });
  }

  if (target.id === id) {
    return res.status(400).json({ error: 'Você não pode conectar consigo mesmo.' });
  }

  const currentUser = db.prepare(`SELECT id, username, name, avatar, bio FROM users WHERE id = ?`).get(id);

  const c1Id = `conn_${id}_${target.id}`;
  const c2Id = `conn_${target.id}_${id}`;

  db.prepare(`
    INSERT INTO friends (id, user_id, friend_id, friend_name, friend_avatar, friend_bio, friend_username, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_sent')
    ON CONFLICT(id) DO UPDATE SET status = 'pending_sent'
  `).run(c1Id, id, target.id, target.name, target.avatar, target.bio || '', target.username);

  db.prepare(`
    INSERT INTO friends (id, user_id, friend_id, friend_name, friend_avatar, friend_bio, friend_username, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_received')
    ON CONFLICT(id) DO UPDATE SET status = 'pending_received'
  `).run(c2Id, target.id, id, currentUser?.name || 'Usuário', currentUser?.avatar || 'U', currentUser?.bio || '', currentUser?.username || '');

  res.json({ success: true, target });
});

// Aceitar solicitação de conexão
app.put('/api/user/:id/connect/:targetId/accept', (req, res) => {
  const { id, targetId } = req.params;

  db.prepare(`UPDATE friends SET status = 'approved' WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`).run(id, targetId, targetId, id);

  const targetUser = db.prepare(`SELECT id, name, avatar, username FROM users WHERE id = ?`).get(targetId);
  const currentUser = db.prepare(`SELECT id, name, avatar, username FROM users WHERE id = ?`).get(id);

  if (targetUser && currentUser) {
    const feedId = `feed_${Date.now()}`;
    db.prepare(`
      INSERT INTO feed (id, user_id, user_name, user_avatar, type, title, details, timestamp)
      VALUES (?, ?, ?, ?, 'friendship', 'Nova Conexão no Ethos', ?, 'Agora mesmo')
    `).run(feedId, id, currentUser.name, currentUser.avatar, `Agora é amigo de @${targetUser.username || targetUser.name}!`);
  }

  res.json({ success: true });
});

// Recusar / Remover conexão
app.delete('/api/user/:id/connect/:targetId', (req, res) => {
  const { id, targetId } = req.params;
  db.prepare(`DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`).run(id, targetId, targetId, id);
  res.json({ success: true });
});

// Feed Social da Comunidade
app.get('/api/user/:id/feed', (req, res) => {
  const { id } = req.params;
  const feedItems = db.prepare(`
    SELECT f.* FROM feed f
    WHERE f.user_id = ? 
       OR f.user_id IN (SELECT friend_id FROM friends WHERE user_id = ? AND status = 'approved')
    ORDER BY f.rowid DESC
    LIMIT 30
  `).all(id, id).map(item => {
    let reactions = { like: 0, fire: 0, trophy: 0 };
    try { reactions = JSON.parse(item.reactions || '{}'); } catch(e){}
    return {
      ...item,
      reactions,
      userName: item.user_name,
      userAvatar: item.user_avatar,
      userId: item.user_id
    };
  });

  res.json({ feed: feedItems });
});

// Publicar no feed
app.post('/api/user/:id/feed', (req, res) => {
  const { id } = req.params;
  const { type, title, details } = req.body;
  const user = db.prepare(`SELECT name, avatar FROM users WHERE id = ?`).get(id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const feedId = `feed_${Date.now()}`;
  db.prepare(`
    INSERT INTO feed (id, user_id, user_name, user_avatar, type, title, details, timestamp, reactions)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Agora mesmo', '{"like":0,"fire":0,"trophy":0}')
  `).run(feedId, id, user.name, user.avatar, type || 'focus_completed', title || 'Atividade Concluída', details || '');

  res.json({ success: true, id: feedId });
});
