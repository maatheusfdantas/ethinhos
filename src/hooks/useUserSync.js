import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';

/**
 * useUserSync
 * Hidratação e persistência dos dados do usuário.
 *
 * Regras (auditoria 15/11/2026: A1, S5, F1, F2):
 * - O servidor é a fonte da verdade depois de uma carga bem-sucedida. Itens que só existem no cache
 *   local NÃO são reenviados automaticamente (podiam ser itens apagados em outro aparelho); ficam
 *   guardados em `ethos_unsynced_backup_<id>` para não se perderem.
 * - Se a carga inicial falhar, nada é sincronizado (antes, listas vazias ou velhas apagavam dados).
 *   Uma nova tentativa de carga acontece em 30 s.
 * - A sincronização envia só o que mudou desde a última gravação confirmada. Exclusões viram chamadas
 *   explícitas de excluir. Uma aba antiga não ressuscita o que foi apagado em outra.
 * - Proteção contra "esvaziamento": uma lista que passa de 5 ou mais itens para zero de uma vez não
 *   gera exclusões (isso só acontece por reset de tela, não por ação da pessoa).
 * - Notas e música têm persistência própria (utils/postits.js e o Perfil); a sincronização não as reenvia.
 * - Ao sair da conta, o envio pendente é feito na hora, antes de o token ser apagado.
 */
export const MASS_DELETE_GUARD = 5;

const COLLECTIONS = [
  { key: 'habits', prefix: 'hab', del: (uid, id) => `/api/user/${uid}/habit/${encodeURIComponent(id)}` },
  { key: 'events', prefix: 'ev', del: (uid, id) => `/api/user/${uid}/event/${encodeURIComponent(id)}` },
  { key: 'tags', prefix: 'tag', del: (uid, id) => `/api/user/${uid}/tag/${encodeURIComponent(id)}` }
];

const toSnapshot = (list) => new Map((Array.isArray(list) ? list : []).filter((i) => i?.id).map((i) => [String(i.id), JSON.stringify(i)]));

/** O que mudou numa coleção desde a última gravação confirmada. */
export function diffCollection(snapshot, list) {
  const items = Array.isArray(list) ? list : [];
  const upserts = [];
  const seen = new Set();
  for (const item of items) {
    if (!item?.id) continue;
    const id = String(item.id);
    seen.add(id);
    if (snapshot.get(id) !== JSON.stringify(item)) upserts.push(item);
  }
  let deletes = [...snapshot.keys()].filter((id) => !seen.has(id));
  let blocked = false;
  if (items.length === 0 && snapshot.size >= MASS_DELETE_GUARD) {
    deletes = [];
    blocked = true;
  }
  return { upserts, deletes, blocked };
}

