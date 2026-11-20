/**
 * Health check e autenticação (login, cadastro, verificação, refresh, recuperação de senha).
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

import { checkBruteForceEdge, recordAuditLogEdge } from '../_lib/audit.js';
import { CODE_LOCKED_MESSAGE, TOO_MANY_CODES_MESSAGE, generateCode6, invalidateCodes, registerCodeFailure, tooManyCodeRequests } from '../_lib/codes.js';
import { hashPasswordEdge, signJwtEdge, verifyJwtEdge, verifyPasswordEdge } from '../_lib/auth.js';
import { ALL_PERMS } from '../_lib/constants.js';
import { verifyEmailExistsViaAPI } from '../_lib/email-verify.js';
import { maskEmailEdge, sendPasswordResetEmailEdge, sendVerificationEmailEdge, sha256Hex } from '../_lib/email.js';
import { jsonResponse } from '../_lib/http.js';
import { normalizeUsername, passwordProblem, usernameProblem } from '../../../src/domain/credentials.js';
import { validateEmail, validatePersonName } from '../../../src/domain/validation.js';

/** Devolve a Response da rota correspondente, ou null se nenhuma rota deste domínio casar. */
export async function handleAuthRoutes(ctx) {
  const { request, env, correlationId, clientIp, userAgent, url, pathname, method, body, storage } = ctx;

  // --------------------------------------------------------------------------
  // HEALTH CHECK DE SEGURANÇA (`/api/health`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/health' && method === 'GET') {
    return jsonResponse(
      {
        status: 'ok',
        platform: 'Cloudflare Pages Functions + D1 SQL',
        databaseMode: storage.mode,
        security: {
          jwtHmacSha256: true,
          antiIdorEnforced: true,
          bruteForceLockout: true,
          emailVerificationApi: 'Disify + Google DNS-over-HTTPS MX',
          xssSanitization: true
        }
      },
      200,
      correlationId,
      request
    );
  }

  // --------------------------------------------------------------------------
  // VERIFICAÇÃO DE E-MAIL EM TEMPO REAL VIA API (`/api/auth/verify-email`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/verify-email' && method === 'GET') {
    const email = url.searchParams.get('email') || '';
    const check = await verifyEmailExistsViaAPI(email);
    if (!check.valid) {
      return jsonResponse({ valid: false, error: check.reason }, 422, correlationId, request);
    }
    return jsonResponse(check, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // LOGIN COM PROTEÇÃO BRUTE FORCE E EMISSÃO DE JWT ASSINADO (`/api/auth/login`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/login' && method === 'POST') {
    const login = String(body.login || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!login || !password) {
      return jsonResponse({ error: 'Informe e-mail/usuário e senha.' }, 400, correlationId, request);
    }

    // Proteção contra força bruta vale para TODAS as contas, inclusive o admin
    // (a conta mais valiosa não pode aceitar tentativas ilimitadas).
    const bruteCheck = await checkBruteForceEdge(storage, clientIp, login);
    if (!bruteCheck.allowed) {
      await recordAuditLogEdge(storage, {
        eventType: 'BRUTE_FORCE_LOCKED',
        userId: login,
        ipAddress: clientIp,
        userAgent,
        metadata: { login },
        correlationId
      });
      return jsonResponse({ error: bruteCheck.message }, 429, correlationId, request);
    }

    let user = null;
    if (storage.mode === 'd1') {
      user = await storage.db
        .prepare(`SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?`)
        .bind(login, login)
        .first();

    } else {
      for (const u of storage.store.users.values()) {
        if (u.username.toLowerCase() === login || u.email.toLowerCase() === login) {
          user = u;
          break;
        }
      }
    }

    if (!user || !(await verifyPasswordEdge(password, user.password))) {
      await recordAuditLogEdge(storage, {
        eventType: 'LOGIN_FAILED',
        userId: login,
        ipAddress: clientIp,
        userAgent,
        metadata: { login },
        correlationId
      });
      return jsonResponse({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' }, 401, correlationId, request);
    }

    if (user.is_active === 0) {
      return jsonResponse({ error: 'Conta desativada pelo Administrador.' }, 403, correlationId, request);
    }

    if (user.role !== 'admin' && user.email_verified === 0) {
      return jsonResponse(
        {
          requireVerification: true,
          userId: user.id,
          username: user.username,
          email: user.email,
          maskedEmail: maskEmailEdge(user.email),
          name: user.name,
          message: 'Sua conta aguarda validação. Insira o código recebido por e-mail ou o token de 48h gerado pelo Administrador.'
        },
        200,
        correlationId,
        request
      );
    }

    await recordAuditLogEdge(storage, {
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      ipAddress: clientIp,
      userAgent,
      metadata: { username: user.username, role: user.role, login },
      correlationId
    });

    const accessToken = await signJwtEdge(
      { sub: user.id, username: user.username, role: user.role },
      env,
      3600
    );
    const refreshToken = await signJwtEdge(
      { sub: user.id, username: user.username, role: user.role, type: 'refresh' },
      env,
      7 * 24 * 3600
    );

    return jsonResponse(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        is_active: user.is_active === 1,
        subscription_tier: user.subscription_tier,
        is_public: user.is_public === 1,
        permissions: JSON.parse(user.permissions || ALL_PERMS),
        streak_days: user.streak_days,
        points: user.points,
        weight: user.weight || 70.0,
        height: user.height || 1.75,
        auth: {
          accessToken,
          refreshToken,
          expiresIn: 3600
        }
      },
      200,
      correlationId,
      request
    );
  }

  // --------------------------------------------------------------------------
  // CADASTRO COM VERIFICAÇÃO DE E-MAIL VIA API (`/api/auth/register`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/username-available' && method === 'GET') {
    const candidate = normalizeUsername(url.searchParams.get('u'));
    const issue = usernameProblem(candidate);
    if (issue) return jsonResponse({ available: false, reason: issue }, 200, correlationId, request);
    let taken = false;
    if (storage.mode === 'd1') {
      taken = Boolean(await storage.db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').bind(candidate).first());
    } else {
      for (const u of storage.store.users.values()) if (String(u.username).toLowerCase() === candidate) taken = true;
    }
    return jsonResponse(taken ? { available: false, reason: 'Esse @ já está em uso.' } : { available: true }, 200, correlationId, request);
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    let { name, email } = body;
    const { username, password } = body;
    if (!name || !email || !password || !username) {
      return jsonResponse({ error: 'Preencha nome, e-mail, @ e senha.' }, 400, correlationId, request);
    }
    // Correção C: nome só com letras; e-mail com formato válido e sem espaços (validação no servidor).
    { const c = validatePersonName(name); if (c.error) return jsonResponse({ error: c.error, field: 'name' }, 400, correlationId, request); name = c.value; }
    { const c = validateEmail(email); if (c.error) return jsonResponse({ error: c.error, field: 'email' }, 400, correlationId, request); email = c.value; }

    const usernameIssue = usernameProblem(username);
    if (usernameIssue) {
      return jsonResponse({ error: usernameIssue, field: 'username' }, 400, correlationId, request);
    }
    const passwordIssue = passwordProblem(password);
    if (passwordIssue) {
      return jsonResponse({ error: passwordIssue, field: 'password' }, 400, correlationId, request);
    }
    if (body.passwordConfirm !== undefined && body.passwordConfirm !== password) {
      return jsonResponse({ error: 'As senhas não coincidem.', field: 'passwordConfirm' }, 400, correlationId, request);
    }

    // 1. Verifica na API externa se o e-mail e o servidor MX realmente existem
    const emailVerification = await verifyEmailExistsViaAPI(email);
    if (!emailVerification.valid) {
      return jsonResponse(
        { error: emailVerification.reason || 'O e-mail informado não existe ou é inválido.' },
        422,
        correlationId,
        request
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = normalizeUsername(username);

    // 2. Duplicidade. E-mail e @ são checados separadamente para a mensagem ser precisa.
    //    Conta com o mesmo e-mail ainda não confirmada: só reenvia o código. A senha salva
    //    NÃO é trocada (antes era, o que permitia sequestrar uma conta pendente).
    if (storage.mode === 'd1') {
      const existing = await storage.db
        .prepare(`SELECT * FROM users WHERE LOWER(email) = ?`)
        .bind(cleanEmail)
        .first();
      if (!existing) {
        const usernameTaken = await storage.db
          .prepare(`SELECT id FROM users WHERE LOWER(username) = ?`)
          .bind(cleanUsername)
          .first();
        if (usernameTaken) {
          return jsonResponse({ error: 'Esse @ já está em uso. Escolha outro.', field: 'username' }, 409, correlationId, request);
        }
      }
      if (existing) {
        if (existing.email_verified === 0) {
          if (await tooManyCodeRequests(storage, existing.id, 'email_verification')) {
            return jsonResponse({ error: TOO_MANY_CODES_MESSAGE }, 429, correlationId, request);
          }
          const nowIso = new Date().toISOString();
          await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND type = \'email_verification\' AND used = 0 AND id NOT LIKE \'tok_48h_%\'').bind(existing.id).run();
          const rawToken = generateCode6();
          const tokenHash = await sha256Hex(rawToken);
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await storage.db.prepare(
            'INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at, used, created_at) VALUES (?, ?, ?, \'email_verification\', ?, 0, ?)'
          ).bind(`tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, existing.id, tokenHash, expiresAt, nowIso).run();
          await sendVerificationEmailEdge(env, {
            email: existing.email,
            name: name.trim(),
            token: rawToken,
            expiresInMinutes: 1440
          });
          return jsonResponse(
            {
              success: true,
              requireVerification: true,
              userId: existing.id,
              username: existing.username,
              email: existing.email,
              maskedEmail: maskEmailEdge(existing.email),
              name: name.trim(),
              avatar: existing.avatar,
              role: existing.role,
              expiresInMinutes: 1440,
              message: `Sua conta aguarda validação. Enviamos um novo código para ${maskEmailEdge(existing.email)} (ou utilize o token de 48h gerado pelo Administrador).`
            },
            200,
            correlationId,
            request
          );
        }
        return jsonResponse({ error: 'Já existe uma conta com esse e-mail. Entre ou recupere a senha.', field: 'email' }, 409, correlationId, request);
      }
    }

    const initials = name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || 'EU';
    const newId = `usr_${Date.now()}`;
    const hashed = await hashPasswordEdge(password);
    const nowIso = new Date().toISOString();

    if (storage.mode === 'd1') {
      await storage.db
        .prepare(
          `INSERT INTO users (id, username, email, password, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, 'user', 1, 'Gratuito', 1, ?, 0, 0, 0, ?)`
        )
        .bind(newId, cleanUsername, cleanEmail, hashed, name.trim(), initials, ALL_PERMS, nowIso)
        .run();
    } else {
      storage.store.users.set(newId, {
        id: newId,
        username: cleanUsername,
        email: cleanEmail,
        password: hashed,
        name: name.trim(),
        avatar: initials,
        role: 'user',
        is_active: 1,
        subscription_tier: 'Gratuito',
        is_public: 1,
        permissions: ALL_PERMS,
        streak_days: 0,
        points: 0,
        email_verified: 0
      });
    }

    // Gera token de confirmação de e-mail OTP de 6 dígitos
    const rawToken = generateCode6();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    if (storage.mode === 'd1') {
      await storage.db.prepare(
        'INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at, used, created_at) VALUES (?, ?, ?, \'email_verification\', ?, 0, ?)'
      ).bind(`tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, newId, tokenHash, expiresAt, nowIso).run();
    }

    // Dispara e-mail com template responsivo via Resend
    await sendVerificationEmailEdge(env, {
      email: cleanEmail,
      name: name.trim(),
      token: rawToken,
      expiresInMinutes: 1440
    });

    await recordAuditLogEdge(storage, {
      eventType: 'USER_REGISTERED_PENDING_VERIFICATION',
      userId: newId,
      ipAddress: clientIp,
      userAgent,
      metadata: { email: cleanEmail, mxServer: emailVerification.mxServer },
      correlationId
    });

    return jsonResponse(
      {
        success: true,
        requireVerification: true,
        userId: newId,
        username: cleanUsername,
        email: cleanEmail,
        maskedEmail: maskEmailEdge(cleanEmail),
        name: name.trim(),
        avatar: initials,
        role: 'user',
        expiresInMinutes: 1440,
        message: `Conta criada com sucesso! Enviamos um código de confirmação para ${maskEmailEdge(cleanEmail)}.`
      },
      201,
      correlationId,
      request
    );
  }

  // --------------------------------------------------------------------------
  // VALIDAÇÃO DE TOKEN DE CONFIRMAÇÃO DE E-MAIL (`/api/auth/verify-email-token`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/verify-email-token' && method === 'POST') {
    const email = String(body.email || body.login || '').trim().toLowerCase();
    const rawInputToken = String(body.token || '').trim();
    const token = rawInputToken.replace(/\D/g, '') || rawInputToken;

    if (!email || !token) {
      return jsonResponse({ error: 'Informe o e-mail e o código de verificação recebido.' }, 400, correlationId, request);
    }

    let user = null;
    if (storage.mode === 'd1') {
      user = await storage.db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?').bind(email, email).first();
    } else {
      for (const u of storage.store.users.values()) {
        if (u.email.toLowerCase() === email || u.username.toLowerCase() === email) { user = u; break; }
      }
    }

    if (!user) {
      return jsonResponse({ error: 'Usuário não encontrado.' }, 404, correlationId, request);
    }

    // SEGURANÇA (auditoria 15/11/2026, S1): conta já verificada NÃO recebe sessão por esta rota.
    // Antes, qualquer código servia aqui e a resposta trazia tokens (entrada sem senha). Para entrar: login com senha.
    if (user.email_verified === 1) {
      return jsonResponse({
        success: true,
        alreadyVerified: true,
        message: 'Seu e-mail já está confirmado. Entre com sua senha.'
      }, 200, correlationId, request);
    }

    const candidateHash = await sha256Hex(token);
    const nowIso = new Date().toISOString();
    let validToken = false;

    if (storage.mode === 'd1') {
      const record = await storage.db.prepare(
        'SELECT * FROM auth_tokens WHERE user_id = ? AND type = \'email_verification\' AND token_hash = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
      ).bind(user.id, candidateHash).first();

      if (record) {
        if (record.expires_at < nowIso) {
          await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE id = ?').bind(record.id).run();
          return jsonResponse({ error: 'Código de verificação expirado. Solicite um novo código.' }, 400, correlationId, request);
        }
        validToken = true;
        await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND type = \'email_verification\'').bind(user.id).run();
        try {
          await storage.db.prepare('UPDATE users SET email_verified = 1, validation_token_preview = NULL, validation_token_expires_at = NULL WHERE id = ?').bind(user.id).run();
        } catch (_e) {
          await storage.db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(user.id).run();
        }
      } else if (user.validation_token_preview && String(user.validation_token_preview).replace(/\D/g, '') === token) {
        if (!user.validation_token_expires_at || user.validation_token_expires_at > nowIso) {
          validToken = true;
          try {
            await storage.db.prepare('UPDATE users SET email_verified = 1, validation_token_preview = NULL, validation_token_expires_at = NULL WHERE id = ?').bind(user.id).run();
          } catch (_e) {
            await storage.db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(user.id).run();
          }
          try {
            await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND type = \'email_verification\'').bind(user.id).run();
          } catch (_e) {}
        }
      }
    } else {
      validToken = true;
      user.email_verified = 1;
    }

    if (!validToken) {
      const { locked } = await registerCodeFailure(storage, { userId: user.id, type: 'email_verification', ipAddress: clientIp, userAgent, correlationId });
      return jsonResponse({ error: locked ? CODE_LOCKED_MESSAGE : 'Código de verificação incorreto ou já utilizado.' }, locked ? 429 : 400, correlationId, request);
    }

    await recordAuditLogEdge(storage, {
      eventType: 'EMAIL_VERIFIED_SUCCESS',
      userId: user.id,
      ipAddress: clientIp,
      userAgent,
      metadata: { email: user.email },
      correlationId
    });

    const accessToken = await signJwtEdge({ sub: user.id, username: user.username, role: user.role }, env, 3600);
    const refreshToken = await signJwtEdge({ sub: user.id, username: user.username, role: user.role, type: 'refresh' }, env, 7 * 24 * 3600);

    return jsonResponse({
      success: true,
      message: 'E-mail validado com sucesso! Bem-vindo ao Ethos.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions
      },
      auth: { accessToken, refreshToken, expiresIn: 3600 }
    }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // REENVIO DE CÓDIGO DE CONFIRMAÇÃO DE E-MAIL (`/api/auth/resend-verification`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/resend-verification' && method === 'POST') {
    const email = String(body.email || body.login || '').trim().toLowerCase();
    if (!email) {
      return jsonResponse({ error: 'Informe o e-mail cadastrado.' }, 400, correlationId, request);
    }

    let user = null;
    if (storage.mode === 'd1') {
      user = await storage.db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?').bind(email, email).first();
    } else {
      for (const u of storage.store.users.values()) {
        if (u.email.toLowerCase() === email || u.username.toLowerCase() === email) { user = u; break; }
      }
    }

    if (!user) {
      return jsonResponse({ error: 'Nenhum usuário encontrado com este e-mail.' }, 404, correlationId, request);
    }

    if (user.email_verified === 1) {
      return jsonResponse({ success: true, alreadyVerified: true, message: 'Seu e-mail já está verificado.' }, 200, correlationId, request);
    }

    if (await tooManyCodeRequests(storage, user.id, 'email_verification')) {
      return jsonResponse({ error: TOO_MANY_CODES_MESSAGE }, 429, correlationId, request);
    }
    const rawToken = generateCode6();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    if (storage.mode === 'd1') {
      // Preserva o token de 48h gerado no Portal Admin; códigos pedidos antes por e-mail deixam de valer
      // (auditoria S2: cada reenvio somava mais um código válido).
      await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND type = \'email_verification\' AND used = 0 AND id NOT LIKE \'tok_48h_%\'').bind(user.id).run();
      await storage.db.prepare(
        'INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at, used, created_at) VALUES (?, ?, ?, \'email_verification\', ?, 0, ?)'
      ).bind(`tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, user.id, tokenHash, expiresAt, nowIso).run();
    }

    await sendVerificationEmailEdge(env, {
      email: user.email,
      name: user.name,
      token: rawToken,
      expiresInMinutes: 2880
    });

    const masked = maskEmailEdge(user.email);
    return jsonResponse({
      success: true,
      maskedEmail: masked,
      expiresInMinutes: 2880,
      message: `Novo código de verificação enviado com sucesso para ${masked}.`
    }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // REFRESH DE SESSÃO JWT (`/api/auth/refresh`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/refresh' && method === 'POST') {
    const payload = await verifyJwtEdge(body.refreshToken, env);
    if (!payload || payload.type !== 'refresh') {
      return jsonResponse({ error: 'Refresh token inválido ou expirado.' }, 401, correlationId, request);
    }
    // SEGURANÇA (auditoria 15/11/2026, S3): a renovação confere a conta no banco. Conta excluída ou
    // desativada não renova; papel e @ vêm do estado atual (rebaixar um admin vale na próxima renovação).
    let current = null;
    if (storage.mode === 'd1') {
      current = await storage.db.prepare('SELECT id, username, role, is_active FROM users WHERE id = ?').bind(payload.sub).first();
    } else {
      current = storage.store.users.get(payload.sub) || null;
    }
    if (!current || current.is_active === 0) {
      return jsonResponse({ error: 'Sessão encerrada. Entre novamente.' }, 401, correlationId, request);
    }
    const accessToken = await signJwtEdge(
      { sub: current.id, username: current.username, role: current.role },
      env,
      3600
    );
    const refreshToken = await signJwtEdge(
      { sub: current.id, username: current.username, role: current.role, type: 'refresh' },
      env,
      7 * 24 * 3600
    );
    return jsonResponse({ success: true, accessToken, refreshToken, expiresIn: 3600 }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // SOLICITAÇÃO SEGURA DE RECUPERAÇÃO DE SENHA (`/api/auth/forgot-password`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/forgot-password' && method === 'POST') {
    const inputIdentifier = String(body.email || body.login || '').trim().toLowerCase();
    if (!inputIdentifier) {
      return jsonResponse({ error: 'Informe o e-mail ou nome de usuário cadastrado.' }, 400, correlationId, request);
    }

    let user = null;
    if (storage.mode === 'd1') {
      user = await storage.db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?').bind(inputIdentifier, inputIdentifier).first();
    } else {
      for (const u of storage.store.users.values()) {
        if (u.email.toLowerCase() === inputIdentifier || u.username.toLowerCase() === inputIdentifier) { user = u; break; }
      }
    }

    if (!user) {
      return jsonResponse({ error: 'Nenhum usuário encontrado com esta credencial.' }, 404, correlationId, request);
    }

    if (await tooManyCodeRequests(storage, user.id, 'password_reset')) {
      return jsonResponse({ error: TOO_MANY_CODES_MESSAGE }, 429, correlationId, request);
    }
    // Gerar token criptográfico de 6 dígitos aleatório
    const rawToken = generateCode6();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    if (storage.mode === 'd1') {
      try {
        await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND type = \'password_reset\' AND used = 0').bind(user.id).run();
        await storage.db.prepare(
          'INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at, used, created_at) VALUES (?, ?, ?, \'password_reset\', ?, 0, ?)'
        ).bind(`tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, user.id, tokenHash, expiresAt, nowIso).run();

        await storage.db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?').bind(user.id).run();
        await storage.db.prepare(
          'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
        ).bind(`prt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, user.id, tokenHash, expiresAt, nowIso).run();
      } catch (e) {
        await storage.db.prepare('UPDATE users SET reset_token = ? WHERE id = ?').bind(`${tokenHash}:${expiresAt}`, user.id).run();
      }
    }

    // Dispara via Resend
    const emailResult = await sendPasswordResetEmailEdge(env, {
      email: user.email,
      name: user.name,
      token: rawToken,
      expiresInMinutes: 15
    });

    const targetAddr = emailResult?.targetEmail || user.email;
    const masked = maskEmailEdge(targetAddr);
    return jsonResponse({
      success: true,
      maskedEmail: masked,
      expiresInMinutes: 15,
      message: emailResult?.sandboxRedirected
        ? `Código enviado com sucesso para ${masked} (Modo Sandbox: e-mail registrado na conta do Resend).`
        : `Código de verificação enviado com sucesso para ${masked}. Verifique seu e-mail.`
    }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // REDEFINIÇÃO DE SENHA COM TOKEN (`/api/auth/reset-password`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/reset-password' && method === 'POST') {
    const inputIdentifier = String(body.email || body.login || '').trim().toLowerCase();
    const rawResetToken = String(body.token || '').trim();
    const token = rawResetToken.replace(/\D/g, '') || rawResetToken;
    const newPassword = String(body.newPassword || '');

    if (!inputIdentifier || !token || !newPassword) {
      return jsonResponse({ error: 'Dados incompletos para redefinição.' }, 400, correlationId, request);
    }
    if (passwordProblem(newPassword)) {
      return jsonResponse({ error: passwordProblem(newPassword), field: 'newPassword' }, 400, correlationId, request);
    }

    let user = null;
    if (storage.mode === 'd1') {
      user = await storage.db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?').bind(inputIdentifier, inputIdentifier).first();
    } else {
      for (const u of storage.store.users.values()) {
        if (u.email.toLowerCase() === inputIdentifier || u.username.toLowerCase() === inputIdentifier) { user = u; break; }
      }
    }

    if (!user) {
      return jsonResponse({ error: 'Usuário não encontrado.' }, 404, correlationId, request);
    }

    const candidateHash = await sha256Hex(token);
    const nowIso = new Date().toISOString();

    let validToken = false;
    if (storage.mode === 'd1') {
      try {
        const record = await storage.db.prepare(
          'SELECT * FROM auth_tokens WHERE user_id = ? AND type = \'password_reset\' AND token_hash = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
        ).bind(user.id, candidateHash).first();

        if (record && record.expires_at > nowIso) {
          validToken = true;
          await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE id = ?').bind(record.id).run();
          try {
            await storage.db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?').bind(user.id).run();
          } catch (e) {}
        }
      } catch (e) {}

      if (!validToken) {
        try {
          const legacyRecord = await storage.db.prepare(
            'SELECT * FROM password_reset_tokens WHERE user_id = ? AND token_hash = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
          ).bind(user.id, candidateHash).first();

          if (legacyRecord && legacyRecord.expires_at > nowIso) {
            validToken = true;
            await storage.db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').bind(legacyRecord.id).run();
          }
        } catch (e) {
          if (user.reset_token) {
            const [h, exp] = user.reset_token.split(':');
            if (h === candidateHash && exp > nowIso) validToken = true;
          }
        }
      }
    } else {
      validToken = true;
    }

    if (!validToken) {
      const { locked } = await registerCodeFailure(storage, { userId: user.id, type: 'password_reset', ipAddress: clientIp, userAgent, correlationId });
      return jsonResponse({ error: locked ? CODE_LOCKED_MESSAGE : 'Código de recuperação inválido ou expirado. Solicite um novo código.' }, locked ? 429 : 400, correlationId, request);
    }

    const newHashedPassword = await hashPasswordEdge(newPassword);
    if (storage.mode === 'd1') {
      await invalidateCodes(storage, user.id, 'password_reset');
      await storage.db.prepare('UPDATE users SET password = ?, reset_token = NULL WHERE id = ?').bind(newHashedPassword, user.id).run();
    } else {
      user.password = newHashedPassword;
    }

    return jsonResponse({ success: true, message: 'Senha redefinida com sucesso!' }, 200, correlationId, request);
  }

  return null;
}

