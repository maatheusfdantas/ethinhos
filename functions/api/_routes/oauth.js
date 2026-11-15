/**
 * Login e cadastro com Google e Microsoft (OAuth 2.0 Authorization Code + PKCE).
 *
 * Segurança:
 * - `state` e `code_verifier` ficam num cookie HttpOnly assinado (10 min) e são conferidos na volta.
 * - O client secret só existe no servidor. Nenhum token do Ethos vai na URL: a volta traz um
 *   código de uso único (60 s) que o frontend troca por tokens em POST /api/auth/oauth/exchange.
 * - Identidade = id da conta no provedor. O e-mail NUNCA vincula sozinho uma conta existente
 *   (evita tomada de conta). Para vincular, a pessoa entra com senha e conecta pelo Perfil.
 * - Permissões só de identidade (openid, email, profile). Calendário é outra conexão, à parte.
 * - Tokens do provedor não são guardados: para login, só o vínculo de identidade importa.
 */

import { recordAuditLogEdge } from '../_lib/audit.js';
import { authenticateRequestEdge, signJwtEdge, verifyJwtEdge } from '../_lib/auth.js';
import { ALL_PERMS } from '../_lib/constants.js';
import { edgeFallbackMemory } from '../_lib/db.js';
import { sha256Hex } from '../_lib/email.js';
import { jsonResponse } from '../_lib/http.js';
import { normalizeUsername, usernameProblem } from '../../../src/domain/credentials.js';

const STATE_COOKIE = 'ethos_oauth';
const PROVIDERS = {
  google: {
    authorize: () => 'https://accounts.google.com/o/oauth2/v2/auth',
    token: () => 'https://oauth2.googleapis.com/token',
    userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    clientId: (env) => env?.GOOGLE_CLIENT_ID,
    clientSecret: (env) => env?.GOOGLE_CLIENT_SECRET,
    extra: { prompt: 'select_account' }
  },
  microsoft: {
    authorize: (env) => `https://login.microsoftonline.com/${env?.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
    token: (env) => `https://login.microsoftonline.com/${env?.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    userinfo: 'https://graph.microsoft.com/oidc/userinfo',
    scope: 'openid email profile',
    clientId: (env) => env?.MICROSOFT_CLIENT_ID,
    clientSecret: (env) => env?.MICROSOFT_CLIENT_SECRET,
    extra: { prompt: 'select_account' }
  }
};

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomToken = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}
const configured = (p, env) => Boolean(p.clientId(env) && p.clientSecret(env));