function newId(prefix) {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

export function useUserSync({
  user,
  setUser,
  habits,
  setHabits,
  events,
  setEvents,
  tags,
  setTags,
  health,
  setHealth,
  workouts,
  setWorkouts
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isHydratedRef = useRef(false);
  const syncTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const hasLoadedFromServerRef = useRef(false);
  const snapshotRef = useRef({ habits: new Map(), events: new Map(), tags: new Map() });
  const latestRef = useRef({});
  const chainRef = useRef(Promise.resolve());
  const setters = { habits: setHabits, events: setEvents, tags: setTags };

  latestRef.current = { user, habits, events, tags, health, workouts };

  // Carrega e hidrata dados do usuário
  const loadUserData = async (activeUser) => {
    if (!activeUser?.id) return;
    isHydratedRef.current = false;
    setIsHydrated(false);
    hasLoadedFromServerRef.current = false;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    const uid = activeUser.id;
    const readLocal = (k, fallback) => {
      try {
        const raw = localStorage.getItem(`ethos_${k}_${uid}`);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_e) {
        return fallback;
      }
    };
    const localHabits = readLocal('habits', []);
    const localEvents = readLocal('events', []);
    const localTags = readLocal('tags', []);
    const localWorkouts = readLocal('workouts', []);
    const localHealth = {
      waterGlasses: 0,
      waterTarget: 10,
      glassMl: 250,
      waterHistory: [],
      sleep: { bedTime: '23:30', wakeTime: '07:00', targetHours: 8, logged: false },
      ...readLocal('health', {})
    };

    // 1. Cache local para a tela aparecer na hora
    setHabits(localHabits);
    setEvents(localEvents);
    setTags(localTags);
    setWorkouts(localWorkouts);
    setHealth(localHealth);

    // 2. Servidor
    try {
      const res = await apiFetch(`/api/user/${uid}/data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const serverHabits = Array.isArray(data.habits) ? data.habits : [];
      const serverEvents = Array.isArray(data.events) ? data.events : [];
      const serverTags = Array.isArray(data.tags) ? data.tags : [];
      const serverWorkouts = Array.isArray(data.workouts) ? data.workouts : [];

      // Itens que só existem neste aparelho: guardados à parte, não reenviados nem apagados.
      const localOnly = (local, server) => {
        const ids = new Set(server.map((i) => String(i?.id)));
        return (Array.isArray(local) ? local : []).filter((i) => i?.id && !ids.has(String(i.id)));
      };
      const orphans = { habits: localOnly(localHabits, serverHabits), events: localOnly(localEvents, serverEvents), tags: localOnly(localTags, serverTags) };
      if (orphans.habits.length || orphans.events.length || orphans.tags.length) {
        try {
          const key = `ethos_unsynced_backup_${uid}`;
          const prev = JSON.parse(localStorage.getItem(key) || '[]');
          const list = Array.isArray(prev) ? prev : [];
          list.push({ savedAt: new Date().toISOString(), ...orphans });
          localStorage.setItem(key, JSON.stringify(list.slice(-10)));
        } catch (_e) {}
      }

      const mergedWorkouts = serverWorkouts.length > 0 ? serverWorkouts : localWorkouts;
      const mergedHealth =
        data.health && (data.health.waterGlasses > 0 || data.health.sleep?.logged || data.health.waterTarget !== 10)
          ? data.health
          : localHealth;

      snapshotRef.current = { habits: toSnapshot(serverHabits), events: toSnapshot(serverEvents), tags: toSnapshot(serverTags) };
      setHabits(serverHabits);
      setEvents(serverEvents);
      setTags(serverTags);
      setWorkouts(mergedWorkouts);
      setHealth(mergedHealth);

      try {
        localStorage.setItem(`ethos_habits_${uid}`, JSON.stringify(serverHabits));
        localStorage.setItem(`ethos_events_${uid}`, JSON.stringify(serverEvents));
        localStorage.setItem(`ethos_tags_${uid}`, JSON.stringify(serverTags));
        localStorage.setItem(`ethos_workouts_${uid}`, JSON.stringify(mergedWorkouts));
        localStorage.setItem(`ethos_health_${uid}`, JSON.stringify(mergedHealth));
        if (Array.isArray(data.badHabits) && data.badHabits.length > 0) {
          localStorage.setItem(`ethos_bad_habits_${uid}`, JSON.stringify(data.badHabits));
        }
        // Mesmas chaves que as Notas e o Perfil leem (antes eram outras e ficavam velhas).
        if (Array.isArray(data.user?.postIts)) {
          localStorage.setItem(`ethos_postits_${uid}`, JSON.stringify(data.user.postIts));
        }
        if (data.user?.activeTrack) {
          localStorage.setItem(`ethos_music_track_${uid}`, JSON.stringify(data.user.activeTrack));
        }
      } catch (_e) {}

      if (data.user) {
        setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
      }

      hasLoadedFromServerRef.current = true;
    } catch (e) {
      console.warn('[Ethos Sync] Não foi possível carregar do servidor; mostrando o cache local, sem sincronizar. Nova tentativa em 30 s.', e);
      retryTimeoutRef.current = setTimeout(() => {
        if (latestRef.current.user?.id === uid && !hasLoadedFromServerRef.current) loadUserData(latestRef.current.user);
      }, 30000);
    } finally {
      isHydratedRef.current = true;
      setIsHydrated(true);
    }
  };

  /** Envia o que mudou. Chama apiFetch de forma síncrona (o token é lido no momento da chamada). */
  const flushNow = () => {
    const { user: u, habits: h, events: e, tags: t, health: hl, workouts: w } = latestRef.current;
    if (!u?.id || !hasLoadedFromServerRef.current) return Promise.resolve();
    const uid = u.id;
    const lists = { habits: h, events: e, tags: t };
    const diffs = {};
    for (const c of COLLECTIONS) {
      diffs[c.key] = diffCollection(snapshotRef.current[c.key], lists[c.key]);
      if (diffs[c.key].blocked) console.warn(`[Ethos Sync] ${c.key}: lista esvaziada de uma vez; nenhuma exclusão enviada.`);
    }

    let currentBadHabits;
    try {
      const rawBh = localStorage.getItem(`ethos_bad_habits_${uid}`);
      if (rawBh) currentBadHabits = JSON.parse(rawBh);
    } catch (_e) {}

    const payload = { health: hl, workouts: w, badHabits: currentBadHabits, weight: u.weight };
    for (const c of COLLECTIONS) if (diffs[c.key].upserts.length) payload[c.key] = diffs[c.key].upserts;

    setIsSyncing(true);
    const syncReq = apiFetch(`/api/user/${uid}/sync`, { method: 'PUT', body: JSON.stringify(payload) });
    const deleteReqs = COLLECTIONS.flatMap((c) =>
      diffs[c.key].deletes.map((id) =>
        apiFetch(c.del(uid, id), { method: 'DELETE' }).then((r) => ({ key: c.key, id, ok: r.ok }), () => ({ key: c.key, id, ok: false }))
      )
    );

    return (async () => {
      try {
        const res = await syncReq;
        const deleted = await Promise.all(deleteReqs);
        if (res.ok) {
          let skipped = null;
          try {
            skipped = (await res.json())?.skipped || null;
          } catch (_e) {}
          for (const c of COLLECTIONS) {
            const skip = new Set((skipped?.[c.key] || []).map(String));
            for (const item of diffs[c.key].upserts) {
              if (!skip.has(String(item.id))) snapshotRef.current[c.key].set(String(item.id), JSON.stringify(item));
            }
            // id já usado por outra conta: o item ganha um id novo e vai no próximo envio.
            if (skip.size) setters[c.key]((prev) => prev.map((it) => (skip.has(String(it?.id)) ? { ...it, id: newId(c.prefix) } : it)));
          }
        }
        for (const d of deleted) if (d.ok) snapshotRef.current[d.key].delete(String(d.id));
      } catch (_err) {
        // Conexão instável: o que não foi confirmado continua diferente do snapshot e vai no próximo envio.
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  // Carrega ao alterar o usuário logado
  useEffect(() => {
    if (user?.id) {
      loadUserData(user);
    }
  }, [user?.id]);

  // Persistência contínua com debouncing
  useEffect(() => {
    if (!user?.id || !isHydratedRef.current) return;
    const uid = user.id;

    try {
      localStorage.setItem(`ethos_habits_${uid}`, JSON.stringify(habits));
      localStorage.setItem(`ethos_events_${uid}`, JSON.stringify(events));
      localStorage.setItem(`ethos_tags_${uid}`, JSON.stringify(tags));
      localStorage.setItem(`ethos_health_${uid}`, JSON.stringify(health));
      localStorage.setItem(`ethos_workouts_${uid}`, JSON.stringify(workouts));
    } catch (_e) {}

    // Sem carga confirmada do servidor, nada é enviado.
    if (!hasLoadedFromServerRef.current) return;

    // Itens sem id ganham um antes de ir para o servidor (senão viravam duplicados a cada envio).
    let missing = false;
    for (const c of COLLECTIONS) {
      const list = latestRef.current[c.key];
      if (Array.isArray(list) && list.some((i) => i && !i.id)) {
        missing = true;
        setters[c.key]((prev) => prev.map((i) => (i && !i.id ? { ...i, id: newId(c.prefix) } : i)));
      }
    }
    if (missing) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null;
      chainRef.current = chainRef.current.then(flushNow, flushNow);
    }, 400);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [habits, events, tags, health, workouts, user?.id, user?.weight]);

  const resetSyncState = () => {
    // Envia na hora o que estava pendente (o token ainda existe neste momento).
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
      flushNow();
    }
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    isHydratedRef.current = false;
    setIsHydrated(false);
    hasLoadedFromServerRef.current = false;
    snapshotRef.current = { habits: new Map(), events: new Map(), tags: new Map() };
  };

  return {
    isHydrated,
    isSyncing,
    loadUserData,
    resetSyncState
  };
}
