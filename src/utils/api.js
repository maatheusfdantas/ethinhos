/**
 * Ethos Centralized API Utility
 * Automatically attaches JWT Bearer token, correlation IDs, and ensures
 * reliable communication between frontend, SQLite local server, and Cloudflare Pages D1.
 */

export function getAuthToken() {
  try {
    return (
      localStorage.getItem('ethos_access_token') ||
      sessionStorage.getItem('ethos_access_token') ||
      ''
    );
  } catch (_e) {
    return '';
  }
}

export function getActiveUserId() {
  try {
    const rawUser = localStorage.getItem('ethos_current_user') || sessionStorage.getItem('ethos_current_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u?.id) return u.id;
    }
    return localStorage.getItem('ethos_user_id') || '';
  } catch (_e) {
    return '';
  }
}

export async function apiFetch(url, options = {}) {
  const token = getAuthToken();
  const userId = getActiveUserId();

  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (userId && !headers.has('X-Ethos-User-Id')) {
    headers.set('X-Ethos-User-Id', userId);
  }

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
}
