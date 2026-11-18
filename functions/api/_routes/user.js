/**
 * Dados do usuário legado: sync, hábitos, eventos, tags, categorias, saúde, perfil.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

import { jsonResponse } from '../_lib/http.js';

// ----------------------------------------------------------------------------
// Gravação segura (auditoria 15/11/2026: A1, A2, S4, S5).
// - A sincronização só grava; nunca apaga o que "não veio" na lista. Excluir é sempre uma ação explícita.
// - Toda gravação confere o dono: um id que pertence a outra conta (ou a uma categoria global) nunca é
//   alterado. O upsert tem "WHERE <tabela>.user_id = excluded.user_id" como segunda barreira.
// - As gravações da sincronização vão num único batch (transação), sem estado parcial.
// ----------------------------------------------------------------------------
const HABIT_COLS = ['id', 'user_id', 'title', 'category', 'icon_name', 'target', 'current', 'unit', 'effort', 'priority', 'tag_id', 'subclass_id', 'subclass_name', 'tracking_type', 'period_type', 'period_config', 'repeat_days', 'completed', 'completion_style', 'created_at'];
const EVENT_COLS = ['id', 'user_id', 'title', 'date', 'end_date', 'all_day', 'start_time', 'end_time', 'category', 'subclass_id', 'subclass_name', 'author_name', 'repeat_rule', 'repeat_config', 'reminders', 'buffer_before', 'buffer_after', 'is_floating', 'energy_level', 'meeting_url', 'visibility', 'conflict_policy', 'location', 'notes', 'priority', 'completed', 'created_at'];
const CATEGORY_COLS = ['id', 'user_id', 'name', 'color', 'bg', 'icon', 'is_shared', 'has_subclasses', 'created_at'];
const TAG_COLS = ['id', 'user_id', 'name', 'color', 'bg', 'icon', 'is_shared', 'has_subclasses'];

/** INSERT que, se o id já existir, só atualiza quando a linha é da mesma conta. */
export function ownedUpsertSql(table, cols) {
  const updates = cols.filter((c) => !['id', 'user_id', 'created_at'].includes(c)).map((c) => `${c} = excluded.${c}`).join(', ');
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT(id) DO UPDATE SET ${updates} WHERE ${table}.user_id = excluded.user_id`;
}

/** Ids (da lista) que já existem e pertencem a outra conta. Consulta em blocos (limite de parâmetros do D1). */
export async function foreignIds(db, table, ids, userId) {
  const out = new Set();
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const res = await db.prepare(`SELECT id FROM ${table} WHERE user_id != ? AND id IN (${chunk.map(() => '?').join(',')})`).bind(userId, ...chunk).all();
    for (const r of res.results || []) out.add(String(r.id));
  }
  return out;
}

async function runBatch(db, stmts) {
  for (let i = 0; i < stmts.length; i += 80) await db.batch(stmts.slice(i, i + 80));
}

/** Devolve a Response da rota correspondente, ou null se nenhuma rota deste domínio casar. */
export async function handleUserRoutes(ctx) {
  const { request, correlationId, pathname, method, body, storage } = ctx;

  // --------------------------------------------------------------------------
  // DADOS DO USUÁRIO (`/api/user/:id/data`)
  // --------------------------------------------------------------------------
  const userDataMatch = pathname.match(/^\/api\/user\/([^/]+)\/data$/);
  if (userDataMatch && method === 'GET') {
    const userId = userDataMatch[1];

    if (storage.mode === 'd1') {
      const habitsRes = await storage.db.prepare(`SELECT * FROM habits WHERE user_id = ?`).bind(userId).all();
      const eventsRes = await storage.db.prepare(`SELECT * FROM events WHERE user_id = ? ORDER BY date ASC, start_time ASC`).bind(userId).all();
      const healthRow = await storage.db.prepare(`SELECT * FROM health WHERE user_id = ?`).bind(userId).first();
      const tagsRes = await storage.db.prepare(`SELECT * FROM tags WHERE user_id = ? OR user_id = 'global'`).bind(userId).all();
      const catsRes = await storage.db.prepare(`SELECT * FROM categories WHERE user_id = ? OR user_id = 'global'`).bind(userId).all();
      const subsRes = await storage.db.prepare(`SELECT * FROM subclasses`).all();
      const memsRes = await storage.db.prepare(`SELECT * FROM category_members`).all();
      const userRow = await storage.db.prepare(`SELECT id, username, email, name, avatar, bio, playlists, shared_metrics, post_its, active_track, workouts_json, bad_habits_json, page_preferences, role, is_active, subscription_tier, is_public, streak_days, points, weight, height FROM users WHERE id = ?`).bind(userId).first();
      let badHabitsList = [];
      try {
        const bhRes = await storage.db.prepare(`SELECT * FROM bad_habits WHERE user_id = ? ORDER BY created_at DESC`).bind(userId).all();
        badHabitsList = bhRes.results || [];
      } catch (_e) {}
      if (badHabitsList.length === 0 && userRow?.bad_habits_json) {
        try { badHabitsList = JSON.parse(userRow.bad_habits_json); } catch (_e) {}
      }

      let parsedPlaylists = [];
      let parsedSharedMetrics = {};
      let parsedPostIts = [];
      let parsedActiveTrack = null;
      let parsedWorkouts = [];
      let parsedPagePrefs = null;
      try { if (userRow?.playlists) parsedPlaylists = JSON.parse(userRow.playlists); } catch (_e) {}
      try { if (userRow?.shared_metrics) parsedSharedMetrics = JSON.parse(userRow.shared_metrics); } catch (_e) {}
      try { if (userRow?.post_its) parsedPostIts = JSON.parse(userRow.post_its); } catch (_e) {}
      try { if (userRow?.active_track) parsedActiveTrack = JSON.parse(userRow.active_track); } catch (_e) {}
      try { if (userRow?.workouts_json) parsedWorkouts = JSON.parse(userRow.workouts_json); } catch (_e) {}
      try { if (userRow?.page_preferences) parsedPagePrefs = JSON.parse(userRow.page_preferences); } catch (_e) {}

      const allSubs = subsRes.results || [];
      const allMems = memsRes.results || [];
      const mergedMap = new Map();
      for (const c of [...(catsRes.results || []), ...(tagsRes.results || [])]) {
        if (!mergedMap.has(c.id)) {
          const catSubs = allSubs
            .filter((s) => s.category_id === c.id)
            .map((s) => {
              let meta = { hours: 0 };
              try {
                meta = JSON.parse(s.metadata || '{"hours":0}');
              } catch (_e) {}
              return { id: s.id, category_id: s.category_id, name: s.name, priority: s.priority || 'Média', hours: Number(meta.hours || 0), metadata: meta };
            });
          const catMems = allMems
            .filter((m) => m.category_id === c.id)
            .map((m) => ({ id: m.id, category_id: m.category_id, user_id: m.user_id, email: m.member_email, name: m.member_name, role: m.role || 'collaborator' }));
          mergedMap.set(c.id, {
            id: c.id,
            user_id: c.user_id,
            name: c.name,
            color: c.color,
            bg: c.bg,
            icon: c.icon || 'Bookmark',
            is_shared: Boolean(c.is_shared),
            has_subclasses: Boolean(c.has_subclasses) && catSubs.length > 0,
            subclasses: catSubs,
            members: catMems
          });
        }
      }

      return jsonResponse(
        {
          habits: (habitsRes.results || []).map((h) => {
            let parsedCfg = {};
            try {
              parsedCfg = JSON.parse(h.period_config || '{}');
            } catch (_e) {}
            return {
              ...h,
              subclassId: h.subclass_id || null,
              subclassName: h.subclass_name || null,
              trackingType: h.tracking_type || (h.completion_style === 'numeric' || h.completion_style === 'increment' ? 'counter' : 'done'),
              periodType: h.period_type || 'day',
              periodConfig: parsedCfg,
              completed: h.completed === 1,
              repeatDays: JSON.parse(h.repeat_days || '[1,2,3,4,5]')
            };
          }),
          badHabits: badHabitsList,
          workouts: parsedWorkouts,
          events: (eventsRes.results || []).map((e) => {
            let parsedRepeatConfig = {};
            let parsedReminders = [];
            try { parsedRepeatConfig = JSON.parse(e.repeat_config || '{}'); } catch (_e) {}
            try { parsedReminders = JSON.parse(e.reminders || '[]'); } catch (_e) {}
            return {
              ...e,
              allDay: e.all_day === 1,
              completed: e.completed === 1,
              startTime: e.start_time,
              endTime: e.end_time,
              endDate: e.end_date || e.date,
              repeat: e.repeat_rule || 'Nunca',
              repeatConfig: parsedRepeatConfig,
              reminders: parsedReminders,
              bufferBefore: e.buffer_before || 0,
              bufferAfter: e.buffer_after || 0,
              isFloating: e.is_floating === 1,
              energyLevel: e.energy_level || 'deep_focus',
              meetingUrl: e.meeting_url || '',
              visibility: e.visibility || 'private',
              conflictPolicy: e.conflict_policy || 'allow'
            };
          }),
          health: healthRow
            ? {
                waterGlasses: healthRow.water_glasses,
                waterTarget: healthRow.water_target || 10,
                glassMl: healthRow.glass_ml || 250,
                waterHistory: JSON.parse(healthRow.water_history || '[]'),
                sleep: {
                  bedTime: healthRow.sleep_bed_time,
                  wakeTime: healthRow.sleep_wake_time,
                  logged: healthRow.sleep_logged === 1
                }
              }
            : {
                waterGlasses: 0,
                waterTarget: 10,
                glassMl: 250,
                waterHistory: [],
                sleep: { bedTime: '23:30', wakeTime: '07:00', logged: false }
              },
          tags: Array.from(mergedMap.values()),
          categories: Array.from(mergedMap.values()),
          user: userRow
            ? {
                ...userRow,
                playlists: parsedPlaylists,
                sharedMetrics: parsedSharedMetrics,
                postIts: parsedPostIts,
                activeTrack: parsedActiveTrack,
                pagePreferences: parsedPagePrefs
              }
            : null
        },
        200,
        correlationId,
        request
      );
    }

    return jsonResponse(
      {
        habits: storage.store.habits.get(userId) || [],
        events: storage.store.events.get(userId) || [],
        health: storage.store.health.get(userId) || {
          waterGlasses: 0,
          waterTarget: 10,
          glassMl: 250,
          waterHistory: [],
          sleep: { bedTime: '23:30', wakeTime: '07:00', logged: false }
        },
        tags: [],
        user: storage.store.users.get(userId) || null
      },
      200,
      correlationId,
      request
    );
  }

  // --------------------------------------------------------------------------
  // SINCRONIZAÇÃO COMPLETA DE ESTADO NO D1 (`PUT /api/user/:id/sync`)
  // --------------------------------------------------------------------------
  const syncMatch = pathname.match(/^\/api\/user\/([^/]+)\/sync$/);
  if (syncMatch && method === 'PUT') {
    const userId = syncMatch[1];
    const nowIso = new Date().toISOString();

    const skipped = { habits: [], events: [], tags: [] };
    if (storage.mode === 'd1') {
      const stmts = [];

      if (Array.isArray(body.habits)) {
        const validHabits = body.habits.filter(h => h && h.title);
        const foreign = await foreignIds(storage.db, 'habits', validHabits.map(h => h.id), userId);
        for (const h of validHabits) {
          if (h.id && foreign.has(String(h.id))) { skipped.habits.push(h.id); continue; }
          const trackingType = h.trackingType || (h.completionStyle === 'numeric' || h.completionStyle === 'increment' ? 'counter' : 'done');
          const periodType = h.periodType || 'day';
          const periodConfig = typeof h.periodConfig === 'object' ? JSON.stringify(h.periodConfig) : (h.periodConfig || '{}');
          stmts.push(storage.db.prepare(ownedUpsertSql('habits', HABIT_COLS)).bind(
            h.id || `hab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            h.title,
            h.category || 'Geral',
            h.iconName || h.icon_name || 'CheckCircle2',
            h.target || 1,
            h.current || 0,
            h.unit || 'vezes',
            h.effort || 'Médio',
            h.priority || 'Média',
            h.tagId || h.tag_id || null,
            h.subclassId || h.subclass_id || null,
            h.subclassName || h.subclass_name || null,
            trackingType,
            periodType,
            periodConfig,
            JSON.stringify(h.repeatDays || [1, 2, 3, 4, 5]),
            h.completed ? 1 : 0,
            h.completionStyle || h.completion_style || 'quick',
            h.created_at || nowIso
          ));
        }
        // Apagar tudo só com o pedido explícito (nunca por lista vazia).
        if (validHabits.length === 0 && body.clearAllHabits === true) {
          stmts.push(storage.db.prepare(`DELETE FROM habits WHERE user_id = ?`).bind(userId));
        }
      }

      if (Array.isArray(body.events)) {
        const validEvents = body.events.filter(ev => ev && ev.title && ev.date);
        const foreign = await foreignIds(storage.db, 'events', validEvents.map(e => e.id), userId);
        for (const ev of validEvents) {
          if (ev.id && foreign.has(String(ev.id))) { skipped.events.push(ev.id); continue; }
          stmts.push(storage.db.prepare(ownedUpsertSql('events', EVENT_COLS)).bind(
            ev.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            ev.title,
            ev.date,
            ev.endDate || ev.end_date || ev.date,
            ev.allDay || ev.all_day ? 1 : 0,
            ev.startTime || ev.start_time || '09:00',
            ev.endTime || ev.end_time || '10:00',
            ev.category || 'Geral',
            ev.subclassId || ev.subclass_id || null,
            ev.subclassName || ev.subclass_name || null,
            ev.authorName || ev.author_name || null,
            ev.repeat || ev.repeat_rule || 'Nunca',
            JSON.stringify(ev.repeatConfig || {}),
            JSON.stringify(ev.reminders || []),
            Number(ev.bufferBefore) || 0,
            Number(ev.bufferAfter) || 0,
            ev.isFloating ? 1 : 0,
            ev.energyLevel || 'deep_focus',
            ev.meetingUrl || '',
            ev.visibility || 'private',
            ev.conflictPolicy || 'allow',
            ev.location || '',
            ev.notes || ev.description || '',
            ev.priority || 'Média',
            ev.completed ? 1 : 0,
            ev.created_at || nowIso
          ));
        }
        if (validEvents.length === 0 && body.clearAllEvents === true) {
          stmts.push(storage.db.prepare(`DELETE FROM events WHERE user_id = ?`).bind(userId));
        }
      }

      if (Array.isArray(body.tags)) {
        // Antes: apagava TODAS as categorias da conta e regravava a lista (tags: [] apagava tudo) e
        // regravava as categorias globais como se fossem da pessoa. Agora: só grava as da própria conta.
        const validTags = body.tags.filter(t => t?.name);
        const ids = validTags.map(t => t.id);
        const foreign = new Set([...(await foreignIds(storage.db, 'categories', ids, userId)), ...(await foreignIds(storage.db, 'tags', ids, userId))]);
        for (const t of validTags) {
          if (t.id && foreign.has(String(t.id))) { skipped.tags.push(t.id); continue; }
          const catId = t.id || `tag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const color = t.color || '#818cf8';
          const bg = t.bg || 'rgba(129, 140, 248, 0.15)';
          stmts.push(storage.db.prepare(ownedUpsertSql('categories', CATEGORY_COLS)).bind(catId, userId, t.name, color, bg, t.icon || 'Bookmark', t.is_shared ? 1 : 0, t.has_subclasses ? 1 : 0, nowIso));
          stmts.push(storage.db.prepare(ownedUpsertSql('tags', TAG_COLS)).bind(catId, userId, t.name, color, bg, t.icon || 'Bookmark', t.is_shared ? 1 : 0, t.has_subclasses ? 1 : 0));
          // Subclasses e membros pertencem à categoria; ela é desta conta (conferido acima).
          if (Array.isArray(t.subclasses)) {
            stmts.push(storage.db.prepare(`DELETE FROM subclasses WHERE category_id = ?`).bind(catId));
            for (const sub of t.subclasses) {
              if (!sub?.name?.trim()) continue;
              const subId = sub.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              stmts.push(storage.db
                .prepare(`INSERT INTO subclasses (id, category_id, name, priority, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, priority = excluded.priority, metadata = excluded.metadata WHERE subclasses.category_id = excluded.category_id`)
                .bind(subId, catId, sub.name.trim(), sub.priority || 'Média', JSON.stringify({ hours: Number(sub.hours || sub.metadata?.hours || 0) }), nowIso));
            }
          }
          if (Array.isArray(t.members)) {
            stmts.push(storage.db.prepare(`DELETE FROM category_members WHERE category_id = ?`).bind(catId));
            for (const mem of t.members) {
              if (!mem?.email?.trim() && !mem?.name?.trim()) continue;
              const memId = mem.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              stmts.push(storage.db
                .prepare(`INSERT INTO category_members (id, category_id, user_id, member_email, member_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET member_email = excluded.member_email, member_name = excluded.member_name, role = excluded.role WHERE category_members.category_id = excluded.category_id`)
                .bind(memId, catId, mem.user_id || `usr_${(mem.email || mem.name).toLowerCase().replace(/[^a-z0-9]/g, '_')}`, (mem.email || '').trim().toLowerCase(), (mem.name || mem.email?.split('@')[0] || 'Colaborador').trim(), mem.role || 'collaborator', nowIso));
            }
          }
        }
      }

      if (stmts.length) await runBatch(storage.db, stmts);

      if (body.health && typeof body.health === 'object') {
        const syncWater = body.health.waterGlasses !== undefined ? body.health.waterGlasses : (body.health.water !== undefined ? body.health.water : 0);
        await storage.db
          .prepare(
            `INSERT INTO health (user_id, water_glasses, water_target, glass_ml, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               water_glasses = CASE WHEN excluded.water_glasses > 0 THEN excluded.water_glasses ELSE health.water_glasses END,
               water_target = COALESCE(excluded.water_target, health.water_target),
               glass_ml = COALESCE(excluded.glass_ml, health.glass_ml),
               water_history = CASE WHEN excluded.water_history != '[]' THEN excluded.water_history ELSE health.water_history END,
               sleep_bed_time = COALESCE(excluded.sleep_bed_time, health.sleep_bed_time),
               sleep_wake_time = COALESCE(excluded.sleep_wake_time, health.sleep_wake_time),
               sleep_logged = COALESCE(excluded.sleep_logged, health.sleep_logged)`
          )
          .bind(
            userId,
            syncWater,
            body.health.waterTarget || 10,
            body.health.glassMl || 250,
            JSON.stringify(body.health.waterHistory || []),
            body.health.sleep?.bedTime || '23:30',
            body.health.sleep?.wakeTime || '07:00',
            body.health.sleep?.logged ? 1 : 0
          )
          .run();
      }

      if (body.workouts !== undefined || body.badHabits !== undefined || body.postIts !== undefined || body.activeTrack !== undefined || body.weight !== undefined || body.height !== undefined) {
        await storage.db
          .prepare(
            `UPDATE users SET
               workouts_json = CASE WHEN ? IS NOT NULL THEN ? ELSE workouts_json END,
               bad_habits_json = CASE WHEN ? IS NOT NULL THEN ? ELSE bad_habits_json END,
               post_its = CASE WHEN ? IS NOT NULL THEN ? ELSE post_its END,
               active_track = CASE WHEN ? IS NOT NULL THEN ? ELSE active_track END,
               weight = CASE WHEN ? IS NOT NULL THEN ? ELSE weight END,
               height = CASE WHEN ? IS NOT NULL THEN ? ELSE height END
             WHERE id = ?`
          )
          .bind(
            body.workouts !== undefined ? JSON.stringify(body.workouts) : null,
            body.workouts !== undefined ? JSON.stringify(body.workouts) : null,
            body.badHabits !== undefined ? JSON.stringify(body.badHabits) : null,
            body.badHabits !== undefined ? JSON.stringify(body.badHabits) : null,
            body.postIts !== undefined ? JSON.stringify(body.postIts) : null,
            body.postIts !== undefined ? JSON.stringify(body.postIts) : null,
            body.activeTrack !== undefined ? (body.activeTrack ? JSON.stringify(body.activeTrack) : '') : null,
            body.activeTrack !== undefined ? (body.activeTrack ? JSON.stringify(body.activeTrack) : '') : null,
            body.weight !== undefined && body.weight !== null ? Number(body.weight) : null,
            body.weight !== undefined && body.weight !== null ? Number(body.weight) : null,
            body.height !== undefined && body.height !== null ? Number(body.height) : null,
            body.height !== undefined && body.height !== null ? Number(body.height) : null,
            userId
          )
          .run();
      }
    }

    const anySkipped = skipped.habits.length || skipped.events.length || skipped.tags.length;
    return jsonResponse(anySkipped ? { success: true, skipped } : { success: true }, 200, correlationId, request);
  }

  // --------------------------------------------------------------------------
  // CRIAR / ATUALIZAR / DELETAR HÁBITOS, EVENTOS E TAGS NO D1
  // --------------------------------------------------------------------------
  const createHabitMatch = pathname.match(/^\/api\/user\/([^/]+)\/habit$/);
  if (createHabitMatch && method === 'POST') {
    const userId = createHabitMatch[1];
    let habitId = body.id || `hab_${Date.now()}`;
    // id de outra conta: nunca sobrescreve; o hábito ganha um id novo.
    if (storage.mode === 'd1' && (await foreignIds(storage.db, 'habits', [habitId], userId)).size) habitId = `hab_${crypto.randomUUID()}`;
    const trackingType = body.trackingType || (body.completionStyle === 'numeric' || body.completionStyle === 'increment' ? 'counter' : 'done');
    const periodType = body.periodType || 'day';
    const periodConfig = typeof body.periodConfig === 'object' ? JSON.stringify(body.periodConfig) : (body.periodConfig || '{}');

    if (storage.mode === 'd1') {
      await storage.db
        .prepare(
          ownedUpsertSql('habits', HABIT_COLS)
        )
        .bind(
          habitId,
          userId,
          body.title,
          body.category || 'Geral',
          body.iconName || 'CheckCircle2',
          body.target || 1,
          body.current || 0,
          body.unit || 'vezes',
          body.effort || 'Médio',
          body.priority || 'Média',
          body.tagId || null,
          body.subclassId || null,
          body.subclassName || null,
          trackingType,
          periodType,
          periodConfig,
          JSON.stringify(body.repeatDays || [1, 2, 3, 4, 5]),
          body.completed ? 1 : 0,
          body.completionStyle || (trackingType === 'counter' ? 'increment' : 'quick'),
          new Date().toISOString()
        )
        .run();
    }
    return jsonResponse({ success: true, id: habitId }, 201, correlationId, request);
  }

  const updateHabitMatch = pathname.match(/^\/api\/user\/([^/]+)\/habit\/([^/]+)$/);
  if (updateHabitMatch && method === 'PUT') {
    const [, userId, habitId] = updateHabitMatch;
    if (storage.mode === 'd1') {
      await storage.db
        .prepare(`UPDATE habits SET current = ?, completed = ?, subclass_id = COALESCE(?, subclass_id), subclass_name = COALESCE(?, subclass_name) WHERE id = ? AND user_id = ?`)
        .bind(body.current ?? 0, body.completed ? 1 : 0, body.subclassId !== undefined ? body.subclassId : null, body.subclassName !== undefined ? body.subclassName : null, habitId, userId)
        .run();
    }
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  if (updateHabitMatch && method === 'DELETE') {
    const [, userId, habitId] = updateHabitMatch;
    if (storage.mode === 'd1') {
      await storage.db.prepare(`DELETE FROM habits WHERE id = ? AND user_id = ?`).bind(habitId, userId).run();
    }
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  const createEventMatch = pathname.match(/^\/api\/user\/([^/]+)\/event$/);
  if (createEventMatch && method === 'POST') {
    const userId = createEventMatch[1];
    let eventId = body.id || `ev_${Date.now()}`;
    if (storage.mode === 'd1' && (await foreignIds(storage.db, 'events', [eventId], userId)).size) eventId = `ev_${crypto.randomUUID()}`;
    if (storage.mode === 'd1') {
      await storage.db
        .prepare(
          ownedUpsertSql('events', EVENT_COLS)
        )
        .bind(
          eventId,
          userId,
          body.title,
          body.date,
          body.endDate || body.date,
          body.allDay ? 1 : 0,
          body.startTime || '09:00',
          body.endTime || '10:00',
          body.category || 'Geral',
          body.subclassId || null,
          body.subclassName || null,
          body.authorName || null,
          body.repeat || 'Nunca',
          JSON.stringify(body.repeatConfig || {}),
          JSON.stringify(body.reminders || []),
          Number(body.bufferBefore) || 0,
          Number(body.bufferAfter) || 0,
          body.isFloating ? 1 : 0,
          body.energyLevel || 'deep_focus',
          body.meetingUrl || '',
          body.visibility || 'private',
          body.conflictPolicy || 'allow',
          body.location || '',
          body.notes || body.description || '',
          body.priority || 'Média',
          body.completed ? 1 : 0,
          new Date().toISOString()
        )
        .run();
    }
    return jsonResponse({ success: true, id: eventId }, 201, correlationId, request);
  }

  const toggleEventMatch = pathname.match(/^\/api\/user\/([^/]+)\/event\/([^/]+)\/toggle$/);
  if (toggleEventMatch && method === 'PUT') {
    const [, userId, eventId] = toggleEventMatch;
    if (storage.mode === 'd1') {
      await storage.db
        .prepare(`UPDATE events SET completed = ? WHERE id = ? AND user_id = ?`)
        .bind(body.completed ? 1 : 0, eventId, userId)
        .run();
    }
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  const deleteEventMatch = pathname.match(/^\/api\/user\/([^/]+)\/event\/([^/]+)$/);
  if (deleteEventMatch && method === 'DELETE') {
    const [, userId, eventId] = deleteEventMatch;
    if (storage.mode === 'd1') {
      await storage.db.prepare(`DELETE FROM events WHERE id = ? AND user_id = ?`).bind(eventId, userId).run();
    }
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  const healthMatch = pathname.match(/^\/api\/user\/([^/]+)\/health$/);
  if (healthMatch && method === 'POST') {
    const userId = healthMatch[1];
    if (storage.mode === 'd1') {
      const incomingWater = body.waterGlasses !== undefined ? body.waterGlasses : (body.water !== undefined ? body.water : null);
      await storage.db
        .prepare(
          `INSERT INTO health (user_id, water_glasses, water_target, glass_ml, water_history, sleep_bed_time, sleep_wake_time, sleep_logged)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             water_glasses = CASE WHEN excluded.water_glasses IS NOT NULL AND excluded.water_glasses > 0 THEN excluded.water_glasses ELSE health.water_glasses END,
             water_target = COALESCE(excluded.water_target, health.water_target),
             glass_ml = COALESCE(excluded.glass_ml, health.glass_ml),
             water_history = CASE WHEN excluded.water_history != '[]' THEN excluded.water_history ELSE health.water_history END,
             sleep_bed_time = COALESCE(excluded.sleep_bed_time, health.sleep_bed_time),
             sleep_wake_time = COALESCE(excluded.sleep_wake_time, health.sleep_wake_time),
             sleep_logged = COALESCE(excluded.sleep_logged, health.sleep_logged)`
        )
        .bind(
          userId,
          incomingWater,
          body.waterTarget || 10,
          body.glassMl || 250,
          JSON.stringify(body.waterHistory || []),
          body.sleep?.bedTime || '23:30',
          body.sleep?.wakeTime || '07:00',
          body.sleep?.logged ? 1 : 0
        )
        .run();
    }
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  const profileMatch = pathname.match(/^\/api\/user\/([^/]+)\/profile$/);
  if (profileMatch && method === 'PUT') {
    const userId = profileMatch[1];
    if (storage.mode === 'd1') {
      await storage.db
        .prepare(
          `UPDATE users SET
             name = COALESCE(?, name),
             bio = CASE WHEN ? IS NOT NULL THEN ? ELSE bio END,
             avatar = CASE WHEN ? IS NOT NULL THEN ? ELSE avatar END,
             playlists = CASE WHEN ? IS NOT NULL THEN ? ELSE playlists END,
             shared_metrics = CASE WHEN ? IS NOT NULL THEN ? ELSE shared_metrics END,
             post_its = CASE WHEN ? IS NOT NULL THEN ? ELSE post_its END,
             active_track = CASE WHEN ? IS NOT NULL THEN ? ELSE active_track END,
             workouts_json = CASE WHEN ? IS NOT NULL THEN ? ELSE workouts_json END,
             bad_habits_json = CASE WHEN ? IS NOT NULL THEN ? ELSE bad_habits_json END,
             is_public = CASE WHEN ? IS NOT NULL THEN ? ELSE is_public END,
             weight = CASE WHEN ? IS NOT NULL THEN ? ELSE weight END,
             height = CASE WHEN ? IS NOT NULL THEN ? ELSE height END,
             points = CASE WHEN ? IS NOT NULL THEN ? ELSE points END,
             streak_days = CASE WHEN ? IS NOT NULL THEN ? ELSE streak_days END,
             page_preferences = CASE WHEN ? IS NOT NULL THEN ? ELSE page_preferences END
           WHERE id = ?`
        )
        .bind(
          body.name || null,
          body.bio !== undefined ? body.bio : null,
          body.bio !== undefined ? body.bio : null,
          body.avatar !== undefined ? body.avatar : null,
          body.avatar !== undefined ? body.avatar : null,
          body.playlists !== undefined ? JSON.stringify(body.playlists) : null,
          body.playlists !== undefined ? JSON.stringify(body.playlists) : null,
          body.sharedMetrics !== undefined ? JSON.stringify(body.sharedMetrics) : null,
          body.sharedMetrics !== undefined ? JSON.stringify(body.sharedMetrics) : null,
          body.postIts !== undefined ? JSON.stringify(body.postIts) : null,
          body.postIts !== undefined ? JSON.stringify(body.postIts) : null,
          body.activeTrack !== undefined ? (body.activeTrack ? JSON.stringify(body.activeTrack) : '') : null,
          body.activeTrack !== undefined ? (body.activeTrack ? JSON.stringify(body.activeTrack) : '') : null,
          body.workouts !== undefined ? JSON.stringify(body.workouts) : null,
          body.workouts !== undefined ? JSON.stringify(body.workouts) : null,
          body.badHabits !== undefined ? JSON.stringify(body.badHabits) : null,
          body.badHabits !== undefined ? JSON.stringify(body.badHabits) : null,
          body.is_public !== undefined ? (body.is_public ? 1 : 0) : null,
          body.is_public !== undefined ? (body.is_public ? 1 : 0) : null,
          body.weight !== undefined && body.weight !== null ? Number(body.weight) : null,
          body.weight !== undefined && body.weight !== null ? Number(body.weight) : null,
          body.height !== undefined && body.height !== null ? Number(body.height) : null,
          body.height !== undefined && body.height !== null ? Number(body.height) : null,
          body.points !== undefined && body.points !== null ? Number(body.points) : null,
          body.points !== undefined && body.points !== null ? Number(body.points) : null,
          body.streak_days !== undefined && body.streak_days !== null ? Number(body.streak_days) : null,
          body.streak_days !== undefined && body.streak_days !== null ? Number(body.streak_days) : null,
          body.pagePreferences ? JSON.stringify(body.pagePreferences) : null,
          body.pagePreferences ? JSON.stringify(body.pagePreferences) : null,
          userId
        )
        .run();
    }
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  // Passo A: Criar Categoria Básica (`/api/user/:id/tag`)
  const createTagMatch = pathname.match(/^\/api\/user\/([^/]+)\/tag$/);
  if (createTagMatch && method === 'POST') {
    const userId = createTagMatch[1];
    let tagId = body.id || `tag_${Date.now()}`;
    if (storage.mode === 'd1' && ((await foreignIds(storage.db, 'categories', [tagId], userId)).size || (await foreignIds(storage.db, 'tags', [tagId], userId)).size)) tagId = `tag_${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();
    if (storage.mode === 'd1') {
      await storage.db
        .prepare(ownedUpsertSql('categories', CATEGORY_COLS))
        .bind(tagId, userId, body.name, body.color || '#818cf8', body.bg || 'rgba(129, 140, 248, 0.15)', body.icon || 'Bookmark', 0, 0, nowIso)
        .run();
      await storage.db
        .prepare(ownedUpsertSql('tags', TAG_COLS))
        .bind(tagId, userId, body.name, body.color || '#818cf8', body.bg || 'rgba(129, 140, 248, 0.15)', body.icon || 'Bookmark', 0, 0)
        .run();
    }
    return jsonResponse(
      {
        success: true,
        tag: {
          id: tagId,
          user_id: userId,
          name: body.name,
          color: body.color || '#818cf8',
          bg: body.bg || 'rgba(129, 140, 248, 0.15)',
          icon: body.icon || 'Bookmark',
          is_shared: false,
          has_subclasses: false,
          subclasses: [],
          members: []
        }
      },
      201,
      correlationId,
      request
    );
  }

  // Passo B & D: Configuração Avançada de Categoria com Restrição Antibug (`/api/user/:id/category/:catId/config`)
  const catConfigMatch = pathname.match(/^\/api\/user\/([^/]+)\/category\/([^/]+)\/config$/);
  if (catConfigMatch && method === 'PUT') {
    const [, userId, catId] = catConfigMatch;
    const { name, color, bg, icon, is_shared, has_subclasses, subclasses = [], members = [] } = body;

    if (has_subclasses && (!Array.isArray(subclasses) || subclasses.length === 0)) {
      return jsonResponse(
        { error: 'Restrição Antibug: Para ativar Sub-classes / Matérias, é obrigatório cadastrar pelo menos 1 sub-classe.' },
        400,
        correlationId,
        request
      );
    }

    const nowIso = new Date().toISOString();
    if (storage.mode === 'd1') {
      if ((await foreignIds(storage.db, 'categories', [catId], userId)).size || (await foreignIds(storage.db, 'tags', [catId], userId)).size) {
        return jsonResponse({ error: 'Esta categoria não pertence à sua conta.' }, 403, correlationId, request);
      }
      await storage.db
        .prepare(
          `INSERT INTO categories (id, user_id, name, color, bg, icon, is_shared, has_subclasses, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = COALESCE(excluded.name, categories.name),
             color = COALESCE(excluded.color, categories.color),
             bg = COALESCE(excluded.bg, categories.bg),
             icon = COALESCE(excluded.icon, categories.icon),
             is_shared = excluded.is_shared,
             has_subclasses = excluded.has_subclasses
           WHERE categories.user_id = excluded.user_id`
        )
        .bind(
          catId,
          userId,
          name || catId,
          color || '#818cf8',
          bg || 'rgba(129, 140, 248, 0.15)',
          icon || 'Bookmark',
          is_shared ? 1 : 0,
          has_subclasses ? 1 : 0,
          nowIso
        )
        .run();

      await storage.db.prepare(`DELETE FROM subclasses WHERE category_id = ?`).bind(catId).run();
      for (const sub of subclasses) {
        if (!sub?.name?.trim()) continue;
        const subId = sub.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await storage.db
          .prepare(`INSERT INTO subclasses (id, category_id, name, priority, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(subId, catId, sub.name.trim(), sub.priority || 'Média', JSON.stringify({ hours: Number(sub.hours || 0) }), nowIso)
          .run();
      }

      await storage.db.prepare(`DELETE FROM category_members WHERE category_id = ?`).bind(catId).run();
      for (const mem of members) {
        if (!mem?.email?.trim() && !mem?.name?.trim()) continue;
        const memId = mem.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await storage.db
          .prepare(`INSERT INTO category_members (id, category_id, user_id, member_email, member_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .bind(
            memId,
            catId,
            mem.user_id || `usr_${(mem.email || mem.name).toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            (mem.email || '').trim().toLowerCase(),
            (mem.name || mem.email?.split('@')[0] || 'Colaborador').trim(),
            mem.role || 'collaborator',
            nowIso
          )
          .run();
      }
    }

    return jsonResponse({ success: true, categoryId: catId }, 200, correlationId, request);
  }

  const logEffortMatch = pathname.match(/^\/api\/user\/([^/]+)\/category\/([^/]+)\/log-effort$/);
  if (logEffortMatch && method === 'POST') {
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  const deleteTagMatch = pathname.match(/^\/api\/user\/([^/]+)\/tag\/([^/]+)$/);
  if (deleteTagMatch && method === 'DELETE') {
    const [, userId, tagId] = deleteTagMatch;
    if (storage.mode === 'd1') {
      // Antes também apagava categorias globais (de todas as contas). Agora só as da própria conta.
      await storage.db.prepare(`DELETE FROM tags WHERE (id = ? OR name = ?) AND user_id = ?`).bind(tagId, tagId, userId).run();
      await storage.db.prepare(`DELETE FROM categories WHERE (id = ? OR name = ?) AND user_id = ?`).bind(tagId, tagId, userId).run();
    }
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  return null;
}

