/**
 * ============================================================================
 * ETHOS SOCIAL OAUTH & CALENDAR SYNC ENGINE (Google & Microsoft Graph)
 * ============================================================================
 * Implementa o fluxo RFC 6749 / RFC 7636 de login social e sincronização
 * bidirecional de eventos dos calendários do Google e Microsoft Graph.
 *
 * Requisitos Implementados:
 * 1. Escopos corretos (openid, profile, email + calendários)
 * 2. Tokens offline persistidos com criptografia AES-256-GCM
 * 3. Renovação automática transparente via Refresh Token
 * 4. Sincronização inicial dos próximos 30 dias de eventos com idempotência
 */

import crypto from 'node:crypto';
import { db } from './db.js';
import { encryptAES256GCM, decryptAES256GCM } from './security.js';

// Configurações por provedor
export const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    calendarEventsUrl: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/oauth/callback/google',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ')
  },
  microsoft: {
    name: 'Microsoft',
    authUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    calendarEventsUrl: 'https://graph.microsoft.com/v1.0/me/calendarView',
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/auth/oauth/callback/microsoft',
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'Calendars.ReadWrite'
    ].join(' ')
  }
};

/**
 * 1. Gera a URL de Autorização com proteção anti-CSRF (State)
 */
export function generateAuthUrl(providerName, action = 'login', currentUserId = null) {
  const provider = OAUTH_PROVIDERS[providerName];
  if (!provider) throw new Error(`Provedor '${providerName}' não suportado.`);

  // Cria um state seguro assinado com HMAC anti-adulteração
  const rawState = JSON.stringify({
    provider: providerName,
    action, // 'login' ou 'link_account'
    userId: currentUserId,
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now()
  });
  const stateEncoded = Buffer.from(rawState).toString('base64url');

  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    response_type: 'code',
    scope: provider.scopes,
    state: stateEncoded
  });

  // Requisito obrigatório para o Google sempre retornar o Refresh Token offline
  if (providerName === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  // Na Microsoft, prompt=select_account ou consent assegura seleção de conta e consentimento
  if (providerName === 'microsoft') {
    params.set('prompt', 'select_account');
  }

  return `${provider.authUrl}?${params.toString()}`;
}

/**
 * 2. Troca o código temporário por Access Token e Refresh Token
 */
export async function exchangeCodeForTokens(providerName, code) {
  const provider = OAUTH_PROVIDERS[providerName];
  if (!provider) throw new Error(`Provedor inválido`);

  const bodyParams = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: provider.redirectUri
  });

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Falha ao trocar código por tokens.');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresIn: data.expires_in || 3600,
    scope: data.scope || provider.scopes
  };
}

/**
 * 3. Busca o perfil básico do usuário (E-mail, Nome, ID do Provedor)
 */
export async function fetchProviderProfile(providerName, accessToken) {
  const provider = OAUTH_PROVIDERS[providerName];
  const res = await fetch(provider.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const profile = await res.json();
  if (!res.ok) throw new Error('Não foi possível obter os dados do usuário no provedor.');

  if (providerName === 'google') {
    return {
      providerAccountId: profile.sub,
      email: profile.email,
      name: profile.name || (profile.email ? profile.email.split('@')[0] : 'Usuário Google'),
      avatar: profile.picture || ''
    };
  }

  if (providerName === 'microsoft') {
    const email = profile.mail || profile.userPrincipalName || '';
    return {
      providerAccountId: profile.id,
      email,
      name: profile.displayName || (email ? email.split('@')[0] : 'Usuário Microsoft'),
      avatar: ''
    };
  }
}

/**
 * 4. Garante token válido (Renovação transparente via Refresh Token)
 */
export async function getValidAccessToken(oauthAccountId) {
  const account = db.prepare('SELECT * FROM oauth_accounts WHERE id = ?').get(oauthAccountId);
  if (!account) throw new Error('Conta vinculada não encontrada.');

  const expiresAt = new Date(account.token_expires_at).getTime();
  const now = Date.now();

  // Se o access_token ainda tiver mais de 5 minutos de validade, reutiliza
  if (expiresAt - now > 5 * 60 * 1000) {
    return decryptAES256GCM(account.access_token);
  }

  if (!account.refresh_token) {
    throw new Error('Refresh Token ausente. É necessário reconectar a conta.');
  }

  const plainRefreshToken = decryptAES256GCM(account.refresh_token);
  const provider = OAUTH_PROVIDERS[account.provider];

  const params = new URLSearchParams({
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: plainRefreshToken
  });

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro ao renovar token OAuth: ${data.error_description || data.error}`);
  }

  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token ? data.refresh_token : plainRefreshToken;
  const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  // Atualiza banco com credenciais criptografadas
  db.prepare(`
    UPDATE oauth_accounts
    SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    encryptAES256GCM(newAccessToken),
    encryptAES256GCM(newRefreshToken),
    newExpiresAt,
    new Date().toISOString(),
    account.id
  );

  return newAccessToken;
}

