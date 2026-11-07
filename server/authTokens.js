/**
 * ============================================================================
 * ETHOS AUTH TOKEN ENGINE (SECURITY BY DESIGN)
 * ============================================================================
 * Gerenciamento centralizado e criptograficamente seguro de tokens de autenticação:
 *  - Validação de e-mail (cadastro)
 *  - Recuperação de senha (forgot-password)
 *
 * Características:
 *  1. Geração com crypto.randomInt (sem previsibilidade ou viés)
 *  2. Hashing SHA-256 antes de persistir no banco (zero tokens puros em disco)
 *  3. Invalidação automática de tokens anteriores do mesmo tipo
 *  4. Single-use estrito (marcação atômica de used = 1)
 *  5. Expiração curta e configurável
 *  6. Mascaramento de PII (e-mail) para respostas públicas da API
 */

import crypto from 'node:crypto';

// Constantes de expiração
export const TOKEN_EXPIRATION = {
  EMAIL_VERIFICATION_MS: 24 * 60 * 60 * 1000, // 24 horas (ou 1440 min)
  PASSWORD_RESET_MS: 15 * 60 * 1000            // 15 minutos
};

/**
 * Mascara o e-mail para exibição segura na interface (ex: j***e@dominio.com)
 */
export function maskEmail(emailStr) {
  if (!emailStr || typeof emailStr !== 'string' || !emailStr.includes('@')) {
    return emailStr || '';
  }
  const [localPart, domainPart] = emailStr.trim().split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domainPart}`;
  }
  const maskedLocal =
    localPart[0] +
    '*'.repeat(Math.max(1, localPart.length - 2)) +
    localPart[localPart.length - 1];
  return `${maskedLocal}@${domainPart}`;
}

/**
 * Gera token criptograficamente seguro de 6 dígitos numéricos
 */
export function generateNumericToken() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Gera token alfanumérico seguro de alta entropia (opcional para links mágicos)
 */
export function generateAlphaToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Gera o hash criptográfico SHA-256 do token
 */
export function hashToken(rawToken) {
  if (!rawToken) {
    throw new Error('Token obrigatório para cálculo de hash.');
  }
  return crypto
    .createHash('sha256')
    .update(String(rawToken).trim())
    .digest('hex');
}

/**
 * Inicializa / garante a existência da tabela de tokens no SQLite
 */
export function ensureAuthTokensTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_lookup 
      ON auth_tokens (user_id, type, used);
  `);

  try {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {
    // Coluna já existe
  }
}

/**
 * Cria e persiste um novo token seguro para o usuário, invalidando anteriores
 *
 * @param {object} db - Instância do BetterSQLite3
 * @param {object} options
 * @param {string} options.userId - ID do usuário
 * @param {string} options.type - 'email_verification' | 'password_reset'
 * @param {number} [options.durationMs] - Duração em milissegundos
 * @returns {{ rawToken: string, tokenHash: string, expiresAt: string, expiresInMinutes: number }}
 */
export function createAuthToken(db, { userId, type, durationMs }) {
  if (!userId || !type) {
    throw new Error('userId e type são obrigatórios para emitir token.');
  }

  const defaultDuration =
    type === 'email_verification'
      ? TOKEN_EXPIRATION.EMAIL_VERIFICATION_MS
      : TOKEN_EXPIRATION.PASSWORD_RESET_MS;

  const validMs = Number(durationMs) || defaultDuration;
  const rawToken = generateNumericToken();
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + validMs).toISOString();
  const createdAt = now.toISOString();
  const tokenId = `tok_${crypto.randomUUID()}`;

  // 1. Invalida tokens pendentes anteriores deste mesmo tipo para o usuário
  db.prepare(`
    UPDATE auth_tokens
    SET used = 1
    WHERE user_id = ? AND type = ? AND used = 0
  `).run(userId, type);

  // 2. Insere o novo token seguro na tabela centralizada
  db.prepare(`
    INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at, used, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(tokenId, userId, tokenHash, type, expiresAt, createdAt);

  // 3. Retrocompatibilidade: se for recuperação de senha, replica em password_reset_tokens
  if (type === 'password_reset') {
    try {
      db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?`).run(userId);
      db.prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `).run(`prt_${crypto.randomUUID()}`, userId, tokenHash, expiresAt, createdAt);
    } catch (e) {
      // Ignora se tabela não existir
    }
  }

  return {
    tokenId,
    rawToken,
    tokenHash,
    expiresAt,
    expiresInMinutes: Math.round(validMs / 60000)
  };
}

/**
 * Valida e consome de forma estrita e atômica um token de autenticação (Single-Use)
 *
 * @param {object} db - Instância do BetterSQLite3
 * @param {object} options
 * @param {string} options.userId - ID do usuário
 * @param {string} options.type - 'email_verification' | 'password_reset'
 * @param {string} options.rawToken - O token fornecido pelo usuário no frontend
 * @returns {{ valid: boolean, error?: string, tokenRecord?: object }}
 */
export function validateAndConsumeToken(db, { userId, type, rawToken }) {
  if (!userId || !type || !rawToken) {
    return { valid: false, error: 'Parâmetros insuficientes para validação de token.' };
  }

  const candidateHash = hashToken(rawToken);
  const nowIso = new Date().toISOString();

  // Busca o token ativo na tabela auth_tokens
  const record = db.prepare(`
    SELECT * FROM auth_tokens
    WHERE user_id = ? AND type = ? AND token_hash = ? AND used = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, type, candidateHash);

  if (!record) {
    // Fallback de retrocompatibilidade para password_reset_tokens
    if (type === 'password_reset') {
      const fallbackRecord = db.prepare(`
        SELECT * FROM password_reset_tokens
        WHERE user_id = ? AND token_hash = ? AND used = 0
        ORDER BY created_at DESC
        LIMIT 1
      `).get(userId, candidateHash);

      if (fallbackRecord) {
        if (fallbackRecord.expires_at < nowIso) {
          db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`).run(fallbackRecord.id);
          return { valid: false, error: 'Código expirado. Por favor, solicite um novo código.' };
        }
        db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`).run(fallbackRecord.id);
        return { valid: true, tokenRecord: fallbackRecord };
      }
    }

    return { valid: false, error: 'Código de verificação incorreto ou já utilizado.' };
  }

  // Verifica expiração
  if (record.expires_at < nowIso) {
    db.prepare(`UPDATE auth_tokens SET used = 1 WHERE id = ?`).run(record.id);
    return { valid: false, error: 'Código expirado. Por favor, solicite um novo código.' };
  }

  // Marca como usado imediatamente (Single-Use garantido)
  db.prepare(`UPDATE auth_tokens SET used = 1 WHERE id = ?`).run(record.id);

  if (type === 'password_reset') {
    try {
      db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?`).run(userId);
    } catch (e) {}
  }

  return { valid: true, tokenRecord: record };
}
