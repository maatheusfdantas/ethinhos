/**
 * ============================================================================
 * MÓDULO ISOLADO: OAUTH 2.0 GOOGLE CALENDAR (Google Identity Services + API v3)
 * ============================================================================
 * Implementa o fluxo de autenticação e vinculação com o Google Calendar:
 *
 * 1. Redirecionamento para tela de consentimento OAuth 2.0 do Google
 * 2. Rota de Callback para capturar o `code` e trocá-lo por `access_token` e `refresh_token`
 * 3. Armazenamento local do `refresh_token` vinculado a um usuário de teste
 * 4. Validação na API Google Calendar v3 (`GET /calendar/v3/users/me/calendarList`)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptAES256GCM, decryptAES256GCM } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Carrega variáveis do arquivo .env na raiz do projeto (caso exista)
function loadDotEnvIfPresent() {
  const envPath = path.join(rootDir, '.env');
  try {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Google OAuth] Aviso ao ler .env:', err.message);
  }
}

loadDotEnvIfPresent();

const CREDENTIALS_FILE = path.join(__dirname, 'google_oauth_credentials.tmp.json');

// ============================================================================
// CONFIGURAÇÃO DE CREDENCIAIS DO GOOGLE CLOUD CONSOLE
// ============================================================================
// Você pode:
// Opção A: Preencher diretamente pela interface web ao clicar em "Conectar com o Google"
// Opção B: Definir no arquivo .env na raiz (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET)
// Opção C: Colar diretamente nas variáveis abaixo:
export const GOOGLE_OAUTH_CONFIG = {
  // INSIRA SEU CLIENT ID AQUI (ex: "1234567890-abcdefg.apps.googleusercontent.com")
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'SEU_GOOGLE_CLIENT_ID_AQUI.apps.googleusercontent.com',

  // INSIRA SEU CLIENT SECRET AQUI (ex: "GOCSPX-xxxxxxxxxxxxxxxxxxxx")
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'SEU_GOOGLE_CLIENT_SECRET_AQUI',

  // INSIRA SUA REDIRECT URI AQUI (deve estar em "Authorized redirect URIs" no Google Cloud Console)
  REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback',

  // URL do Frontend para redirecionamento após concluir o callback
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Escopos oficiais da API v3 do Google Calendar
  SCOPES: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ]
};

// Carrega credenciais salvas via interface (se existirem)
function loadSavedCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
      if (saved.clientId) GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_ID = saved.clientId.trim();
      if (saved.clientSecret) GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_SECRET = saved.clientSecret.trim();
      if (saved.redirectUri) GOOGLE_OAUTH_CONFIG.REDIRECT_URI = saved.redirectUri.trim();
    }
  } catch (err) {
    console.warn('[Google OAuth] Aviso ao carregar credenciais salvas:', err.message);
  }
}

loadSavedCredentials();

export function hasValidClientCredentials() {
  const id = GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_ID || '';
  const secret = GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_SECRET || '';
  return (
    Boolean(id.trim()) &&
    Boolean(secret.trim()) &&
    !id.includes('SEU_GOOGLE_CLIENT_ID_AQUI') &&
    !secret.includes('SEU_GOOGLE_CLIENT_SECRET_AQUI')
  );
}

// Endpoints oficiais do Google Identity Services (OAuth 2.0) e Google Calendar API v3
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_LIST_ENDPOINT = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';

// ============================================================================
// ARMAZENAMENTO DE TOKENS (EM MEMÓRIA + ARQUIVO LOCAL PARA TESTE ISOLADO)
// ============================================================================
const TOKEN_STORAGE_FILE = path.join(__dirname, 'google_tokens.tmp.json');
const tokenMemoryStore = new Map();

function loadTokensFromDisk() {
  try {
    if (fs.existsSync(TOKEN_STORAGE_FILE)) {
      const raw = fs.readFileSync(TOKEN_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([userId, data]) => {
        tokenMemoryStore.set(userId, {
          ...data,
          access_token: data.access_token ? decryptAES256GCM(data.access_token) : null,
          refresh_token: data.refresh_token ? decryptAES256GCM(data.refresh_token) : null
        });
      });
    }
  } catch (err) {
    console.warn('[Google OAuth] Aviso ao ler arquivo temporário de tokens:', err.message);
  }
}

function saveUserTokens(userId, tokenPayload, validationCalendars = [], mode = 'google_live') {
  const existing = tokenMemoryStore.get(userId) || {};

  const record = {
    userId,
    mode,
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token || existing.refresh_token || null,
    scope: tokenPayload.scope,
    token_type: tokenPayload.token_type || 'Bearer',
    expires_in: tokenPayload.expires_in,
    updated_at: new Date().toISOString(),
    calendars_preview: validationCalendars
  };

  tokenMemoryStore.set(userId, record);

  try {
    const encryptedEntries = {};
    for (const [uid, rec] of tokenMemoryStore.entries()) {
      encryptedEntries[uid] = {
        ...rec,
        // Criptografa tokens OAuth em repouso no disco com AES-256-GCM
        access_token: rec.access_token ? encryptAES256GCM(rec.access_token) : null,
        refresh_token: rec.refresh_token ? encryptAES256GCM(rec.refresh_token) : null
      };
    }
    fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(encryptedEntries, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Google OAuth] Aviso ao persistir tokens em disco:', err.message);
  }

  return record;
}

loadTokensFromDisk();

// ============================================================================
// FUNÇÃO AUXILIAR: VALIDAÇÃO NA API GOOGLE CALENDAR V3
// ============================================================================
/**
 * Faz uma chamada real para `GET /calendar/v3/users/me/calendarList`
 * usando o `access_token` obtido para confirmar que a conexão funciona.
 */
