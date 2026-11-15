/**
 * Camada de autorização obrigatória (JWT + Anti-IDOR + RBAC).
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

import { recordAuditLogEdge } from './audit.js';
import { authenticateRequestEdge } from './auth.js';
import { jsonResponse } from './http.js';

/**
 * Devolve uma Response de erro (401/403) se a requisição não for autorizada, ou null.
 * Também devolve as claims do JWT em ctx.authClaims para as rotas seguintes.
 */
export async function authorizeRequest(ctx) {
  const { request, env, correlationId, clientIp, userAgent, pathname, storage } = ctx;

  const authClaims = await authenticateRequestEdge(request, env);
  ctx.authClaims = authClaims;

  // Proteção de qualquer rota `/api/user/:id/*` ou `/api/analytics/:id` (Anti-IDOR)
  const protectedUserRouteMatch =
    pathname.match(/^\/api\/user\/([^/]+)(?:\/.*)?$/) ||
    pathname.match(/^\/api\/analytics\/([^/]+)$/);

  if (protectedUserRouteMatch) {
    const targetUserId = protectedUserRouteMatch[1];

    // JWT assinado é obrigatório. O cabeçalho X-Ethos-User-Id NÃO autoriza nada:
    // qualquer cliente pode enviá-lo com o id de outra pessoa.
    if (!authClaims) {
      return jsonResponse(
        { error: 'Não autorizado: Token JWT ausente, inválido ou expirado.' },
        401,
        correlationId,
        request
      );
    }
    // Ninguém lê ou altera dados de outra conta por estas rotas, nem o admin (decisão de 14/11/2026).
    // O admin administra contas por /api/admin/*; atendimento que precise ver dados usa o acesso
    // consentido e temporário liberado pelo próprio cliente (/api/support-access).
    if (authClaims && authClaims.sub !== targetUserId) {
      await recordAuditLogEdge(storage, {
        eventType: 'IDOR_ATTEMPT_BLOCKED',
        userId: authClaims.sub,
        ipAddress: clientIp,
        userAgent,
        metadata: { attemptedTargetUserId: targetUserId, path: pathname },
        correlationId
      });
      return jsonResponse(
        { error: 'Acesso negado (Anti-IDOR): você só tem permissão para acessar seus próprios dados.' },
        403,
        correlationId,
        request
      );
    }
  }

  // Proteção de qualquer rota `/api/admin/*` ou `/api/system/reset` (RBAC Admin)
  if (pathname.startsWith('/api/admin') || pathname === '/api/system/reset') {
    if (!authClaims) {
      return jsonResponse(
        { error: 'Não autorizado: Token JWT de Administrador obrigatório.' },
        401,
        correlationId,
        request
      );
    }
    if (authClaims.role !== 'admin') {
      await recordAuditLogEdge(storage, {
        eventType: 'ADMIN_ACCESS_DENIED',
        userId: authClaims.sub,
        ipAddress: clientIp,
        userAgent,
        metadata: { path: pathname },
        correlationId
      });
      return jsonResponse(
        { error: 'Acesso proibido: privilégios de Administrador necessários.' },
        403,
        correlationId,
        request
      );
    }
  }

  return null;
}