function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  cookies.forEach((c) => headers.append('Set-Cookie', c));
  return new Response(null, { status: 302, headers });
}
const stateCookie = (value, maxAge) =>
  `${STATE_COOKIE}=${value}; Path=/api/auth/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const readCookie = (request, name) => {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : '';
};
const fail = (origin, code) => redirect(`${origin}/?auth_error=${code}`, [stateCookie('', 0)]);
const SESSION_EXPIRED = 'O login demorou demais ou foi aberto em outra aba. Tente de novo.';

/** Mesmo formato da resposta de /api/auth/login. */
export async function sessionPayload(user, env) {
  const accessToken = await signJwtEdge({ sub: user.id, username: user.username, role: user.role }, env, 3600);
  const refreshToken = await signJwtEdge({ sub: user.id, username: user.username, role: user.role, type: 'refresh' }, env, 7 * 24 * 3600);
  let permissions;
  try { permissions = JSON.parse(user.permissions || ALL_PERMS); } catch { permissions = JSON.parse(ALL_PERMS); }
  return {
    id: user.id, username: user.username, email: user.email, name: user.name, avatar: user.avatar, role: user.role,
    is_active: user.is_active === 1, subscription_tier: user.subscription_tier, is_public: user.is_public === 1,
    permissions, streak_days: user.streak_days, points: user.points, weight: user.weight || 70.0, height: user.height || 1.75,
    auth: { accessToken, refreshToken, expiresIn: 3600 }
  };
}

/** Username provisório de quem entrou pelo provedor e ainda não escolheu o @. */
export const PENDING_PREFIX = 'novo_';
export const needsUsername = (user) => String(user?.username || '').startsWith(PENDING_PREFIX);

export async function handleOAuthRoutes(ctx) {
  const { request, env, correlationId, clientIp, userAgent, url, pathname, method, body, storage } = ctx;
  const origin = url.origin;

  // Quais provedores estão configurados (a tela só mostra os botões que funcionam)
  if (pathname === '/api/auth/oauth/providers' && method === 'GET') {
    return jsonResponse({ google: configured(PROVIDERS.google, env), microsoft: configured(PROVIDERS.microsoft, env) }, 200, correlationId, request);
  }

  // Ticket curto para conectar um provedor a uma conta já logada (Perfil > Contas conectadas)
  if (pathname === '/api/auth/oauth/link-ticket' && method === 'POST') {
    const claims = await authenticateRequestEdge(request, env);
    if (!claims) return jsonResponse({ error: 'Entre na sua conta para conectar.' }, 401, correlationId, request);
    const ticket = await signJwtEdge({ type: 'oauth_link', sub: claims.sub }, env, 120);
    return jsonResponse({ ticket }, 200, correlationId, request);
  }

  // Início: /api/auth/oauth/{google|microsoft}?action=login|signup  (ou ?link=<ticket>)
  const start = pathname.match(/^\/api\/auth\/oauth\/(google|microsoft)$/);
  if (start && method === 'GET') {
    const provider = start[1]; const p = PROVIDERS[provider];
    if (!configured(p, env)) return fail(origin, 'provedor_indisponivel');

    let linkUserId = null;
    const linkTicket = url.searchParams.get('link');
    if (linkTicket) {
      const t = await verifyJwtEdge(linkTicket, env);
      if (!t || t.type !== 'oauth_link' || !t.sub) return fail(origin, 'sessao_expirada');
      linkUserId = t.sub;
    }

    const state = randomToken(24);
    const verifier = randomToken(48);
    const cookieValue = await signJwtEdge({ type: 'oauth_state', state, verifier, provider, linkUserId }, env, 600);
    const params = new URLSearchParams({
      client_id: p.clientId(env),
      redirect_uri: `${origin}/api/auth/oauth/callback/${provider}`,
      response_type: 'code',
      scope: p.scope,
      state,
      code_challenge: await pkceChallenge(verifier),
      code_challenge_method: 'S256',
      ...p.extra
    });
    return redirect(`${p.authorize(env)}?${params.toString()}`, [stateCookie(cookieValue, 600)]);
  }

  // Volta do provedor
  const cb = pathname.match(/^\/api\/auth\/oauth\/callback\/(google|microsoft)$/);
  if (cb && method === 'GET') {
    const provider = cb[1]; const p = PROVIDERS[provider];
    if (url.searchParams.get('error')) return fail(origin, url.searchParams.get('error') === 'access_denied' ? 'cancelado' : 'falha');

    const saved = await verifyJwtEdge(readCookie(request, STATE_COOKIE), env);
    const code = url.searchParams.get('code');
    if (!saved || saved.type !== 'oauth_state' || saved.provider !== provider || !code || saved.state !== url.searchParams.get('state')) {
      return fail(origin, 'sessao_expirada');
    }
    if (!configured(p, env)) return fail(origin, 'provedor_indisponivel');

    let profile;
    try {
      const tokenRes = await fetch(p.token(env), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'authorization_code', code, redirect_uri: `${origin}/api/auth/oauth/callback/${provider}`,
          client_id: p.clientId(env), client_secret: p.clientSecret(env), code_verifier: saved.verifier
        }).toString()
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error('token');
      const infoRes = await fetch(p.userinfo, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
      profile = await infoRes.json();
      if (!infoRes.ok || !profile?.sub) throw new Error('userinfo');
    } catch (e) {
      await recordAuditLogEdge(storage, { eventType: 'OAUTH_FAILED', userId: null, ipAddress: clientIp, userAgent, metadata: { provider, stage: String(e?.message || 'erro') }, correlationId });
      return fail(origin, 'falha');
    }

    const providerAccountId = String(profile.sub);
    const email = String(profile.email || '').trim().toLowerCase();
    // Google informa email_verified. No Microsoft o e-mail só serve para exibir e para criar conta
    // nova; nunca para encontrar uma conta existente.
    const emailVerified = provider === 'google' ? profile.email_verified === true : Boolean(email);
    const name = String(profile.name || email.split('@')[0] || 'Pessoa').slice(0, 100);

    if (storage.mode !== 'd1') return fail(origin, 'falha');
    const db = storage.db;
    const nowIso = new Date().toISOString();
    const identity = await db.prepare('SELECT * FROM oauth_identities WHERE provider = ? AND provider_account_id = ?').bind(provider, providerAccountId).first();
    let user = null;

    if (saved.linkUserId) {
      if (identity && identity.user_id !== saved.linkUserId) return fail(origin, 'ja_vinculada');
      user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(saved.linkUserId).first();
      if (!user) return fail(origin, 'sessao_expirada');
      if (!identity) {
        await db.prepare('INSERT INTO oauth_identities (id, user_id, provider, provider_account_id, provider_email, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(`oid_${crypto.randomUUID()}`, user.id, provider, providerAccountId, email || null, nowIso, nowIso).run();
      }
      await recordAuditLogEdge(storage, { eventType: 'OAUTH_LINKED', userId: user.id, ipAddress: clientIp, userAgent, metadata: { provider }, correlationId });
      return redirect(`${origin}/?connected=${provider}`, [stateCookie('', 0)]);
    }

    if (identity) {
      user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(identity.user_id).first();
      await db.prepare('UPDATE oauth_identities SET last_login_at = ? WHERE id = ?').bind(nowIso, identity.id).run();
    } else {
      if (!emailVerified) return fail(origin, 'email_nao_verificado');
      const sameEmail = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').bind(email).first();
      if (sameEmail) return fail(origin, 'conta_existe');
      const newId = `usr_${crypto.randomUUID()}`;
      const pending = `${PENDING_PREFIX}${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
      const initials = name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || 'EU';
      await db.prepare(`INSERT INTO users (id, username, email, password, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, email_verified, created_at)
        VALUES (?, ?, ?, 'OAUTH_FEDERATED_ACCOUNT', ?, ?, 'user', 1, 'Gratuito', 1, ?, 0, 0, 1, ?)`)
        .bind(newId, pending, email, name, initials, ALL_PERMS, nowIso).run();
      await db.prepare('INSERT INTO oauth_identities (id, user_id, provider, provider_account_id, provider_email, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(`oid_${crypto.randomUUID()}`, newId, provider, providerAccountId, email, nowIso, nowIso).run();
      user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(newId).first();
      await recordAuditLogEdge(storage, { eventType: 'OAUTH_SIGNUP', userId: newId, ipAddress: clientIp, userAgent, metadata: { provider }, correlationId });
    }

    if (!user) return fail(origin, 'falha');
    if (user.is_active === 0) return fail(origin, 'conta_desativada');

    const loginCode = randomToken(32);
    await db.prepare('INSERT INTO oauth_login_codes (code_hash, user_id, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)')
      .bind(await sha256Hex(loginCode), user.id, new Date(Date.now() + 60_000).toISOString(), nowIso).run();
    await recordAuditLogEdge(storage, { eventType: 'LOGIN_SUCCESS', userId: user.id, ipAddress: clientIp, userAgent, metadata: { via: provider }, correlationId });
    return redirect(`${origin}/?auth=ok&code=${loginCode}`, [stateCookie('', 0)]);
  }

  // Troca do código de uso único pelos tokens do Ethos
  if (pathname === '/api/auth/oauth/exchange' && method === 'POST') {
    const code = String(ctx.rawBody?.code || '');
    if (!code || storage.mode !== 'd1') return jsonResponse({ error: SESSION_EXPIRED }, 400, correlationId, request);
    const hash = await sha256Hex(code);
    const row = await storage.db.prepare('SELECT * FROM oauth_login_codes WHERE code_hash = ? AND used = 0').bind(hash).first();
    if (!row || row.expires_at < new Date().toISOString()) return jsonResponse({ error: SESSION_EXPIRED }, 400, correlationId, request);
    // Consumo atômico: se duas requisições chegarem juntas, só uma leva.
    const consumed = await storage.db.prepare('UPDATE oauth_login_codes SET used = 1 WHERE code_hash = ? AND used = 0').bind(hash).run();
    if (!consumed?.meta?.changes) return jsonResponse({ error: SESSION_EXPIRED }, 400, correlationId, request);
    const user = await storage.db.prepare('SELECT * FROM users WHERE id = ?').bind(row.user_id).first();
    if (!user || user.is_active === 0) return jsonResponse({ error: 'Sua conta está desativada. Fale com o suporte.' }, 403, correlationId, request);
    return jsonResponse({ ...(await sessionPayload(user, env)), needsUsername: needsUsername(user) }, 200, correlationId, request);
  }

  // Escolher o @ (obrigatório para quem entrou pelo provedor)
  if (pathname === '/api/auth/username' && method === 'PUT') {
    const claims = await authenticateRequestEdge(request, env);
    if (!claims) return jsonResponse({ error: 'Entre na sua conta.' }, 401, correlationId, request);
    const wanted = normalizeUsername(body.username);
    const issue = usernameProblem(wanted);
    if (issue) return jsonResponse({ error: issue, field: 'username' }, 400, correlationId, request);
    if (storage.mode !== 'd1') return jsonResponse({ error: 'Tente de novo em instantes.' }, 503, correlationId, request);
    const taken = await storage.db.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id <> ?').bind(wanted, claims.sub).first();
    if (taken) return jsonResponse({ error: 'Esse @ já está em uso. Escolha outro.', field: 'username' }, 409, correlationId, request);
    await storage.db.prepare('UPDATE users SET username = ? WHERE id = ?').bind(wanted, claims.sub).run();
    const user = await storage.db.prepare('SELECT * FROM users WHERE id = ?').bind(claims.sub).first();
    return jsonResponse({ ...(await sessionPayload(user, env)), needsUsername: false }, 200, correlationId, request);
  }

  // Contas conectadas (Perfil): listar e desconectar
  if (pathname === '/api/auth/oauth/identities' && (method === 'GET' || method === 'DELETE')) {
    const claims = await authenticateRequestEdge(request, env);
    if (!claims) return jsonResponse({ error: 'Entre na sua conta.' }, 401, correlationId, request);
    if (storage.mode !== 'd1') return jsonResponse({ identities: [] }, 200, correlationId, request);
    if (method === 'DELETE') {
      const provider = url.searchParams.get('provider');
      const user = await storage.db.prepare('SELECT password FROM users WHERE id = ?').bind(claims.sub).first();
      const all = await storage.db.prepare('SELECT provider FROM oauth_identities WHERE user_id = ?').bind(claims.sub).all();
      const hasPassword = user && user.password !== 'OAUTH_FEDERATED_ACCOUNT';
      if (!hasPassword && (all.results || []).length <= 1) {
        return jsonResponse({ error: 'Essa é sua única forma de entrar. Crie uma senha antes de desconectar.' }, 409, correlationId, request);
      }
      await storage.db.prepare('DELETE FROM oauth_identities WHERE user_id = ? AND provider = ?').bind(claims.sub, provider).run();
      return jsonResponse({ success: true }, 200, correlationId, request);
    }
    const rows = await storage.db.prepare('SELECT provider, provider_email, created_at, last_login_at FROM oauth_identities WHERE user_id = ?').bind(claims.sub).all();
    return jsonResponse({ identities: rows.results || [] }, 200, correlationId, request);
  }

  // Legado: conexão SIMULADA do Google Calendar (substituída na fase de calendário).
  // O POST de credenciais sem login foi desativado: deixava qualquer pessoa trocar o client secret.
  if (pathname === '/api/auth/google/credentials' && method === 'POST') {
    return jsonResponse({ error: 'As credenciais são configuradas só no painel do Cloudflare.' }, 410, correlationId, request);
  }
  if (pathname === '/api/auth/google/status' && method === 'GET') {
    const userId = url.searchParams.get('userId') || '';
    const record = edgeFallbackMemory.googleTokens.get(userId);
    return jsonResponse({ connected: Boolean(record), userId, credentialsConfigured: false, calendars: record?.calendars || [] }, 200, correlationId, request);
  }
  if (pathname === '/api/auth/google/sandbox-consent' && method === 'GET') {
    const userId = url.searchParams.get('userId') || '';
    edgeFallbackMemory.googleTokens.set(userId, {
      calendars: [
        { id: 'primary', summary: 'Agenda Principal (Google Calendar)', primary: true, timeZone: 'America/Sao_Paulo', backgroundColor: '#4285F4' },
        { id: 'faculdade', summary: 'Faculdade & Prazos', primary: false, timeZone: 'America/Sao_Paulo', backgroundColor: '#7C6FEF' }
      ]
    });
    return Response.redirect(`${origin}/?google_auth=success&userId=${encodeURIComponent(userId)}`, 302);
  }
  if (pathname === '/api/auth/google/disconnect' && method === 'DELETE') {
    edgeFallbackMemory.googleTokens.delete(url.searchParams.get('userId') || '');
    return jsonResponse({ success: true, disconnected: true }, 200, correlationId, request);
  }

  return null;
}
