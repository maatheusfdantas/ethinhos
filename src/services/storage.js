// SERVIÇO DE PERSISTÊNCIA EM ARMAZENAMENTO LOCAL (LOCALSTORAGE) PARA O ETHOS
import {
  FIVE_SEEDED_USERS,
  INITIAL_TAGS,
  INITIAL_WORKOUTS,
  INITIAL_BADGES
} from '../data/initialData';

const STORAGE_KEYS = {
  USER: 'ethos_user_v1',
  AUTH_USERS: 'ethos_auth_users_v1',
  TAGS: 'ethos_tags_v1',
  HABITS: 'ethos_habits_v1',
  EVENTS: 'ethos_events_v1',
  HEALTH: 'ethos_health_v1',
  WORKOUTS: 'ethos_workouts_v1',
  BADGES: 'ethos_badges_v1',
  FRIENDS: 'ethos_friends_v1',
  FEED: 'ethos_feed_v1',
  HEATMAP: 'ethos_heatmap_v1'
};

export const getStorageData = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Erro ao ler ${key} do localStorage:`, e);
    return fallback;
  }
};

export const setStorageData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erro ao salvar ${key} no localStorage:`, e);
  }
};

export const initStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.TAGS)) {
    setStorageData(STORAGE_KEYS.TAGS, INITIAL_TAGS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.WORKOUTS)) {
    setStorageData(STORAGE_KEYS.WORKOUTS, INITIAL_WORKOUTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.BADGES)) {
    setStorageData(STORAGE_KEYS.BADGES, INITIAL_BADGES);
  }
};

/**
 * Verifica se um evento (único ou recorrente) ocorre em uma determinada data (YYYY-MM-DD)
 */
export const isEventForDate = (event, dateStr) => {
  if (!event || !dateStr) return false;
  if (event.date === dateStr) return true;
  if (!event.repeat || event.repeat === 'Nunca') return false;
  if (dateStr < event.date) return false; // Evento ainda não começou

  const targetDate = new Date(`${dateStr}T12:00:00`);
  const startDate = new Date(`${event.date}T12:00:00`);
  const dayOfWeek = targetDate.getDay();

  if (event.repeat === 'Diariamente') return true;
  if (event.repeat === 'Semanalmente') return dayOfWeek === startDate.getDay();
  if (event.repeat === 'Mensalmente') return targetDate.getDate() === startDate.getDate();
  if (event.repeat === 'Dias Úteis') return dayOfWeek >= 1 && dayOfWeek <= 5;
  
  const matchInterval = event.repeat.match(/A cada (\d+) dias/);
  if (matchInterval) {
    const interval = parseInt(matchInterval[1], 10);
    if (interval > 0) {
      const diffTime = targetDate.getTime() - startDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % interval === 0;
    }
  }

  return false;
};

export { STORAGE_KEYS };
