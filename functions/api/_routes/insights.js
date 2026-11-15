/**
 * Analytics legado (`/api/analytics/:id`). A engine nova entra na Fase 2.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

import { buildEdgeAnalyticsReport } from '../_lib/analytics.js';
import { jsonResponse } from '../_lib/http.js';

/** Devolve a Response da rota correspondente, ou null se nenhuma rota deste domínio casar. */
export async function handleInsightsRoutes(ctx) {
  const { request, correlationId, pathname, method, storage } = ctx;

  // --------------------------------------------------------------------------
  // TELEMETRIA E ANALYTICS NA EDGE (`/api/analytics/:id`)
  // --------------------------------------------------------------------------
  const analyticsMatch = pathname.match(/^\/api\/analytics\/([^/]+)$/);
  if (analyticsMatch && method === 'GET') {
    const userId = analyticsMatch[1];
    let habitsList = [];
    if (storage.mode === 'd1') {
      const res = await storage.db.prepare(`SELECT * FROM habits WHERE user_id = ?`).bind(userId).all();
      habitsList = (res.results || []).map((h) => ({ ...h, completed: h.completed === 1 }));
    } else {
      habitsList = storage.store.habits.get(userId) || [];
    }
    return jsonResponse(buildEdgeAnalyticsReport(userId, habitsList), 200, correlationId, request);
  }

  return null;
}

