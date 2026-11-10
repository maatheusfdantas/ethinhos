import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';

/**
 * useUserSync
 * Hook customizado para orquestrar a hidratação e persistência segura do usuário
 * Previne sobrescritas acidentais e perda de dados (Anti-Wipe)
 */
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
  const hasLoadedFromServerRef = useRef(false);

  // Carrega e hidrata dados do usuário
  const loadUserData = async (activeUser) => {
    if (!activeUser?.id) return;
    isHydratedRef.current = false;
    setIsHydrated(false);
    hasLoadedFromServerRef.current = false;

    const uid = activeUser.id;
    let localHabits = [];
    let localEvents = [];
    let localTags = [];
    let localWorkouts = [];
    let localHealth = {
      waterGlasses: 0,
      waterTarget: 10,
      glassMl: 250,
      waterHistory: [],
      sleep: { bedTime: '23:30', wakeTime: '07:00', targetHours: 8, logged: false }
    };

    // 1. Hidratação instantânea do cache local para resposta imediata
    try {
      const sh = localStorage.getItem(`ethos_habits_${uid}`);
      if (sh) localHabits = JSON.parse(sh);
    } catch (_e) {}
    try {
      const se = localStorage.getItem(`ethos_events_${uid}`);
      if (se) localEvents = JSON.parse(se);
    } catch (_e) {}
    try {
      const st = localStorage.getItem(`ethos_tags_${uid}`);
      if (st) localTags = JSON.parse(st);
    } catch (_e) {}
    try {
      const sw = localStorage.getItem(`ethos_workouts_${uid}`);
      if (sw) localWorkouts = JSON.parse(sw);
    } catch (_e) {}
    try {
      const shl = localStorage.getItem(`ethos_health_${uid}`);
      if (shl) localHealth = { ...localHealth, ...JSON.parse(shl) };
    } catch (_e) {}

    setHabits(localHabits);
    setEvents(localEvents);
    setTags(localTags);
    setWorkouts(localWorkouts);
    setHealth(localHealth);

    // 2. Consulta de verdade no backend (SQLite local ou Cloudflare D1)
    try {
      const res = await apiFetch(`/api/user/${uid}/data`);
      if (res.ok) {
        const data = await res.json();
        const serverHabits = Array.isArray(data.habits) ? data.habits : [];
        const serverEvents = Array.isArray(data.events) ? data.events : [];
        const serverTags = Array.isArray(data.tags) ? data.tags : [];
        const serverWorkouts = Array.isArray(data.workouts) ? data.workouts : [];

        // Mesclagem inteligente: se servidor possui registros, prioriza; caso contrário, preserva os locais
        const mergedHabits = serverHabits.length > 0 ? serverHabits : localHabits;
        const mergedEvents = serverEvents.length > 0 ? serverEvents : localEvents;
        const mergedTags = serverTags.length > 0 ? serverTags : localTags;
        const mergedWorkouts = serverWorkouts.length > 0 ? serverWorkouts : localWorkouts;
        const mergedHealth =
          data.health && (data.health.waterGlasses > 0 || data.health.sleep?.logged || data.health.waterTarget !== 10)
            ? data.health
            : localHealth;

        setHabits(mergedHabits);
        setEvents(mergedEvents);
        setTags(mergedTags);
        setWorkouts(mergedWorkouts);
        setHealth(mergedHealth);

        try {
          localStorage.setItem(`ethos_habits_${uid}`, JSON.stringify(mergedHabits));
          localStorage.setItem(`ethos_events_${uid}`, JSON.stringify(mergedEvents));
          localStorage.setItem(`ethos_tags_${uid}`, JSON.stringify(mergedTags));
          localStorage.setItem(`ethos_workouts_${uid}`, JSON.stringify(mergedWorkouts));
          localStorage.setItem(`ethos_health_${uid}`, JSON.stringify(mergedHealth));
          if (Array.isArray(data.badHabits) && data.badHabits.length > 0) {
            localStorage.setItem(`ethos_bad_habits_${uid}`, JSON.stringify(data.badHabits));
          }
          if (Array.isArray(data.user?.postIts) && data.user.postIts.length > 0) {
            localStorage.setItem(`ethos_profile_postits_${uid}`, JSON.stringify(data.user.postIts));
          }
          if (data.user?.activeTrack) {
            localStorage.setItem(`ethos_profile_track_${uid}`, JSON.stringify(data.user.activeTrack));
          }
        } catch (_e) {}

        if (data.user) {
          setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
        }

        hasLoadedFromServerRef.current = true;

        // Se tínhamos registros locais não presentes no servidor, envia agora
        if (
          (serverHabits.length === 0 && mergedHabits.length > 0) ||
          (serverEvents.length === 0 && mergedEvents.length > 0) ||
          (serverTags.length === 0 && mergedTags.length > 0) ||
          (serverWorkouts.length === 0 && mergedWorkouts.length > 0)
        ) {
          apiFetch(`/api/user/${uid}/sync`, {
            method: 'PUT',
            body: JSON.stringify({
              habits: mergedHabits,
              events: mergedEvents,
              tags: mergedTags,
              workouts: mergedWorkouts,
              health: mergedHealth,
              weight: activeUser.weight
            })
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[Ethos Sync] Backend offline ou resposta pendente, utilizando cache local.', e);
    } finally {
      isHydratedRef.current = true;
      setIsHydrated(true);
    }
  };

  // Carrega ao alterar o usuário logado
  useEffect(() => {
    if (user?.id) {
      loadUserData(user);
    }
  }, [user?.id]);

  // Persistência contínua com debouncing seguro
  useEffect(() => {
    if (!user?.id || !isHydratedRef.current) return;
    const uid = user.id;

    // Atualiza cache local instantaneamente
    try {
      localStorage.setItem(`ethos_habits_${uid}`, JSON.stringify(habits));
      localStorage.setItem(`ethos_events_${uid}`, JSON.stringify(events));
      localStorage.setItem(`ethos_tags_${uid}`, JSON.stringify(tags));
      localStorage.setItem(`ethos_health_${uid}`, JSON.stringify(health));
      localStorage.setItem(`ethos_workouts_${uid}`, JSON.stringify(workouts));
    } catch (_e) {}

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      let currentBadHabits = undefined;
      let currentPostIts = undefined;
      try {
        const rawBh = localStorage.getItem(`ethos_bad_habits_${uid}`);
        if (rawBh) currentBadHabits = JSON.parse(rawBh);
        const rawPi = localStorage.getItem(`ethos_profile_postits_${uid}`);
        if (rawPi) currentPostIts = JSON.parse(rawPi);
      } catch (_e) {}

      setIsSyncing(true);
      try {
        await apiFetch(`/api/user/${uid}/sync`, {
          method: 'PUT',
          body: JSON.stringify({
            habits,
            events,
            tags,
            health,
            workouts,
            badHabits: currentBadHabits,
            postIts: currentPostIts,
            weight: user.weight
          })
        });
      } catch (_err) {
        // Silencioso em caso de conexão instável
      } finally {
        setIsSyncing(false);
      }
    }, 400);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [habits, events, tags, health, workouts, user?.id, user?.weight]);

  const resetSyncState = () => {
    isHydratedRef.current = false;
    setIsHydrated(false);
    hasLoadedFromServerRef.current = false;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
  };

  return {
    isHydrated,
    isSyncing,
    loadUserData,
    resetSyncState
  };
}
