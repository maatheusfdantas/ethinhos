/**
 * Códigos de 6 dígitos (confirmação de e-mail e recuperação de senha).
 * Auditoria 15/11/2026, S2: os códigos vinham de Math.random, não tinham limite de tentativas
 * e cada reenvio somava mais um código válido. Aqui ficam as três proteções:
 *  1. geração com crypto.getRandomValues;
 *  2. no máximo MAX_CODE_FAILURES tentativas erradas por código: na 5ª, todos os códigos ativos
 *     daquele tipo são cancelados e a pessoa precisa pedir outro;
 *  3. no máximo MAX_CODES_PER_HOUR pedidos de código por conta e tipo, por hora.
 */
import { recordAuditLogEdge } from './audit.js';

export const MAX_CODE_FAILURES = 5;
export const MAX_CODES_PER_HOUR = 5;

/** Código numérico de 6 dígitos, uniforme (rejeição para evitar viés do módulo). */
export function generateCode6() {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 900000) * 900000;
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return String(100000 + (buf[0] % 900000));
  }
}

/** true quando a conta já pediu códigos demais deste tipo na última hora. */
export async function tooManyCodeRequests(storage, userId, type) {
  if (storage.mode !== 'd1') return false;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  try {
    const row = await storage.db
      .prepare('SELECT COUNT(*) AS n FROM auth_tokens WHERE user_id = ? AND type = ? AND created_at >= ? AND id NOT LIKE \'tok_48h_%\'')
      .bind(userId, type, since)
      .first();
    return Number(row?.n || 0) >= MAX_CODES_PER_HOUR;
  } catch (_e) {
    return false;
  }
}

/** Cancela todos os códigos ativos de um tipo (inclui as tabelas e colunas antigas). */
export async function invalidateCodes(storage, userId, type) {
  if (storage.mode !== 'd1') return;
  await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND type = ? AND used = 0').bind(userId, type).run();
  if (type === 'password_reset') {
    try { await storage.db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?').bind(userId).run(); } catch (_e) {}
    try { await storage.db.prepare('UPDATE users SET reset_token = NULL WHERE id = ?').bind(userId).run(); } catch (_e) {}
  } else {
    try { await storage.db.prepare('UPDATE users SET validation_token_preview = NULL, validation_token_expires_at = NULL WHERE id = ?').bind(userId).run(); } catch (_e) {}
  }
}

/**
 * Registra uma tentativa errada. Conta as falhas desde o código mais recente deste tipo;
 * ao chegar no limite, cancela os códigos ativos. Devolve { locked } para a mensagem.
 */
export async function registerCodeFailure(storage, { userId, type, ipAddress, userAgent, correlationId }) {
  await recordAuditLogEdge(storage, { eventType: 'CODE_FAILED', userId, ipAddress, userAgent, metadata: { type }, correlationId });
  if (storage.mode !== 'd1') return { locked: false };
  try {
    const latest = await storage.db
      .prepare('SELECT MAX(created_at) AS t FROM auth_tokens WHERE user_id = ? AND type = ?')
      .bind(userId, type)
      .first();
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since = latest?.t && latest.t > windowStart ? latest.t : windowStart;
    const row = await storage.db
      .prepare(
        `SELECT COUNT(*) AS n FROM auth_audit_logs
         WHERE event_type = 'CODE_FAILED' AND user_id = ? AND json_extract(metadata, '$.type') = ? AND created_at >= ?`
      )
      .bind(userId, type, since)
      .first();
    if (Number(row?.n || 0) >= MAX_CODE_FAILURES) {
      await invalidateCodes(storage, userId, type);
      return { locked: true };
    }
  } catch (_e) {}
  return { locked: false };
}

export const CODE_LOCKED_MESSAGE = 'Muitas tentativas com código errado. Por segurança, este código foi cancelado: peça um novo.';
export const TOO_MANY_CODES_MESSAGE = 'Você pediu muitos códigos em pouco tempo. Espere uma hora antes de pedir outro.';