async function validateGoogleCalendarConnection(accessToken) {
  const response = await fetch(GOOGLE_CALENDAR_LIST_ENDPOINT, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Status HTTP ${response.status}`;
    throw new Error(`Falha ao validar token na API Google Calendar: ${errorMsg}`);
  }

  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((cal) => ({
    id: cal.id,
    summary: cal.summary,
    primary: Boolean(cal.primary),
    timeZone: cal.timeZone,
    accessRole: cal.accessRole,
    backgroundColor: cal.backgroundColor
  }));
}

// ============================================================================
// REGISTRO DAS ROTAS EXPRESS
// ============================================================================
export function registerGoogleCalendarAuthRoutes(app) {
  /**
   * 0. ROTA PARA CONFIGURAR CREDENCIAIS OAUTH PELA INTERFACE (EVITA ERRO 401 invalid_client)
   * POST /api/auth/google/credentials
   */
  app.post('/api/auth/google/credentials', (req, res) => {
    const { clientId, clientSecret, redirectUri } = req.body || {};

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'Informe o GOOGLE_CLIENT_ID e o GOOGLE_CLIENT_SECRET.'
      });
    }

    GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_ID = String(clientId).trim();
    GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_SECRET = String(clientSecret).trim();
    if (redirectUri) {
      GOOGLE_OAUTH_CONFIG.REDIRECT_URI = String(redirectUri).trim();
    }

    try {
      fs.writeFileSync(
        CREDENTIALS_FILE,
        JSON.stringify(
          {
            clientId: GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_SECRET,
            redirectUri: GOOGLE_OAUTH_CONFIG.REDIRECT_URI
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch (err) {
      console.warn('[Google OAuth] Aviso ao salvar credenciais:', err.message);
    }

    return res.json({
      success: true,
      credentialsConfigured: hasValidClientCredentials(),
      redirectUri: GOOGLE_OAUTH_CONFIG.REDIRECT_URI
    });
  });

  /**
   * 1. ROTA DE INÍCIO DO FLUXO OAUTH 2.0
   * GET /api/auth/google?userId=test_user_1
   * Redireciona o navegador do usuário para a tela de consentimento do Google.
   */
  app.get('/api/auth/google', (req, res) => {
    const testUserId = req.query.userId || 'test_user_1';

    // Se o usuário ainda não preencheu o GOOGLE_CLIENT_ID real, evita mandar para a
    // tela de "Erro 401: invalid_client" do Google e avisa o Frontend para abrir o modal de configuração
    if (!hasValidClientCredentials()) {
      return res.redirect(
        `${GOOGLE_OAUTH_CONFIG.FRONTEND_URL}/?google_auth=needs_credentials&userId=${encodeURIComponent(testUserId)}`
      );
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_OAUTH_CONFIG.REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_OAUTH_CONFIG.SCOPES.join(' '),
      access_type: 'offline', // Obrigatório para receber o refresh_token
      prompt: 'consent',      // Garante a emissão do refresh_token no teste
      include_granted_scopes: 'true',
      state: testUserId
    });

    const authorizationUrl = `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
    return res.redirect(authorizationUrl);
  });

  /**
   * 1B. TELA DE CONSENTIMENTO SIMULADA (SANDBOX LOCAL DE DESENVOLVIMENTO)
   * GET /api/auth/google/sandbox-consent?userId=test_user_1
   * Permite testar todo o fluxo de redirecionamento -> callback (`?code=...`) -> armazenamento de
   * `refresh_token` -> listagem de calendários quando o desenvolvedor ainda não criou um projeto no Google Cloud Console.
   */
  app.get('/api/auth/google/sandbox-consent', (req, res) => {
    const testUserId = req.query.userId || 'test_user_1';
    const sandboxCode = `4/0AVG_sandbox_auth_code_${Date.now()}`;
    const callbackUrl = `/api/auth/google/callback?code=${encodeURIComponent(sandboxCode)}&state=${encodeURIComponent(testUserId)}&sandbox=true`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Fazer login com o Google (Sandbox OAuth 2.0)</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f4f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f1f1f; }
    .card { background: #fff; width: 100%; max-width: 420px; border-radius: 24px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    .badge { display: inline-block; background: #e8f0fe; color: #1967d2; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 600; margin: 0 0 8px 0; }
    p { font-size: 13.5px; color: #444746; line-height: 1.5; margin: 0 0 18px 0; }
    .scope-box { background: #f8fafd; border: 1px solid #dde3ea; border-radius: 14px; padding: 14px; margin-bottom: 22px; font-size: 13px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    .btn { padding: 10px 20px; border-radius: 999px; font-size: 13.5px; font-weight: 600; text-decoration: none; cursor: pointer; border: none; }
    .btn-cancel { background: transparent; color: #0b57d0; }
    .btn-allow { background: #0b57d0; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Simulador Local OAuth 2.0 • Google Identity Services</span>
    <h1>O app Ethos quer acessar sua Conta do Google</h1>
    <p>Conta de teste: <strong>lucas.dev@gmail.com</strong> (Usuário: <code>${testUserId}</code>)</p>
    <div class="scope-box">
      <strong>Permissões solicitadas (API Calendar v3):</strong>
      <ul style="margin: 8px 0 0 0; padding-left: 18px; color: #444746;">
        <li>Ver e baixar todas as agendas que você pode acessar no Google Agenda (<code>calendar.readonly</code>)</li>
        <li>Ver e editar eventos em todas as suas agendas (<code>calendar.events</code>)</li>
      </ul>
    </div>
    <div class="actions">
      <a class="btn btn-cancel" href="${GOOGLE_OAUTH_CONFIG.FRONTEND_URL}/?google_auth=error&message=Consentimento+cancelado+pelo+usuario">Cancelar</a>
      <a class="btn btn-allow" href="${callbackUrl}">Continuar e Autorizar</a>
    </div>
  </div>
</body>
</html>`);
  });

  /**
   * 2. ROTA DE CALLBACK DO GOOGLE OAUTH 2.0
   * GET /api/auth/google/callback
   * - Captura o código de autorização (`code`) retornado pelo Google
   * - Troca o `code` por `access_token` e `refresh_token` via POST
   * - Armazena o `refresh_token` vinculado ao usuário de teste
   * - Valida a conexão listando os calendários (`GET /calendar/v3/users/me/calendarList`)
   */
  app.get('/api/auth/google/callback', async (req, res) => {
    const { code, state, error, sandbox } = req.query;
    const testUserId = state || 'test_user_1';

    if (error) {
      return res.redirect(
        `${GOOGLE_OAUTH_CONFIG.FRONTEND_URL}/?google_auth=error&message=${encodeURIComponent(String(error))}`
      );
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Código de autorização (code) não foi fornecido pelo Google no callback.'
      });
    }

    // Modo Sandbox Local (caso o desenvolvedor esteja testando o fluxo sem credenciais do Cloud Console)
    if (sandbox === 'true' || String(code).startsWith('4/0AVG_sandbox_auth_code_')) {
      const simulatedTokens = {
        access_token: `ya29.a0AfB_byC_sandbox_access_${Date.now()}`,
        refresh_token: `1//0g_sandbox_refresh_token_${Date.now()}_ethos`,
        scope: GOOGLE_OAUTH_CONFIG.SCOPES.join(' '),
        token_type: 'Bearer',
        expires_in: 3599
      };

      const simulatedCalendars = [
        {
          id: 'lucas.dev@gmail.com',
          summary: 'Agenda Principal (Lucas Dev)',
          primary: true,
          timeZone: 'America/Sao_Paulo',
          accessRole: 'owner',
          backgroundColor: '#4285F4'
        },
        {
          id: 'faculdade_uf@group.calendar.google.com',
          summary: 'Faculdade & Prazos Acadêmicos',
          primary: false,
          timeZone: 'America/Sao_Paulo',
          accessRole: 'writer',
          backgroundColor: '#7C6FEF'
        },
        {
          id: 'pt.brazilian#holiday@group.v.calendar.google.com',
          summary: 'Feriados no Brasil',
          primary: false,
          timeZone: 'America/Sao_Paulo',
          accessRole: 'reader',
          backgroundColor: '#0B8043'
        }
      ];

      saveUserTokens(testUserId, simulatedTokens, simulatedCalendars, 'sandbox_simulation');
      return res.redirect(
        `${GOOGLE_OAUTH_CONFIG.FRONTEND_URL}/?google_auth=success&userId=${encodeURIComponent(testUserId)}`
      );
    }

    try {
      // ----------------------------------------------------------------------
      // ETAPA A: Trocar o `code` pelos tokens (`access_token` e `refresh_token`)
      // ----------------------------------------------------------------------
      const tokenRequestBody = new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_OAUTH_CONFIG.REDIRECT_URI,
        grant_type: 'authorization_code'
      });

      const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenRequestBody.toString()
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('[Google OAuth] Erro ao trocar code por token:', tokenData);
        return res.redirect(
          `${GOOGLE_OAUTH_CONFIG.FRONTEND_URL}/?google_auth=error&message=${encodeURIComponent(
            tokenData.error_description || tokenData.error || 'Falha ao trocar code por token.'
          )}`
        );
      }

      // ----------------------------------------------------------------------
      // ETAPA B: Validar o token chamando a API Google Calendar v3
      // GET https://www.googleapis.com/calendar/v3/users/me/calendarList
      // ----------------------------------------------------------------------
      const calendars = await validateGoogleCalendarConnection(tokenData.access_token);

      // ----------------------------------------------------------------------
      // ETAPA C: Salvar o `refresh_token` e `access_token` para o usuário de teste
      // ----------------------------------------------------------------------
      const savedRecord = saveUserTokens(testUserId, tokenData, calendars, 'google_live');

      console.log(
        `[Google OAuth] Sucesso! Usuário "${testUserId}" conectado. Calendários encontrados: ${calendars.length}. Refresh token salvo: ${Boolean(savedRecord.refresh_token)}`
      );

      if (req.query.format === 'json') {
        return res.json({
          success: true,
          message: 'Conta Google conectada, refresh_token armazenado e API Calendar v3 validada com sucesso!',
          userId: testUserId,
          hasRefreshToken: Boolean(savedRecord.refresh_token),
          calendars
        });
      }

      return res.redirect(
        `${GOOGLE_OAUTH_CONFIG.FRONTEND_URL}/?google_auth=success&userId=${encodeURIComponent(testUserId)}`
      );
    } catch (err) {
      console.error('[Google OAuth] Exceção no callback:', err);
      return res.redirect(
        `${GOOGLE_OAUTH_CONFIG.FRONTEND_URL}/?google_auth=error&message=${encodeURIComponent(err.message)}`
      );
    }
  });

  /**
   * 3. ROTA DE STATUS E VALIDAÇÃO AO VIVO PARA O FRONTEND
   * GET /api/auth/google/status?userId=test_user_1
   */
  app.get('/api/auth/google/status', async (req, res) => {
    const testUserId = req.query.userId || 'test_user_1';
    const record = tokenMemoryStore.get(testUserId);
    const credentialsConfigured = hasValidClientCredentials();

    if (!record) {
      return res.json({
        connected: false,
        userId: testUserId,
        credentialsConfigured,
        clientIdPreview: credentialsConfigured
          ? `${GOOGLE_OAUTH_CONFIG.GOOGLE_CLIENT_ID.slice(0, 18)}...`
          : null,
        redirectUri: GOOGLE_OAUTH_CONFIG.REDIRECT_URI
      });
    }

    let liveCalendars = record.calendars_preview || [];
    let validationError = null;

    if (req.query.validate === 'true' && record.access_token && record.mode === 'google_live') {
      try {
        liveCalendars = await validateGoogleCalendarConnection(record.access_token);
        record.calendars_preview = liveCalendars;
      } catch (err) {
        validationError = err.message;
      }
    }

    return res.json({
      connected: true,
      mode: record.mode || 'google_live',
      userId: testUserId,
      credentialsConfigured,
      redirectUri: GOOGLE_OAUTH_CONFIG.REDIRECT_URI,
      hasAccessToken: Boolean(record.access_token),
      hasRefreshToken: Boolean(record.refresh_token),
      refreshTokenPreview: record.refresh_token
        ? `${record.refresh_token.slice(0, 14)}...`
        : null,
      updatedAt: record.updated_at,
      calendars: liveCalendars,
      validationError
    });
  });

  /**
   * 4. ROTA PARA DESCONECTAR / LIMPAR TOKENS DE TESTE
   * DELETE /api/auth/google/disconnect?userId=test_user_1
   */
  app.delete('/api/auth/google/disconnect', (req, res) => {
    const testUserId = req.query.userId || 'test_user_1';
    tokenMemoryStore.delete(testUserId);
    try {
      const serialized = Object.fromEntries(tokenMemoryStore.entries());
      fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (err) {
      // ignora erro de escrita
    }
    return res.json({ success: true, disconnected: true, userId: testUserId });
  });
}
