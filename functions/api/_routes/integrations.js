/**
 * Integração opcional com o Spotify, ligada à conta Ethos já autenticada (NÃO é método de login).
 *
 * Funções: "tocando agora" e "última música ouvida". Nada de controle do player, playlists ou biblioteca.
 * Permissões pedidas: user-read-currently-playing e user-read-recently-played (só essas).
 *
 * Segurança: Authorization Code + PKCE; state e verifier num cookie HttpOnly assinado (10 min) amarrado ao
 * usuário que iniciou; troca de código e renovação só no servidor (o Client Secret nunca vai ao navegador);
 * tokens cifrados (AES-GCM) e nunca devolvidos ao navegador nem escritos em log.
 */
import { recordAuditLogEdge } from '../_lib/audit.js';
import { authenticateRequestEdge, signJwtEdge, verifyJwtEdge } from '../_lib/auth.js';
import { decryptSecret, encryptSecret } from '../_lib/crypto.js';
import { jsonResponse } from '../_lib/http.js';

const COOKIE = 'ethos_spotify';
export const SPOTIFY_SCOPES = ['user-read-currently-playing', 'user-read-recently-played'];
const AUTHORIZE = 'https://accounts.spotify.com/authorize';
const TOKEN = 'https://accounts.spotify.com/api/token';
const API = 'https://api.spotify.com/v1';

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomToken = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const challenge = async (v) => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))));
const configured = (env) => Boolean(env?.SPOTIFY_CLIENT_ID && env?.SPOTIFY_CLIENT_SECRET);
const basic = (env) => `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`;
const cookieValue = (value, maxAge) => `${COOKIE}=${value}; Path=/api/integrations/spotify; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const readCookie = (request) => ((request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`)) || [])[1] || '';

function back(origin, query) {
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/?${query}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Set-Cookie': cookieValue('', 0) }
  });
}

async function tokenCall(env, params) {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basic(env) },
    body: new URLSearchParams(params).toString()
  });
  let data = {};
  try { data = await res.json(); } catch { /* corpo vazio */ }
  return { ok: res.ok, status: res.status, data };
}

/** Access token válido do usuário (renova se estiver perto de vencer). null = conexão inválida/removida. */
async function validAccessToken(ctx, userId, row) {
  const { env, storage } = ctx;
  if (row.expires_at > new Date(Date.now() + 60_000).toISOString()) {
    return decryptSecret(env, row.access_token_enc, userId);
  }
  const refresh = await decryptSecret(env, row.refresh_token_enc, userId);
  if (!refresh) return null;
  const r = await tokenCall(env, { grant_type: 'refresh_token', refresh_token: refresh });
  if (!r.ok || !r.data.access_token) {
    // Acesso revogado no Spotify: remove a conexão para não ficar tentando.
    if (r.status === 400 || r.status === 401) await storage.db.prepare('DELETE FROM spotify_connections WHERE user_id = ?').bind(userId).run();
    return null;
  }
  const expiresAt = new Date(Date.now() + (r.data.expires_in || 3600) * 1000).toISOString();
  const newRefresh = r.data.refresh_token ? await encryptSecret(env, r.data.refresh_token, userId) : row.refresh_token_enc;
  await storage.db
    .prepare('UPDATE spotify_connections SET access_token_enc = ?, refresh_token_enc = ?, expires_at = ?, updated_at = ? WHERE user_id = ?')
    .bind(await encryptSecret(env, r.data.access_token, userId), newRefresh, expiresAt, new Date().toISOString(), userId).run();
  return r.data.access_token;
}

