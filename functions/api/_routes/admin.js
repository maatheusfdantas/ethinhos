/**
 * Portal admin (RBAC).
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

import { generateCode6 } from '../_lib/codes.js';
import { eraseUserData } from '../_lib/erase.js';
import { recordAuditLogEdge } from '../_lib/audit.js';
import { hashPasswordEdge } from '../_lib/auth.js';
import { ALL_PERMS } from '../_lib/constants.js';
import { edgeFallbackMemory } from '../_lib/db.js';
import { formatTokenDisplayEdge, sendVerificationEmailEdge, sha256Hex } from '../_lib/email.js';
import { jsonResponse } from '../_lib/http.js';
import { passwordProblem } from '../../../src/domain/credentials.js';

/** Devolve a Response da rota correspondente, ou null se nenhuma rota deste domínio casar. */
export async function handleAdminRoutes(ctx) {
  const { request, env, correlationId, clientIp, userAgent, pathname, method, body, storage, authClaims } = ctx;

  // --------------------------------------------------------------------------
  // PORTAL ADMIN PROTEGIDO POR RBAC (`/api/admin/*`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/admin/users' && method === 'GET') {
    if (storage.mode === 'd1') {
      const res = await storage.db.prepare(`SELECT id, username, email, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, email_verified, validation_token_preview, validation_token_expires_at, created_at FROM users ORDER BY created_at DESC`).all();
      const users = (res.results || []).map((u) => ({
        ...u,
        is_active: u.is_active === 1,
        is_public: u.is_public === 1,
        email_verified: u.email_verified === 1 || u.role === 'admin',
        permissions: JSON.parse(u.permissions || ALL_PERMS)
      }));
      return jsonResponse({ users }, 200, correlationId, request);
    }
    const users = Array.from(storage.store.users.values()).map((u) => ({
      ...u,
      is_active: u.is_active === 1,
      is_public: u.is_public === 1,
      email_verified: u.email_verified === 1 || u.role === 'admin',
      permissions: JSON.parse(u.permissions || ALL_PERMS)
    }));
    return jsonResponse({ users }, 200, correlationId, request);
  }

  // Gerar Token de Validação válido por 48h pelo Administrador + enviar por e-mail
  const adminGenToken48hMatch = pathname.match(/^\/api\/admin\/user\/([^/]+)\/generate-token-48h$/);
  if (adminGenToken48hMatch && method === 'POST') {
    const targetId = adminGenToken48hMatch[1];
    let user = null;
    if (storage.mode === 'd1') {
      user = await storage.db.prepare('SELECT * FROM users WHERE id = ?').bind(targetId).first();
    } else {
      user = storage.store.users.get(targetId);
    }

    if (!user) {
      return jsonResponse({ error: 'Usuário não encontrado.' }, 404, correlationId, request);
    }

    const rawToken = generateCode6();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    if (storage.mode === 'd1') {
      await storage.db.prepare(
        'INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at, used, created_at) VALUES (?, ?, ?, \'email_verification\', ?, 0, ?)'
      ).bind(`tok_48h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, user.id, tokenHash, expiresAt, nowIso).run();

      try {
        await storage.db.prepare(
          'UPDATE users SET validation_token_preview = ?, validation_token_expires_at = ?, email_verified = 0 WHERE id = ?'
        ).bind(rawToken, expiresAt, user.id).run();
      } catch (_e) {}
    }

    const emailResult = await sendVerificationEmailEdge(env, {
      email: user.email,
      name: user.name,
      token: rawToken,
      expiresInMinutes: 2880
    });

    await recordAuditLogEdge(storage, {
      eventType: 'ADMIN_GENERATED_48H_VALIDATION_TOKEN',
      userId: authClaims?.sub || 'usr_admin',
      ipAddress: clientIp,
      userAgent,
      metadata: { targetId: user.id, email: user.email, expiresAt },
      correlationId
    });

    return jsonResponse({
      success: true,
      token: rawToken,
      formattedToken: formatTokenDisplayEdge(rawToken),
      expiresAt,
      expiresInHours: 48,
      emailSent: Boolean(emailResult?.success),
      sandboxRedirected: Boolean(emailResult?.sandboxRedirected),
      deliveredTo: emailResult?.targetEmail || user.email,
      message: `Token de 48h (${formatTokenDisplayEdge(rawToken)}) gerado e enviado para ${user.email}.`
    }, 200, correlationId, request);
  }

  // Validar conta manualmente pelo Administrador
  const adminVerifyAccMatch = pathname.match(/^\/api\/admin\/user\/([^/]+)\/verify-account$/);
  if (adminVerifyAccMatch && method === 'POST') {
    const targetId = adminVerifyAccMatch[1];
    if (storage.mode === 'd1') {
      try {
        await storage.db.prepare('UPDATE users SET email_verified = 1, validation_token_preview = NULL, validation_token_expires_at = NULL WHERE id = ?').bind(targetId).run();
      } catch (_e) {
        await storage.db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(targetId).run();
      }
      try {
        await storage.db.prepare('UPDATE auth_tokens SET used = 1 WHERE user_id = ? AND type = \'email_verification\'').bind(targetId).run();
      } catch (_e) {}
    }
    await recordAuditLogEdge(storage, {
      eventType: 'ADMIN_MANUAL_ACCOUNT_VERIFIED',
      userId: authClaims?.sub || 'usr_admin',
      ipAddress: clientIp,
      userAgent,
      metadata: { targetId },
      correlationId
    });
    return jsonResponse({ success: true, email_verified: true }, 200, correlationId, request);
  }

  const adminToggleMatch = pathname.match(/^\/api\/admin\/user\/([^/]+)\/toggle-active$/);
  if (adminToggleMatch && method === 'POST') {
    const targetId = adminToggleMatch[1];
    if (storage.mode === 'd1') {
      await storage.db.prepare(`UPDATE users SET is_active = ? WHERE id = ?`).bind(body.is_active ? 1 : 0, targetId).run();
    }
    return jsonResponse({ success: true, is_active: Boolean(body.is_active) }, 200, correlationId, request);
  }

  const adminSubMatch = pathname.match(/^\/api\/admin\/user\/([^/]+)\/subscription$/);
  if (adminSubMatch && method === 'POST') {
    const targetId = adminSubMatch[1];
    if (storage.mode === 'd1') {
      await storage.db.prepare(`UPDATE users SET subscription_tier = ? WHERE id = ?`).bind(body.subscription_tier, targetId).run();
    }
    return jsonResponse({ success: true, subscription_tier: body.subscription_tier }, 200, correlationId, request);
  }

  const adminPermMatch = pathname.match(/^\/api\/admin\/user\/([^/]+)\/permissions$/);
  if (adminPermMatch && method === 'POST') {
    const targetId = adminPermMatch[1];
    if (storage.mode === 'd1') {
      await storage.db.prepare(`UPDATE users SET permissions = ? WHERE id = ?`).bind(JSON.stringify(body.permissions), targetId).run();
    }
    return jsonResponse({ success: true, permissions: body.permissions }, 200, correlationId, request);
  }

  const adminRoleMatch = pathname.match(/^\/api\/admin\/user\/([^/]+)\/role$/);
  if (adminRoleMatch && method === 'POST') {
    const targetId = adminRoleMatch[1];
    const nextRole = ['user', 'moderator', 'admin'].includes(body.role) ? body.role : 'user';
    if (storage.mode === 'd1') {
      await storage.db.prepare(`UPDATE users SET role = ? WHERE id = ?`).bind(nextRole, targetId).run();
    }
    await recordAuditLogEdge(storage, {
      eventType: 'ADMIN_ROLE_UPDATED',
      userId: authClaims?.sub || 'usr_admin',
      ipAddress: clientIp,
      userAgent,
      metadata: { targetId, role: nextRole },
      correlationId
    });
    return jsonResponse({ success: true, role: nextRole }, 200, correlationId, request);
  }

  const adminResetPwdMatch = pathname.match(/^\/api\/admin\/user\/([^/]+)\/reset-password$/);
  if (adminResetPwdMatch && method === 'POST') {
    const targetId = adminResetPwdMatch[1];
    const newPassword = String(body.newPassword || '');
    if (passwordProblem(newPassword)) {
      return jsonResponse({ error: passwordProblem(newPassword) }, 400, correlationId, request);
    }
    const hashed = await hashPasswordEdge(newPassword);
    if (storage.mode === 'd1') {
      await storage.db.prepare(`UPDATE users SET password = ? WHERE id = ?`).bind(hashed, targetId).run();
    }
    await recordAuditLogEdge(storage, {
      eventType: 'ADMIN_MANUAL_PASSWORD_RESET',
      userId: authClaims?.sub || 'usr_admin',
      ipAddress: clientIp,
      userAgent,
      metadata: { targetId },
      correlationId
    });
    return jsonResponse({ success: true, message: 'Senha redefinida manualmente pelo Administrador.' }, 200, correlationId, request);
  }

  const adminDeleteUserMatch = pathname.match(/^\/api\/admin\/user\/([^/]+)$/);
  if (adminDeleteUserMatch && method === 'DELETE') {
    const targetId = adminDeleteUserMatch[1];
    if (targetId === 'usr_admin') {
      return jsonResponse({ error: 'A conta administrativa principal não pode ser excluída.' }, 403, correlationId, request);
    }
    if (storage.mode === 'd1') {
      // Mesma lista da autoexclusão (auditoria S14): sem sobras de Google, Spotify, chamados e amizades.
      await eraseUserData(storage.db, targetId);
    } else {
      storage.store.users.delete(targetId);
    }
    await recordAuditLogEdge(storage, {
      eventType: 'ADMIN_USER_ERASURE_LGPD',
      userId: authClaims?.sub || 'usr_admin',
      ipAddress: clientIp,
      userAgent,
      metadata: { targetId },
      correlationId
    });
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  // Admin: Listar e gerenciar Lista de Espera (Waitlist)
  if (pathname === '/api/admin/waitlist' && method === 'GET') {
    if (storage.mode === 'd1') {
      try {
        await storage.db
          .prepare(`CREATE TABLE IF NOT EXISTS waitlist (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, interest TEXT DEFAULT 'Acesso Antecipado Ethos', source TEXT DEFAULT 'https://ethos-landing-7j3.pages.dev', status TEXT DEFAULT 'pendente', created_at TEXT NOT NULL)`)
          .run();
        const res = await storage.db.prepare(`SELECT * FROM waitlist ORDER BY created_at DESC`).all();
        return jsonResponse({ waitlist: res.results || [] }, 200, correlationId, request);
      } catch (_e) {}
    }
    return jsonResponse({ waitlist: edgeFallbackMemory.waitlist }, 200, correlationId, request);
  }

  const adminDeleteWaitlistMatch = pathname.match(/^\/api\/admin\/waitlist\/([^/]+)$/);
  if (adminDeleteWaitlistMatch && method === 'DELETE') {
    const wlId = adminDeleteWaitlistMatch[1];
    if (storage.mode === 'd1') {
      try {
        await storage.db.prepare(`DELETE FROM waitlist WHERE id = ?`).bind(wlId).run();
      } catch (_e) {}
    }
    edgeFallbackMemory.waitlist = edgeFallbackMemory.waitlist.filter((w) => w.id !== wlId);
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  // Admin: Listar e responder Tickets de Suporte
  if (pathname === '/api/admin/tickets' && method === 'GET') {
    if (storage.mode === 'd1') {
      try {
        await storage.db
          .prepare(`CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_email TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Dúvida / Uso do Sistema', priority TEXT NOT NULL DEFAULT 'Média', subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'aberto', admin_reply TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`)
          .run();
        const res = await storage.db.prepare(`SELECT * FROM support_tickets ORDER BY created_at DESC`).all();
        return jsonResponse({ tickets: res.results || [] }, 200, correlationId, request);
      } catch (_e) {}
    }
    return jsonResponse({ tickets: edgeFallbackMemory.supportTickets }, 200, correlationId, request);
  }

  const adminUpdateTicketMatch = pathname.match(/^\/api\/admin\/tickets\/([^/]+)$/);
  if (adminUpdateTicketMatch && method === 'PUT') {
    const ticketId = adminUpdateTicketMatch[1];
    const nowIso = new Date().toISOString();
    if (storage.mode === 'd1') {
      try {
        await storage.db
          .prepare(`UPDATE support_tickets SET status = COALESCE(?, status), admin_reply = COALESCE(?, admin_reply), updated_at = ? WHERE id = ?`)
          .bind(body.status || null, body.admin_reply !== undefined ? body.admin_reply : null, nowIso, ticketId)
          .run();
      } catch (_e) {}
    }
    edgeFallbackMemory.supportTickets = edgeFallbackMemory.supportTickets.map((t) =>
      t.id === ticketId ? { ...t, status: body.status || t.status, admin_reply: body.admin_reply ?? t.admin_reply, updated_at: nowIso } : t
    );
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  // Admin: Logs de Auditoria, E-mail e Sistema
  if (pathname === '/api/admin/logs' && method === 'GET') {
    let auditLogs = [];
    if (storage.mode === 'd1') {
      try {
        const res = await storage.db.prepare(`SELECT * FROM auth_audit_logs ORDER BY created_at DESC LIMIT 60`).all();
        auditLogs = (res.results || []).map((r) => ({
          id: r.id,
          event_type: r.event_type,
          actor: r.user_id || 'Sistema',
          target: r.metadata || '',
          ip: r.ip_address || '0.0.0.0',
          created_at: r.created_at
        }));
      } catch (_e) {}
    }
    return jsonResponse({ auditLogs }, 200, correlationId, request);
  }

  return null;
}

