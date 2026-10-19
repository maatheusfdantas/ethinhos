// LOCAL STORAGE PERSISTENCE SERVICE FOR ETHOS CLOUD WEB APP
import {
  INITIAL_USER,
  INITIAL_TAGS,
  INITIAL_HABITS,
  INITIAL_HEALTH,
  INITIAL_WORKOUTS,
  INITIAL_BADGES,
  INITIAL_FRIENDS,
  INITIAL_FEED,
  INITIAL_HEATMAP
} from '../data/initialData';

const STORAGE_KEYS = {
  USER: 'ethos_user_v1',
  AUTH_USERS: 'ethos_auth_users_v1', // US35: Multiple users register/login
  TAGS: 'ethos_tags_v1',
  HABITS: 'ethos_habits_v1',
  HEALTH: 'ethos_health_v1',
  WORKOUTS: 'ethos_workouts_v1',
  BADGES: 'ethos_badges_v1',
  FRIENDS: 'ethos_friends_v1',
  FEED: 'ethos_feed_v1',
  HEATMAP: 'ethos_heatmap_v1',
  RESET_TOKENS: 'ethos_reset_tokens_v1' // US36: Password reset tokens
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
  if (!localStorage.getItem(STORAGE_KEYS.USER)) {
    setStorageData(STORAGE_KEYS.USER, INITIAL_USER);
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUTH_USERS)) {
    setStorageData(STORAGE_KEYS.AUTH_USERS, [INITIAL_USER]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.TAGS)) {
    setStorageData(STORAGE_KEYS.TAGS, INITIAL_TAGS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.HABITS)) {
    setStorageData(STORAGE_KEYS.HABITS, INITIAL_HABITS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.HEALTH)) {
    setStorageData(STORAGE_KEYS.HEALTH, INITIAL_HEALTH);
  }
  if (!localStorage.getItem(STORAGE_KEYS.WORKOUTS)) {
    setStorageData(STORAGE_KEYS.WORKOUTS, INITIAL_WORKOUTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.BADGES)) {
    setStorageData(STORAGE_KEYS.BADGES, INITIAL_BADGES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.FRIENDS)) {
    setStorageData(STORAGE_KEYS.FRIENDS, INITIAL_FRIENDS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.FEED)) {
    setStorageData(STORAGE_KEYS.FEED, INITIAL_FEED);
  }
  if (!localStorage.getItem(STORAGE_KEYS.HEATMAP)) {
    setStorageData(STORAGE_KEYS.HEATMAP, INITIAL_HEATMAP);
  }
};

export { STORAGE_KEYS };
