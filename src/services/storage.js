// LOCAL STORAGE PERSISTENCE SERVICE FOR ETHOS CLOUD WEB APP
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
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
};

export const setStorageData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
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

export { STORAGE_KEYS };
