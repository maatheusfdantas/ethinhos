/**
 * ETHOS — CLOUDFLARE PAGES FUNCTIONS API (`functions/api/[[path]].js`)
 * ----------------------------------------------------------------------------
 * Backend Serverless 100% compatível com Cloudflare Workers / Pages + D1 SQL:
 * - Proteção Anti-IDOR (BOLA) e RBAC com JWT Assinado via Web Crypto (HMAC-SHA256)
 * - Rate Limiting e Bloqueio de Força Bruta persistido no Cloudflare D1 (`auth_audit_logs`)
 * - Verificação real de existência de e-mail via API externa (Disify + Google DNS-over-HTTPS MX)
 * - Sanitização Anti-XSS recursiva e CORS restrito às origens oficiais do Ethos
 * - Hashing de senha com PBKDF2-HMAC-SHA256 (100.000 iterações) + Salt de 128 bits
 *
 * Este arquivo é só o ROTEADOR. A lógica vive em:
 * - _lib/    utilitários (http, auth/JWT, e-mail, auditoria, banco legado)
 * - _routes/ rotas por domínio, testadas na mesma ordem de antes
 */
import { ServerConfigError } from './_lib/auth.js';
import { authorizeRequest } from './_lib/guard.js';
import { ensureDatabaseReady } from './_lib/db.js';
import { getSecurityHeaders, jsonResponse, sanitizeObjectEdge } from './_lib/http.js';
import { handleAdminRoutes } from './_routes/admin.js';
import { handleAuthRoutes } from './_routes/auth.js';
import { handleInsightsRoutes } from './_routes/insights.js';
import { handleOAuthRoutes } from './_routes/oauth.js';
import { handlePublicRoutes } from './_routes/public.js';
import { handleUserRoutes } from './_routes/user.js';

/** Rotas públicas (antes da camada de autorização), na ordem original. */
const PUBLIC_HANDLERS = [handleAuthRoutes, handleOAuthRoutes, handlePublicRoutes];
/** Rotas protegidas (depois de authorizeRequest), na ordem original. */
const PROTECTED_HANDLERS = [handleUserRoutes, handleInsightsRoutes, handleAdminRoutes];

export async function onRequest(context) {
  const { request, env } = context;
  const correlationId = crypto.randomUUID();
  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    '0.0.0.0';
  const userAgent = request.headers.get('User-Agent') || '';

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getSecurityHeaders(correlationId, request) });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();

  let body = {};
  if (method === 'POST' || method === 'PUT') {
    try {
      const rawBody = await request.json();
      body = sanitizeObjectEdge(rawBody);
    } catch (_e) {
      body = {};
    }
  }

  const storage = await ensureDatabaseReady(env);

  const ctx = { request, env, correlationId, clientIp, userAgent, url, pathname, method, body, storage, authClaims: null };

  try {
    for (const handler of PUBLIC_HANDLERS) {
      const res = await handler(ctx);
      if (res) return res;
    }

    const denied = await authorizeRequest(ctx);
    if (denied) return denied;

    for (const handler of PROTECTED_HANDLERS) {
      const res = await handler(ctx);
      if (res) return res;
    }
  } catch (err) {
    if (err instanceof ServerConfigError) {
      return jsonResponse({ error: err.message }, 503, correlationId, request);
    }
    throw err;
  }

  return jsonResponse({ error: 'Rota não encontrada.' }, 404, correlationId, request);
}
