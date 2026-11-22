import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/roxo.css'
import App from './App.jsx'
import { aplicarTema, lerTema } from './components/rx/tema'

// Tema salvo (claro por padrão) aplicado antes da primeira renderização, para não piscar
aplicarTema(lerTema())

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Ethos Fatal Error]:', error, info);
  }

  handleReload = () => {
    try {
      sessionStorage.clear();
    } catch (_e) {}
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 30%, #152238 0%, #05070B 80%)',
          padding: '24px',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: 'rgba(17, 24, 39, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '36px 32px',
            textAlign: 'center',
            color: '#F8FAFC',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              fontSize: '24px'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
              Recuperação do Sistema
            </h2>
            <p style={{ fontSize: '13.5px', color: '#94A3B8', margin: '0 0 24px 0', lineHeight: 1.55 }}>
              Detectamos uma instabilidade temporária na inicialização da interface. Clique abaixo para reiniciar o aplicativo com segurança.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)'
              }}
            >
              Reiniciar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
