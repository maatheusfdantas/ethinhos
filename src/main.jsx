import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ============================================================================
// INTERCEPTOR GLOBAL DE SEGURANÇA JWT (INJETA AUTHORIZATION: BEARER <TOKEN>)
// ============================================================================
if (typeof window !== 'undefined' && !window.__ETHOS_FETCH_SECURED__) {
  const nativeFetch = window.fetch.bind(window);
  window.__ETHOS_FETCH_SECURED__ = true;

  window.fetch = async (input, init = {}) => {
    const urlStr = typeof input === 'string' ? input : input?.url || '';
    const isApiCall = urlStr.startsWith('/api/') || urlStr.includes('/api/');

    if (isApiCall) {
      let accessToken =
        sessionStorage.getItem('ethos_access_token') ||
        localStorage.getItem('ethos_access_token') ||
        '';

      let activeUserId = localStorage.getItem('ethos_user_id') || '';

      if (!accessToken || !activeUserId) {
        try {
          const raw = localStorage.getItem('ethos_current_user') || sessionStorage.getItem('ethos_current_user');
          if (raw) {
            const u = JSON.parse(raw);
            if (!accessToken) accessToken = u?.auth?.accessToken || u?.token || '';
            if (!activeUserId) activeUserId = u?.id || '';
          }
        } catch (_e) {}
      }

      const headers = new Headers(init.headers || {});
      if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      if (activeUserId && !headers.has('X-Ethos-User-Id')) {
        headers.set('X-Ethos-User-Id', activeUserId);
      }
      if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      init = { ...init, headers };
    }

    let response = await nativeFetch(input, init);

    if (isApiCall && response.status === 401 && !urlStr.includes('/api/auth/')) {
      const refreshToken =
        sessionStorage.getItem('ethos_refresh_token') ||
        localStorage.getItem('ethos_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await nativeFetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newAccess = refreshData.accessToken || refreshData.auth?.accessToken;
            const newRefresh = refreshData.refreshToken || refreshData.auth?.refreshToken;
            if (newAccess) {
              sessionStorage.setItem('ethos_access_token', newAccess);
              localStorage.setItem('ethos_access_token', newAccess);
              if (newRefresh) {
                sessionStorage.setItem('ethos_refresh_token', newRefresh);
                localStorage.setItem('ethos_refresh_token', newRefresh);
              }
              const retryHeaders = new Headers(init.headers || {});
              retryHeaders.set('Authorization', `Bearer ${newAccess}`);
              response = await nativeFetch(input, { ...init, headers: retryHeaders });
            }
          }
        } catch (_e) {}
      }
    }

    return response;
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
