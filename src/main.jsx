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
      const accessToken =
        sessionStorage.getItem('ethos_access_token') ||
        localStorage.getItem('ethos_access_token');
      const headers = new Headers(init.headers || {});
      if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      init = { ...init, headers };
    }

    return nativeFetch(input, init);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
