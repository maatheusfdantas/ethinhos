/**
 * Proteção contra força bruta e log de auditoria.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

// ============================================================================
// 4. PROTEÇÃO CONTRA FORÇA BRUTA E AUDITORIA NO CLOUDFLARE D1 (`auth_audit_logs`)
// ============================================================================
export const edgeBruteForceMap = new Map();

// SEGURANÇA (auditoria 15/11/2026, S11). Antes, 5 falhas com (mesmo IP OU mesmo login) travavam a conta
// para todo mundo: qualquer pessoa conseguia bloquear o login do admin de qualquer lugar.
// Agora há três limites, numa janela de 15 minutos:
//  - mesmo IP + mesmo login: 5 falhas (zera quando esse IP entra com sucesso nesse login);
//  - mesmo IP, qualquer login: 20 falhas (tentativa em massa a partir de um lugar);
//  - mesmo login, qualquer IP: 50 falhas (ataque distribuído contra uma conta).
export const LOGIN_LIMITS = { pair: 5, ip: 20, account: 50, windowMs: 15 * 60 * 1000 };
const LOCKED_MESSAGE = 'Muitas tentativas de login. Tente novamente mais tarde.';

function pruneMemory() {
  if (edgeBruteForceMap.size < 5000) return;
  const now = Date.now();
  for (const [k, v] of edgeBruteForceMap) if (!v.lockUntil || v.lockUntil < now) edgeBruteForceMap.delete(k);
}

export async function checkBruteForceEdge(storage, ipAddress, loginIdentifier) {
  const key = `${ipAddress}:${loginIdentifier}`;
  const memRecord = edgeBruteForceMap.get(key);
  if (memRecord && memRecord.lockUntil > Date.now()) {
    return { allowed: false, message: LOCKED_MESSAGE };
  }

  if (storage.mode === 'd1') {
    try {
      const cutoffIso = new Date(Date.now() - LOGIN_LIMITS.windowMs).toISOString();
      const lastOk = await storage.db
        .prepare(
          `SELECT MAX(created_at) AS t FROM auth_audit_logs
           WHERE event_type = 'LOGIN_SUCCESS' AND ip_address = ? AND json_extract(metadata, '$.login') = ?`
        )
        .bind(ipAddress, loginIdentifier)
        .first();
      const pairSince = lastOk?.t && lastOk.t > cutoffIso ? lastOk.t : cutoffIso;
      const row = await storage.db
        .prepare(
          `SELECT
             SUM(CASE WHEN ip_address = ? AND user_id = ? AND created_at > ? THEN 1 ELSE 0 END) AS pair,
             SUM(CASE WHEN ip_address = ? THEN 1 ELSE 0 END) AS ip,
             SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS account
           FROM auth_audit_logs
           WHERE event_type = 'LOGIN_FAILED' AND created_at >= ? AND (ip_address = ? OR user_id = ?)`
        )
        .bind(ipAddress, loginIdentifier, pairSince, ipAddress, loginIdentifier, cutoffIso, ipAddress, loginIdentifier)
        .first();

      if (
        Number(row?.pair || 0) >= LOGIN_LIMITS.pair ||
        Number(row?.ip || 0) >= LOGIN_LIMITS.ip ||
        Number(row?.account || 0) >= LOGIN_LIMITS.account
      ) {
        return { allowed: false, message: LOCKED_MESSAGE };
      }
    } catch (_e) {}
  }

  return { allowed: true };
}

export async function recordAuditLogEdge(storage, { eventType, userId = null, ipAddress = '0.0.0.0', userAgent = '', metadata = {}, correlationId }) {
  if (eventType === 'LOGIN_FAILED') {
    pruneMemory();
    const key = `${ipAddress}:${userId || 'anon'}`;
    const prev = edgeBruteForceMap.get(key) || { count: 0, lockUntil: 0 };
    const nextCount = prev.count + 1;
    const lockUntil = nextCount >= LOGIN_LIMITS.pair ? Date.now() + LOGIN_LIMITS.windowMs : 0;
    edgeBruteForceMap.set(key, { count: nextCount, lockUntil });
  } else if (eventType === 'LOGIN_SUCCESS') {
    // As falhas são registradas pelo texto digitado no login (e-mail ou @); o sucesso, pelo id.
    edgeBruteForceMap.delete(`${ipAddress}:${metadata?.login || userId || 'anon'}`);
  }

  if (storage.mode === 'd1') {
    try {
      await storage.db
        .prepare(
          `INSERT INTO auth_audit_logs (id, user_id, event_type, ip_address, user_agent, metadata, correlation_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          `aud_${crypto.randomUUID()}`,
          userId,
          eventType,
          ipAddress,
          String(userAgent).slice(0, 180),
          JSON.stringify(metadata),
          correlationId,
          new Date().toISOString()
        )
        .run();
    } catch (_e) {}
  }
}

