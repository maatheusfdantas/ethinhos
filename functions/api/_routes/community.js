/**
 * Comunidade e Conexões (amizades, solicitações, busca de usuários na rede Ethos).
 * Compatível com Cloudflare Pages Functions + D1 SQL.
 */
import { jsonResponse } from '../_lib/http.js';

export async function handleCommunityRoutes(ctx) {
  const { request, correlationId, pathname, method, body, storage, authClaims } = ctx;

  // --------------------------------------------------------------------------
  // 1. BUSCAR USUÁRIOS NA REDE (`GET /api/community/users`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/community/users' && method === 'GET') {
    if (!authClaims) {
      return jsonResponse({ error: 'Não autorizado: Token JWT obrigatório.' }, 401, correlationId, request);
    }

    const currentUserId = authClaims.sub;
    const url = new URL(request.url);
    const rawQ = url.searchParams.get('q') || '';
    const q = rawQ.trim().replace(/^@/, '');

    let users = [];

    if (storage.mode === 'd1') {
      if (q) {
        const term = `%${q.toLowerCase()}%`;
        const res = await storage.db
          .prepare(
            `SELECT id, username, name, avatar, bio, streak_days, points
             FROM users
             WHERE (LOWER(username) LIKE ? OR LOWER(name) LIKE ?)
               AND id != ?
               AND is_public = 1
               AND is_active = 1
               AND COALESCE(role, 'user') != 'admin'
             LIMIT 20`
          )
          .bind(term, term, currentUserId)
          .all();
        users = res.results || [];
      } else {
        const res = await storage.db
          .prepare(
            `SELECT id, username, name, avatar, bio, streak_days, points
             FROM users
             WHERE id != ?
               AND is_public = 1
               AND is_active = 1
               AND COALESCE(role, 'user') != 'admin'
             ORDER BY streak_days DESC, points DESC
             LIMIT 15`
          )
          .bind(currentUserId)
          .all();
        users = res.results || [];
      }

      const enriched = [];
      for (const u of users) {
        const friendRow = await storage.db
          .prepare(`SELECT status FROM friends WHERE user_id = ? AND friend_id = ?`)
          .bind(currentUserId, u.id)
          .first();
        enriched.push({
          ...u,
          status: friendRow?.status || 'none'
        });
      }

      return jsonResponse({ users: enriched }, 200, correlationId, request);
    } else {
      // Fallback em memória
      const allUsers = Array.from(storage.store.users.values());
      let filtered = allUsers.filter(
        (u) => u.id !== currentUserId && (u.is_public ?? 1) === 1 && (u.is_active ?? 1) === 1 && u.role !== 'admin'
      );
      if (q) {
        const qLower = q.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            (u.username || '').toLowerCase().includes(qLower) ||
            (u.name || '').toLowerCase().includes(qLower)
        );
      } else {
        filtered.sort((a, b) => (b.streak_days || 0) - (a.streak_days || 0) || (b.points || 0) - (a.points || 0));
      }

      const enriched = filtered.slice(0, 20).map((u) => {
        const connKey = `${currentUserId}_${u.id}`;
        const friendRow = storage.store.friends?.get(connKey);
        return {
          id: u.id,
          username: u.username,
          name: u.name,
          avatar: u.avatar || '',
          bio: u.bio || '',
          streak_days: u.streak_days || 0,
          points: u.points || 0,
          status: friendRow?.status || 'none'
        };
      });

      return jsonResponse({ users: enriched }, 200, correlationId, request);
    }
  }

  // --------------------------------------------------------------------------
  // 2. LISTAR CONEXÕES ATIVAS / PENDENTES (`GET /api/user/:id/connections`)
  // --------------------------------------------------------------------------
  const connectionsMatch = pathname.match(/^\/api\/user\/([^/]+)\/connections$/);
  if (connectionsMatch && method === 'GET') {
    const userId = connectionsMatch[1];

    if (storage.mode === 'd1') {
      const res = await storage.db
        .prepare(
          `SELECT f.id, f.friend_id,
                  COALESCE(u.name, f.friend_name) AS friend_name,
                  COALESCE(u.avatar, f.friend_avatar) AS friend_avatar,
                  COALESCE(u.bio, f.friend_bio) AS friend_bio,
                  COALESCE(u.username, f.friend_username) AS friend_username,
                  f.status,
                  COALESCE(u.streak_days, 0) AS streak_days,
                  COALESCE(u.points, 0) AS points
           FROM friends f
           LEFT JOIN users u ON u.id = f.friend_id
           WHERE f.user_id = ? AND COALESCE(u.role, 'user') != 'admin'
           ORDER BY f.created_at DESC`
        )
        .bind(userId)
        .all();

      return jsonResponse({ connections: res.results || [] }, 200, correlationId, request);
    } else {
      const list = Array.from(storage.store.friends?.values() || [])
        .filter((f) => f.user_id === userId)
        .map((f) => {
          const friendUser = storage.store.users.get(f.friend_id);
          return {
            ...f,
            friend_name: friendUser?.name || f.friend_name,
            friend_avatar: friendUser?.avatar || f.friend_avatar,
            friend_bio: friendUser?.bio || f.friend_bio,
            friend_username: friendUser?.username || f.friend_username,
            streak_days: friendUser?.streak_days || 0,
            points: friendUser?.points || 0
          };
        });

      return jsonResponse({ connections: list }, 200, correlationId, request);
    }
  }

  // --------------------------------------------------------------------------
  // 3. ENVIAR SOLICITAÇÃO DE CONEXÃO (`POST /api/user/:id/connect`)
  // --------------------------------------------------------------------------
  const connectMatch = pathname.match(/^\/api\/user\/([^/]+)\/connect$/);
  if (connectMatch && method === 'POST') {
    const userId = connectMatch[1];
    const { targetUserId, targetUsername } = body || {};

    if (!targetUserId && !targetUsername) {
      return jsonResponse({ error: 'Informe targetUserId ou targetUsername.' }, 400, correlationId, request);
    }

    let target = null;
    if (storage.mode === 'd1') {
      if (targetUserId) {
        target = await storage.db
          .prepare(`SELECT id, username, name, avatar, bio, is_public, role FROM users WHERE id = ?`)
          .bind(targetUserId)
          .first();
      } else if (targetUsername) {
        const cleanU = targetUsername.trim().replace(/^@/, '');
        target = await storage.db
          .prepare(`SELECT id, username, name, avatar, bio, is_public, role FROM users WHERE LOWER(username) = LOWER(?)`)
          .bind(cleanU)
          .first();
      }
      // Auditoria S6: perfil privado não expõe a bio para quem ainda não é conexão.
      if (target && target.is_public === 0) target.bio = '';
      if (target) delete target.is_public;
      // Correção D (20/11/2026): contas de administrador não entram em amizades.
      if (target && target.role === 'admin') target = null;
      if (target) delete target.role;
    } else {
      if (targetUserId) {
        target = storage.store.users.get(targetUserId) || null;
      } else if (targetUsername) {
        const cleanU = targetUsername.trim().replace(/^@/, '').toLowerCase();
        target = Array.from(storage.store.users.values()).find((u) => (u.username || '').toLowerCase() === cleanU) || null;
      }
      if (target && target.role === 'admin') target = null;
    }

    if (!target) {
      return jsonResponse({ error: 'Usuário não encontrado na rede Ethos.' }, 404, correlationId, request);
    }

    if (target.id === userId) {
      return jsonResponse({ error: 'Você não pode conectar consigo mesmo.' }, 400, correlationId, request);
    }

    let currentUser = null;
    if (storage.mode === 'd1') {
      currentUser = await storage.db
        .prepare(`SELECT id, username, name, avatar, bio FROM users WHERE id = ?`)
        .bind(userId)
        .first();
    } else {
      currentUser = storage.store.users.get(userId) || null;
    }

    const nowIso = new Date().toISOString();

    // Checar se já existe status prévio
    let existingConn = null;
    if (storage.mode === 'd1') {
      existingConn = await storage.db
        .prepare(`SELECT status FROM friends WHERE user_id = ? AND friend_id = ?`)
        .bind(userId, target.id)
        .first();
    } else {
      existingConn = storage.store.friends?.get(`${userId}_${target.id}`) || null;
    }

    if (existingConn?.status === 'approved') {
      return jsonResponse({ error: 'Vocês já são conectados.' }, 400, correlationId, request);
    }

    // Se o outro usuário já enviou pedido para nós, aprova mutuamente
    if (existingConn?.status === 'pending_received') {
      if (storage.mode === 'd1') {
        await storage.db
          .prepare(
            `UPDATE friends SET status = 'approved', updated_at = ?
             WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`
          )
          .bind(nowIso, userId, target.id, target.id, userId)
          .run();
      } else {
        const c1 = storage.store.friends.get(`${userId}_${target.id}`);
        if (c1) { c1.status = 'approved'; c1.updated_at = nowIso; }
        const c2 = storage.store.friends.get(`${target.id}_${userId}`);
        if (c2) { c2.status = 'approved'; c2.updated_at = nowIso; }
      }

      return jsonResponse({ success: true, target, status: 'approved' }, 200, correlationId, request);
    }

    const c1Id = `conn_${userId}_${target.id}`;
    const c2Id = `conn_${target.id}_${userId}`;

    if (storage.mode === 'd1') {
      await storage.db.batch([
        storage.db.prepare(
          `INSERT INTO friends (id, user_id, friend_id, friend_name, friend_avatar, friend_bio, friend_username, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_sent', ?, ?)
           ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'pending_sent', updated_at = excluded.updated_at`
        ).bind(c1Id, userId, target.id, target.name, target.avatar || '', target.bio || '', target.username || '', nowIso, nowIso),
        storage.db.prepare(
          `INSERT INTO friends (id, user_id, friend_id, friend_name, friend_avatar, friend_bio, friend_username, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_received', ?, ?)
           ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'pending_received', updated_at = excluded.updated_at`
        ).bind(c2Id, target.id, userId, currentUser?.name || 'Usuário', currentUser?.avatar || 'U', currentUser?.bio || '', currentUser?.username || '', nowIso, nowIso)
      ]);
    } else {
      if (!storage.store.friends) storage.store.friends = new Map();
      storage.store.friends.set(`${userId}_${target.id}`, {
        id: c1Id,
        user_id: userId,
        friend_id: target.id,
        friend_name: target.name,
        friend_avatar: target.avatar || '',
        friend_bio: target.bio || '',
        friend_username: target.username || '',
        status: 'pending_sent',
        created_at: nowIso,
        updated_at: nowIso
      });
      storage.store.friends.set(`${target.id}_${userId}`, {
        id: c2Id,
        user_id: target.id,
        friend_id: userId,
        friend_name: currentUser?.name || 'Usuário',
        friend_avatar: currentUser?.avatar || 'U',
        friend_bio: currentUser?.bio || '',
        friend_username: currentUser?.username || '',
        status: 'pending_received',
        created_at: nowIso,
        updated_at: nowIso
      });
    }

    return jsonResponse({ success: true, target, status: 'pending_sent' }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // 4. ACEITAR SOLICITAÇÃO DE CONEXÃO (`PUT /api/user/:id/connect/:friendId/accept`)
  // --------------------------------------------------------------------------
  const acceptMatch = pathname.match(/^\/api\/user\/([^/]+)\/connect\/([^/]+)\/accept$/);
  if (acceptMatch && method === 'PUT') {
    const [, userId, friendId] = acceptMatch;
    const nowIso = new Date().toISOString();

    if (storage.mode === 'd1') {
      // Auditoria S6: só quem RECEBEU o pedido pode aceitar (antes, quem enviou aceitava o próprio pedido).
      const mine = await storage.db.prepare(`SELECT status FROM friends WHERE user_id = ? AND friend_id = ?`).bind(userId, friendId).first();
      if (!mine || mine.status !== 'pending_received') {
        return jsonResponse({ error: 'Não há pedido de conexão desta pessoa para aceitar.' }, 409, correlationId, request);
      }
      await storage.db
        .prepare(
          `UPDATE friends SET status = 'approved', updated_at = ?
           WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`
        )
        .bind(nowIso, userId, friendId, friendId, userId)
        .run();
    } else {
      if (storage.store.friends) {
        const c1 = storage.store.friends.get(`${userId}_${friendId}`);
        if (c1) { c1.status = 'approved'; c1.updated_at = nowIso; }
        const c2 = storage.store.friends.get(`${friendId}_${userId}`);
        if (c2) { c2.status = 'approved'; c2.updated_at = nowIso; }
      }
    }

    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // 5. RECUSAR / REMOVER CONEXÃO (`DELETE /api/user/:id/connect/:friendId`)
  // --------------------------------------------------------------------------
  const removeMatch = pathname.match(/^\/api\/user\/([^/]+)\/connect\/([^/]+)$/);
  if (removeMatch && method === 'DELETE') {
    const [, userId, friendId] = removeMatch;

    if (storage.mode === 'd1') {
      await storage.db
        .prepare(`DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`)
        .bind(userId, friendId, friendId, userId)
        .run();
    } else {
      if (storage.store.friends) {
        storage.store.friends.delete(`${userId}_${friendId}`);
        storage.store.friends.delete(`${friendId}_${userId}`);
      }
    }

    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // 6. FEED SOCIAL (`GET /api/user/:id/feed`)
  // --------------------------------------------------------------------------
  const feedMatch = pathname.match(/^\/api\/user\/([^/]+)\/feed$/);
  if (feedMatch && method === 'GET') {
    return jsonResponse({ feed: [] }, 200, correlationId, request);
  }

  return null;
}
