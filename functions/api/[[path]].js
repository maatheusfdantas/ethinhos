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
import { handleAccountRoutes } from './_routes/account.js';
import { handleAdminRoutes } from './_routes/admin.js';
import { handleAuthRoutes } from './_routes/auth.js';
import { handleCommunityRoutes } from './_routes/community.js';
import { handleSupportAccessRoutes } from './_routes/support-access.js';
import { handleTreinoRoutes } from './_routes/treino.js';
import { handleEspacosRoutes } from './_routes/espacos.js';
import { handleEspacosTreinoRoutes } from './_routes/espacos-treino.js';
import { handleEspacosVisaoRoutes } from './_routes/espacos-visao.js';
import { handleEspacosAgendaRoutes } from './_routes/espacos-agenda.js';
import { handleAlimentacaoRoutes } from './_routes/alimentacao.js';
import { handleExerciciosRoutes } from './_routes/exercicios.js';
import { handleEspacosMidiaRoutes, handleMidiaPublica } from './_routes/espacos-midia.js';
import { handleEspacosTarefasRoutes } from './_routes/espacos-tarefas.js';
import { handleEntriesRoutes } from './_routes/entries';
import { handleInsightsRoutes } from './_routes/insights.js';
import { handleIntegrationsRoutes } from './_routes/integrations.js';
import { handleOAuthRoutes } from './_routes/oauth.js';
import { handlePublicRoutes } from './_routes/public.js';
import { handleRoutineRoutes } from './_routes/routine';
import { handleUserRoutes } from './_routes/user.js';
import { handleDiasRoutes } from './_routes/dias.js';

/** Rotas públicas (antes da camada de autorização), na ordem original. */
// handleIntegrationsRoutes autentica por conta própria (a volta do provedor chega sem Authorization).
const PUBLIC_HANDLERS = [handleMidiaPublica, handleAuthRoutes, handleOAuthRoutes, handleIntegrationsRoutes, handleAccountRoutes, handlePublicRoutes];
/**
 * Rotas protegidas (depois de authorizeRequest). O núcleo /api/v1 vem primeiro e
 * exige JWT por conta própria (o usuário sai do token, nunca da URL).
 */
const PROTECTED_HANDLERS = [handleDiasRoutes, handleRoutineRoutes, handleEntriesRoutes, handleCommunityRoutes, handleUserRoutes, handleInsightsRoutes, handleSupportAccessRoutes, handleEspacosTreinoRoutes, handleEspacosVisaoRoutes, handleEspacosAgendaRoutes, handleEspacosTarefasRoutes, handleEspacosMidiaRoutes, handleExerciciosRoutes, handleAlimentacaoRoutes, handleTreinoRoutes, handleEspacosRoutes, handleAdminRoutes];

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

  // `body` (sanitizado) atende as rotas legadas; `rawBody` (JSON original) atende o
  // núcleo /api/v1, que valida campo a campo e deixa o escape para a camada de exibição.
  let body = {};
  let rawBody = null;
  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    try {
      rawBody = await request.json();
      body = sanitizeObjectEdge(rawBody);
    } catch (_e) {
      body = {};
    }
  }

  const storage = await ensureDatabaseReady(env);

  const ctx = { request, env, correlationId, clientIp, userAgent, url, pathname, method, body, rawBody, storage, authClaims: null };

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
