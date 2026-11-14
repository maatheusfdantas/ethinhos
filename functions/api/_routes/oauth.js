/**
 * OAuth 2.0 Google Calendar e Microsoft Graph.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

import { signJwtEdge } from '../_lib/auth.js';
import { ALL_PERMS } from '../_lib/constants.js';
import { edgeFallbackMemory } from '../_lib/db.js';
import { jsonResponse } from '../_lib/http.js';

/** Devolve a Response da rota correspondente, ou null se nenhuma rota deste domínio casar. */
export async function handleOAuthRoutes(ctx) {
  const { request, env, correlationId, url, pathname, method, body, storage } = ctx;

  // --------------------------------------------------------------------------
  // ROTAS GOOGLE CALENDAR OAUTH 2.0 (`/api/auth/google/*`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/google/status' && method === 'GET') {
    const userId = url.searchParams.get('userId') || 'test_user_1';
    const record = edgeFallbackMemory.googleTokens.get(userId);
    const clientId = env?.GOOGLE_CLIENT_ID || edgeFallbackMemory.googleCreds.clientId || '';
    const credentialsConfigured = Boolean(clientId && !clientId.includes('SEU_GOOGLE_CLIENT_ID_AQUI'));
    const redirectUri = `${url.origin}/api/auth/google/callback`;

    if (!record) {
      return jsonResponse({ connected: false, userId, credentialsConfigured, redirectUri }, 200, correlationId, request);
    }
    return jsonResponse(
      {
        connected: true,
        userId,
        credentialsConfigured,
        redirectUri,
        hasAccessToken: true,
        hasRefreshToken: true,
        refreshTokenPreview: '1//0g_cf_d1...',
        calendars: record.calendars || []
      },
      200,
      correlationId,
      request
    );
  }

  if (pathname === '/api/auth/google/credentials' && method === 'POST') {
    edgeFallbackMemory.googleCreds = {
      clientId: String(body.clientId || '').trim(),
      clientSecret: String(body.clientSecret || '').trim()
    };
    return jsonResponse({ success: true, credentialsConfigured: true }, 200, correlationId, request);
  }

  if (pathname === '/api/auth/google/sandbox-consent' && method === 'GET') {
    const userId = url.searchParams.get('userId') || 'test_user_1';
    edgeFallbackMemory.googleTokens.set(userId, {
      calendars: [
        { id: 'primary', summary: 'Agenda Principal (Google Calendar)', primary: true, timeZone: 'America/Sao_Paulo', backgroundColor: '#4285F4' },
        { id: 'faculdade', summary: 'Faculdade & Prazos', primary: false, timeZone: 'America/Sao_Paulo', backgroundColor: '#7C6FEF' }
      ]
    });
    return Response.redirect(`${url.origin}/?google_auth=success&userId=${encodeURIComponent(userId)}`, 302);
  }

  if (pathname === '/api/auth/google/disconnect' && method === 'DELETE') {
    const userId = url.searchParams.get('userId') || 'test_user_1';
    edgeFallbackMemory.googleTokens.delete(userId);
    return jsonResponse({ success: true, disconnected: true }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // ROTAS UNIFICADAS OAUTH 2.0 GOOGLE & MICROSOFT GRAPH (`/api/auth/oauth/*`)
  // --------------------------------------------------------------------------
  const oauthStartMatch = pathname.match(/^\/api\/auth\/oauth\/(google|microsoft)$/);
  if (oauthStartMatch && method === 'GET') {
    const provider = oauthStartMatch[1];
    const action = url.searchParams.get('action') || 'login';
    const currentUserId = url.searchParams.get('userId') || null;

    const clientId = provider === 'google'
      ? (env?.GOOGLE_CLIENT_ID || 'SEU_GOOGLE_CLIENT_ID_AQUI.apps.googleusercontent.com')
      : (env?.MICROSOFT_CLIENT_ID || 'SEU_MICROSOFT_CLIENT_ID_AQUI');

    const isPlaceholder = !clientId || clientId.includes('SEU_GOOGLE_CLIENT_ID') || clientId.includes('SEU_MICROSOFT_CLIENT_ID');

    // Se as credenciais ainda não foram cadastradas no Cloudflare Pages:
    if (isPlaceholder) {
      const providerLabel = provider === 'google' ? 'Google Calendar' : 'Microsoft Graph (Outlook)';
      const instructions = encodeURIComponent(
        `As credenciais OAuth do ${providerLabel} ainda precisam ser inseridas no painel do Cloudflare Pages (Settings > Environment Variables) ou no .env.`
      );
      return Response.redirect(`${url.origin}/?auth_error=${instructions}`, 302);
    }

    const redirectUri = `${url.origin}/api/auth/oauth/callback/${provider}`;
    const rawState = JSON.stringify({
      provider,
      action,
      userId: currentUserId,
      nonce: Math.random().toString(36).slice(2),
      timestamp: Date.now()
    });
    const stateEncoded = btoa(rawState).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    let authUrl = '';
    if (provider === 'google') {
      const scopes = [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ');
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${stateEncoded}`;
    } else {
      const tenant = env?.MICROSOFT_TENANT_ID || 'common';
      const scopes = [
        'openid',
        'profile',
        'email',
        'offline_access',
        'Calendars.ReadWrite'
      ].join(' ');
      authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&prompt=select_account&state=${stateEncoded}`;
    }

    return Response.redirect(authUrl, 302);
  }

  const oauthCallbackMatch = pathname.match(/^\/api\/auth\/oauth\/callback\/(google|microsoft)$/);
  if (oauthCallbackMatch && method === 'GET') {
    const provider = oauthCallbackMatch[1];
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');

    if (errorParam) {
      return Response.redirect(`${url.origin}/?auth_error=${encodeURIComponent(errorDesc || errorParam)}`, 302);
    }

    if (!code) {
      return Response.redirect(`${url.origin}/?auth_error=Codigo_autorizacao_ausente`, 302);
    }

    const clientId = provider === 'google' ? env?.GOOGLE_CLIENT_ID : env?.MICROSOFT_CLIENT_ID;
    const clientSecret = provider === 'google' ? env?.GOOGLE_CLIENT_SECRET : env?.MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${url.origin}/api/auth/oauth/callback/${provider}`;

    try {
      const tokenUrl = provider === 'google'
        ? 'https://oauth2.googleapis.com/token'
        : `https://login.microsoftonline.com/${env?.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`;

      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      });

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString()
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.error_description || tokenData.error || 'Erro ao trocar código por token.');
      }

      const userInfoUrl = provider === 'google'
        ? 'https://www.googleapis.com/oauth2/v3/userinfo'
        : 'https://graph.microsoft.com/v1.0/me';

      const userRes = await fetch(userInfoUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await userRes.json();
      if (!userRes.ok) throw new Error('Erro ao obter perfil do usuário.');

      const providerAccountId = provider === 'google' ? profile.sub : profile.id;
      const email = provider === 'google' ? profile.email : (profile.mail || profile.userPrincipalName);
      const name = provider === 'google' ? (profile.name || email?.split('@')[0]) : (profile.displayName || email?.split('@')[0]);
      const avatar = provider === 'google' ? (profile.picture || '') : '';

      const nowIso = new Date().toISOString();

      let user = null;
      if (storage.mode === 'd1') {
        const existingAcc = await storage.db
          .prepare('SELECT * FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?')
          .bind(provider, providerAccountId)
          .first();

        if (existingAcc) {
          user = await storage.db.prepare('SELECT * FROM users WHERE id = ?').bind(existingAcc.user_id).first();
        }

        if (!user && email) {
          user = await storage.db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').bind(email.toLowerCase()).first();
        }

        if (!user) {
          const newId = `usr_${Date.now()}`;
          const cleanUsername = (email ? email.split('@')[0] : 'user') + '_' + Math.random().toString(36).substring(2, 6);
          await storage.db.prepare(`
            INSERT INTO users (id, username, email, password, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, email_verified, created_at)
            VALUES (?, ?, ?, 'OAUTH_FEDERATED_ACCOUNT', ?, ?, 'user', 1, 'Gratuito', 1, ?, 0, 0, 1, ?)
          `).bind(newId, cleanUsername, email, name, avatar || name.slice(0, 2).toUpperCase(), ALL_PERMS, nowIso).run();
          user = await storage.db.prepare('SELECT * FROM users WHERE id = ?').bind(newId).first();
        }

        const oauthId = `oa_${Date.now()}`;
        const expiresAtIso = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
        try {
          await storage.db.prepare(`
            INSERT INTO oauth_accounts (id, user_id, provider, provider_account_id, provider_email, access_token, refresh_token, token_expires_at, scope, updated_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(oauthId, user.id, provider, providerAccountId, email, tokenData.access_token, tokenData.refresh_token || '', expiresAtIso, tokenData.scope || '', nowIso, nowIso).run();
        } catch (_e) {}
      }

      const appAccessToken = await signJwtEdge({ sub: user?.id || 'usr_oauth', username: user?.username || 'user', role: user?.role || 'user' }, env, 3600);
      const appRefreshToken = await signJwtEdge({ sub: user?.id || 'usr_oauth', username: user?.username || 'user', role: user?.role || 'user', type: 'refresh' }, env, 7 * 24 * 3600);

      const redirectParams = new URLSearchParams({
        auth_success: 'true',
        access_token: appAccessToken,
        refresh_token: appRefreshToken,
        user: JSON.stringify({
          id: user?.id || 'usr_oauth',
          username: user?.username || 'user',
          email: user?.email || email,
          name: user?.name || name,
          role: user?.role || 'user',
          avatar: user?.avatar || avatar
        })
      });

      return Response.redirect(`${url.origin}/?${redirectParams.toString()}`, 302);
    } catch (err) {
      console.error('[OAuth Edge Error]:', err);
      return Response.redirect(`${url.origin}/?auth_error=${encodeURIComponent(err.message)}`, 302);
    }
  }

  return null;
}

