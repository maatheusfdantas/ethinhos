/**
 * Proteção contra força bruta e log de auditoria.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

// ============================================================================
// 4. PROTEÇÃO CONTRA FORÇA BRUTA E AUDITORIA NO CLOUDFLARE D1 (`auth_audit_logs`)
// ============================================================================
export const edgeBruteForceMap = new Map();

export async function checkBruteForceEdge(storage, ipAddress, loginIdentifier) {
  const key = `${ipAddress}:${loginIdentifier}`;
  const memRecord = edgeBruteForceMap.get(key);
  if (memRecord && memRecord.lockUntil > Date.now()) {
    return {
      allowed: false,
      message: 'Muitas tentativas de login. Tente novamente mais tarde.'
    };
  }

  if (storage.mode === 'd1') {
    try {
      const cutoffIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const row = await storage.db
        .prepare(
          `SELECT COUNT(*) as failures FROM auth_audit_logs
           WHERE event_type = 'LOGIN_FAILED'
             AND (ip_address = ? OR user_id = ?)
             AND created_at >= ?`
        )
        .bind(ipAddress, loginIdentifier, cutoffIso)
        .first();

      if (row && Number(row.failures) >= 5) {
        return {
          allowed: false,
          message: 'Muitas tentativas de login. Tente novamente mais tarde.'
        };
      }
    } catch (_e) {}
  }

  return { allowed: true };
}

export async function recordAuditLogEdge(storage, { eventType, userId = null, ipAddress = '0.0.0.0', userAgent = '', metadata = {}, correlationId }) {
  if (eventType === 'LOGIN_FAILED') {
    const key = `${ipAddress}:${userId || 'anon'}`;
    const prev = edgeBruteForceMap.get(key) || { count: 0, lockUntil: 0 };
    const nextCount = prev.count + 1;
    const lockUntil = nextCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    edgeBruteForceMap.set(key, { count: nextCount, lockUntil });
  } else if (eventType === 'LOGIN_SUCCESS') {
    edgeBruteForceMap.delete(`${ipAddress}:${userId || 'anon'}`);
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