const safeImage = (images) => {
  const url = (images || []).map((i) => i?.url).find((u) => typeof u === 'string' && /^https:\/\/i\.scdn\.co\//.test(u));
  return url || '';
};
function shapeTrack(track, playedAt) {
  return {
    name: String(track?.name || '').slice(0, 200),
    artists: (track?.artists || []).map((a) => String(a?.name || '').slice(0, 100)).filter(Boolean).slice(0, 5),
    album: String(track?.album?.name || '').slice(0, 200),
    image: safeImage(track?.album?.images),
    url: /^https:\/\/open\.spotify\.com\//.test(track?.external_urls?.spotify || '') ? track.external_urls.spotify : '',
    ...(playedAt ? { playedAt } : {})
  };
}

export async function handleIntegrationsRoutes(ctx) {
  const { request, env, correlationId, clientIp, userAgent, url, pathname, method, storage } = ctx;
  if (!pathname.startsWith('/api/integrations/spotify')) return null;
  const origin = url.origin;
  const redirectUri = `${origin}/api/integrations/spotify/callback`;

  // Volta do Spotify: o navegador não leva Authorization; quem manda é o cookie assinado do início do fluxo.
  if (pathname === '/api/integrations/spotify/callback' && method === 'GET') {
    if (url.searchParams.get('error')) return back(origin, `auth_error=${url.searchParams.get('error') === 'access_denied' ? 'cancelado' : 'falha'}`);
    const saved = await verifyJwtEdge(readCookie(request), env);
    const code = url.searchParams.get('code');
    if (!saved || saved.type !== 'spotify_state' || !saved.uid || !code || saved.state !== url.searchParams.get('state')) {
      return back(origin, 'auth_error=sessao_expirada');
    }
    if (!configured(env) || storage.mode !== 'd1') return back(origin, 'auth_error=provedor_indisponivel');

    const userId = saved.uid;
    const user = await storage.db.prepare('SELECT id, is_active FROM users WHERE id = ?').bind(userId).first();
    if (!user || user.is_active === 0) return back(origin, 'auth_error=sessao_expirada');

    const t = await tokenCall(env, { grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: saved.verifier });
    if (!t.ok || !t.data.access_token || !t.data.refresh_token) return back(origin, 'auth_error=falha');
    const meRes = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${t.data.access_token}` } });
    if (meRes.status === 403) return back(origin, 'auth_error=spotify_nao_liberado');
    const me = meRes.ok ? await meRes.json().catch(() => ({})) : {};
    if (!me.id) return back(origin, 'auth_error=falha');

    const other = await storage.db.prepare('SELECT user_id FROM spotify_connections WHERE spotify_user_id = ? AND user_id <> ?').bind(me.id, userId).first();
    if (other) return back(origin, 'auth_error=ja_vinculada');

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (t.data.expires_in || 3600) * 1000).toISOString();
    await storage.db.prepare(
      `INSERT INTO spotify_connections (user_id, spotify_user_id, display_name, access_token_enc, refresh_token_enc, expires_at, scope, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET spotify_user_id = excluded.spotify_user_id, display_name = excluded.display_name,
         access_token_enc = excluded.access_token_enc, refresh_token_enc = excluded.refresh_token_enc,
         expires_at = excluded.expires_at, scope = excluded.scope, updated_at = excluded.updated_at`
    ).bind(
      userId, me.id, String(me.display_name || me.id).slice(0, 100),
      await encryptSecret(env, t.data.access_token, userId), await encryptSecret(env, t.data.refresh_token, userId),
      expiresAt, String(t.data.scope || SPOTIFY_SCOPES.join(' ')), nowIso, nowIso
    ).run();
    await recordAuditLogEdge(storage, { eventType: 'SPOTIFY_CONNECTED', userId, ipAddress: clientIp, userAgent, metadata: {}, correlationId });
    return back(origin, 'connected=spotify');
  }

  // Daqui para baixo: só com sessão Ethos válida.
  const claims = await authenticateRequestEdge(request, env);
  if (!claims) return jsonResponse({ error: 'Entre na sua conta para usar o Spotify.' }, 401, correlationId, request);
  const userId = claims.sub;

  if (pathname === '/api/integrations/spotify/start' && method === 'POST') {
    if (!configured(env)) return jsonResponse({ error: 'A conexão com o Spotify ainda não está disponível.', code: 'provedor_indisponivel' }, 503, correlationId, request);
    const state = randomToken(24);
    const verifier = randomToken(48);
    const cookie = await signJwtEdge({ type: 'spotify_state', uid: userId, state, verifier }, env, 600);
    const params = new URLSearchParams({
      client_id: env.SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES.join(' '), state, code_challenge_method: 'S256', code_challenge: await challenge(verifier), show_dialog: 'true'
    });
    const res = jsonResponse({ url: `${AUTHORIZE}?${params.toString()}`, scopes: SPOTIFY_SCOPES }, 200, correlationId, request);
    res.headers.append('Set-Cookie', cookieValue(cookie, 600));
    return res;
  }

  if (pathname === '/api/integrations/spotify/status' && method === 'GET') {
    if (storage.mode !== 'd1') return jsonResponse({ available: false, connected: false }, 200, correlationId, request);
    const row = await storage.db.prepare('SELECT display_name, created_at FROM spotify_connections WHERE user_id = ?').bind(userId).first();
    return jsonResponse({ available: configured(env), connected: Boolean(row), displayName: row?.display_name || '', connectedAt: row?.created_at || '', scopes: SPOTIFY_SCOPES }, 200, correlationId, request);
  }

  if (pathname === '/api/integrations/spotify' && method === 'DELETE') {
    if (storage.mode === 'd1') await storage.db.prepare('DELETE FROM spotify_connections WHERE user_id = ?').bind(userId).run();
    await recordAuditLogEdge(storage, { eventType: 'SPOTIFY_DISCONNECTED', userId, ipAddress: clientIp, userAgent, metadata: {}, correlationId });
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  if (pathname === '/api/integrations/spotify/now-playing' && method === 'GET') {
    if (storage.mode !== 'd1') return jsonResponse({ connected: false }, 200, correlationId, request);
    const row = await storage.db.prepare('SELECT * FROM spotify_connections WHERE user_id = ?').bind(userId).first();
    if (!row) return jsonResponse({ connected: false }, 200, correlationId, request);
    const access = await validAccessToken(ctx, userId, row);
    if (!access) return jsonResponse({ connected: false, reason: 'expirada' }, 200, correlationId, request);
    const headers = { Authorization: `Bearer ${access}` };

    const cur = await fetch(`${API}/me/player/currently-playing`, { headers });
    if (cur.status === 429) return jsonResponse({ connected: true, state: 'indisponivel' }, 200, correlationId, request);
    if (cur.status === 200) {
      const body = await cur.json().catch(() => null);
      if (body?.is_playing && body?.item?.type === 'track') {
        return jsonResponse({ connected: true, state: 'playing', track: shapeTrack(body.item) }, 200, correlationId, request);
      }
    }
    const rec = await fetch(`${API}/me/player/recently-played?limit=1`, { headers });
    if (rec.status === 429 || !rec.ok) return jsonResponse({ connected: true, state: 'indisponivel' }, 200, correlationId, request);
    const item = ((await rec.json().catch(() => ({}))).items || [])[0];
    if (!item?.track) return jsonResponse({ connected: true, state: 'none' }, 200, correlationId, request);
    return jsonResponse({ connected: true, state: 'last', track: shapeTrack(item.track, item.played_at) }, 200, correlationId, request);
  }

  return null;
}