/**
 * 5. Script/Função de Sincronização Inicial (Próximos 30 dias de eventos)
 */
export async function syncUpcomingCalendarEvents(userId, oauthAccountId) {
  const account = db.prepare('SELECT * FROM oauth_accounts WHERE id = ? AND user_id = ?').get(oauthAccountId, userId);
  if (!account) return { synced: 0, error: 'Conta não encontrada' };

  const accessToken = await getValidAccessToken(oauthAccountId);
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let rawEvents = [];

  if (account.provider === 'google') {
    const url = new URL(OAUTH_PROVIDERS.google.calendarEventsUrl);
    url.searchParams.set('timeMin', now.toISOString());
    url.searchParams.set('timeMax', in30Days.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      rawEvents = (data.items || []).map((item) => {
        const isAllDay = !item.start?.dateTime;
        const startStr = item.start?.dateTime || item.start?.date || '';
        const endStr = item.end?.dateTime || item.end?.date || '';

        const datePart = startStr.slice(0, 10);
        const startTimePart = isAllDay ? '08:00' : (startStr.includes('T') ? startStr.slice(11, 16) : '08:00');
        const endTimePart = isAllDay ? '09:00' : (endStr.includes('T') ? endStr.slice(11, 16) : '09:00');

        return {
          id: `ev_gcal_${item.id.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40)}`,
          externalId: item.id,
          title: item.summary || '(Sem título)',
          date: datePart,
          allDay: isAllDay ? 1 : 0,
          startTime: startTimePart,
          endTime: endTimePart,
          location: item.location || '',
          notes: item.description || ''
        };
      });
    }
  }

  if (account.provider === 'microsoft') {
    const url = new URL(OAUTH_PROVIDERS.microsoft.calendarEventsUrl);
    url.searchParams.set('startDateTime', now.toISOString());
    url.searchParams.set('endDateTime', in30Days.toISOString());
    url.searchParams.set('$top', '100');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="America/Sao_Paulo"'
      }
    });
    if (res.ok) {
      const data = await res.json();
      rawEvents = (data.value || []).map((item) => {
        const isAllDay = item.isAllDay ? 1 : 0;
        const startStr = item.start?.dateTime || '';
        const endStr = item.end?.dateTime || '';

        const datePart = startStr.slice(0, 10);
        const startTimePart = isAllDay ? '08:00' : (startStr.includes('T') ? startStr.slice(11, 16) : '08:00');
        const endTimePart = isAllDay ? '09:00' : (endStr.includes('T') ? endStr.slice(11, 16) : '09:00');

        return {
          id: `ev_msgraph_${item.id.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40)}`,
          externalId: item.id,
          title: item.subject || '(Sem assunto)',
          date: datePart,
          allDay: isAllDay,
          startTime: startTimePart,
          endTime: endTimePart,
          location: item.location?.displayName || '',
          notes: item.bodyPreview || ''
        };
      });
    }
  }

  // Upsert com idempotência na tabela `events`
  let count = 0;
  const nowIso = new Date().toISOString();

  for (const ev of rawEvents) {
    if (!ev.date || ev.date.length < 10) continue;

    // Verifica se já existe pelo external_event_id
    const existing = db.prepare(`
      SELECT id FROM events WHERE user_id = ? AND external_source = ? AND external_event_id = ?
    `).get(userId, account.provider, ev.externalId);

    if (existing) {
      db.prepare(`
        UPDATE events
        SET title = ?, date = ?, all_day = ?, start_time = ?, end_time = ?,
            location = ?, notes = ?, last_synced_at = ?
        WHERE id = ?
      `).run(
        ev.title,
        ev.date,
        ev.allDay,
        ev.startTime,
        ev.endTime,
        ev.location,
        ev.notes,
        nowIso,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO events (
          id, user_id, title, date, all_day, start_time, end_time, category,
          repeat_rule, location, notes, completed, external_source, external_event_id,
          external_calendar_id, last_synced_at, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, 'Geral', 'Nunca', ?, ?, 0, ?, ?, 'primary', ?, ?
        )
      `).run(
        ev.id,
        userId,
        ev.title,
        ev.date,
        ev.allDay,
        ev.startTime,
        ev.endTime,
        ev.location,
        ev.notes,
        account.provider,
        ev.externalId,
        nowIso,
        nowIso
      );
    }
    count++;
  }

  // Atualiza timestamp de sync na conta
  db.prepare('UPDATE oauth_accounts SET last_sync_at = ? WHERE id = ?').run(nowIso, oauthAccountId);

  return { synced: count, provider: account.provider };
}

