/**
 * Rotas públicas: lista de espera (landing-site) e tickets de suporte.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

import { recordAuditLogEdge } from '../_lib/audit.js';
import { edgeFallbackMemory } from '../_lib/db.js';
import { jsonResponse, sanitizeStringEdge } from '../_lib/http.js';

/** Devolve a Response da rota correspondente, ou null se nenhuma rota deste domínio casar. */
export async function handlePublicRoutes(ctx) {
  const { request, correlationId, clientIp, userAgent, url, pathname, method, body, storage } = ctx;

  // --------------------------------------------------------------------------
  // ROTA PÚBLICA DE LISTA DE ESPERA DA LANDING PAGE (`/api/waitlist`)
  // Recebe cadastros de https://ethos-landing-7j3.pages.dev/ com nome, e-mail e telefone
  // --------------------------------------------------------------------------
  if (pathname === '/api/waitlist' && method === 'POST') {
    const name = sanitizeStringEdge(body.name || '', 120);
    const email = sanitizeStringEdge(body.email || '', 150).toLowerCase();
    const phone = sanitizeStringEdge(body.phone || '', 40);
    const interest = sanitizeStringEdge(body.interest || 'Acesso Antecipado Ethos', 120);
    const source = sanitizeStringEdge(body.source || 'https://ethos-landing-7j3.pages.dev', 150);

    if (!name || !email || !phone) {
      return jsonResponse({ error: 'Informe nome, e-mail e número de telefone para entrar na lista de espera.' }, 400, correlationId, request);
    }

    const entryId = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();
    const entry = {
      id: entryId,
      name,
      email,
      phone,
      interest,
      source,
      status: 'pendente',
      created_at: nowIso
    };

    if (storage.mode === 'd1') {
      try {
        await storage.db
          .prepare(`CREATE TABLE IF NOT EXISTS waitlist (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, interest TEXT DEFAULT 'Acesso Antecipado Ethos', source TEXT DEFAULT 'https://ethos-landing-7j3.pages.dev', status TEXT DEFAULT 'pendente', created_at TEXT NOT NULL)`)
          .run();
        await storage.db
          .prepare(`INSERT INTO waitlist (id, name, email, phone, interest, source, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)`)
          .bind(entryId, name, email, phone, interest, source, nowIso)
          .run();
      } catch (e) {
        edgeFallbackMemory.waitlist.unshift(entry);
      }
    } else {
      edgeFallbackMemory.waitlist.unshift(entry);
    }

    await recordAuditLogEdge(storage, {
      eventType: 'WAITLIST_SIGNUP',
      userId: null,
      ipAddress: clientIp,
      userAgent,
      // O log de auditoria não duplica nome, e-mail nem telefone (ficam só na tabela waitlist).
      metadata: { waitlistId: entryId, source },
      correlationId
    });

    return jsonResponse({ success: true, entry }, 201, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // ROTAS DE SUPORTE / HELP DESK PARA USUÁRIOS (`/api/support/tickets`)
  // --------------------------------------------------------------------------
  if (pathname === '/api/support/tickets' && method === 'GET') {
    const userId = url.searchParams.get('userId') || '';
    if (storage.mode === 'd1') {
      try {
        await storage.db
          .prepare(`CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_email TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Dúvida / Uso do Sistema', priority TEXT NOT NULL DEFAULT 'Média', subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'aberto', admin_reply TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`)
          .run();
        const res = userId
          ? await storage.db.prepare(`SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`).bind(userId).all()
          : await storage.db.prepare(`SELECT * FROM support_tickets ORDER BY created_at DESC`).all();
        return jsonResponse({ tickets: res.results || [] }, 200, correlationId, request);
      } catch (_e) {}
    }
    const list = userId
      ? edgeFallbackMemory.supportTickets.filter((t) => t.user_id === userId)
      : edgeFallbackMemory.supportTickets;
    return jsonResponse({ tickets: list }, 200, correlationId, request);
  }

  if (pathname === '/api/support/tickets' && method === 'POST') {
    const nowIso = new Date().toISOString();
    const ticket = {
      id: body.id || `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      user_id: sanitizeStringEdge(body.user_id || 'usr_anon', 64),
      user_name: sanitizeStringEdge(body.user_name || 'Usuário Ethos', 100),
      user_email: sanitizeStringEdge(body.user_email || 'usuario@ethos.dev', 120),
      category: sanitizeStringEdge(body.category || 'Dúvida / Uso do Sistema', 80),
      priority: sanitizeStringEdge(body.priority || 'Média', 30),
      subject: sanitizeStringEdge(body.subject || 'Solicitação de Suporte', 120),
      message: sanitizeStringEdge(body.message || '', 1200),
      status: 'aberto',
      admin_reply: '',
      created_at: nowIso,
      updated_at: nowIso
    };

    if (!ticket.subject || !ticket.message) {
      return jsonResponse({ error: 'Preencha o assunto e a descrição do chamado.' }, 400, correlationId, request);
    }

    if (storage.mode === 'd1') {
      try {
        await storage.db
          .prepare(`CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, user_email TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Dúvida / Uso do Sistema', priority TEXT NOT NULL DEFAULT 'Média', subject TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'aberto', admin_reply TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`)
          .run();
        await storage.db
          .prepare(`INSERT INTO support_tickets (id, user_id, user_name, user_email, category, priority, subject, message, status, admin_reply, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberto', '', ?, ?)`)
          .bind(ticket.id, ticket.user_id, ticket.user_name, ticket.user_email, ticket.category, ticket.priority, ticket.subject, ticket.message, nowIso, nowIso)
          .run();
      } catch (_e) {
        edgeFallbackMemory.supportTickets.unshift(ticket);
      }
    } else {
      edgeFallbackMemory.supportTickets.unshift(ticket);
    }

    return jsonResponse({ success: true, ticket }, 201, correlationId, request);
  }

  return null;
}

