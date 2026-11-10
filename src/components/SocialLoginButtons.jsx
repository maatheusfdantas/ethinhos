import React from 'react';

/**
 * SocialLoginButtons — Botões oficiais para login social e sincronização de agenda
 * Suporta Google Calendar e Microsoft Graph (Outlook)
 */
export function SocialLoginButtons({ currentUserId = null, mode = 'login' }) {
  const handleSocialAuth = (provider) => {
    const params = new URLSearchParams();
    if (mode === 'link' && currentUserId) {
      params.set('action', 'link_account');
      params.set('userId', currentUserId);
    } else {
      params.set('action', 'login');
    }
    window.location.href = `/api/auth/oauth/${provider}?${params.toString()}`;
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
        <div style={{ flex: 1, borderTop: '1px solid #E2E8F0' }} />
        <span
          style={{
            padding: '0 10px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          Ou continue com
        </span>
        <div style={{ flex: 1, borderTop: '1px solid #E2E8F0' }} />
      </div>

      {/* Botão Google Calendar */}
      <button
        type="button"
        onClick={() => handleSocialAuth('google')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '11px',
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          color: '#1E293B',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
          e.currentTarget.style.borderColor = '#E2E8F0';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Google Agenda & Conta</span>
      </button>

      {/* Botão Outlook / Microsoft Graph */}
      <button
        type="button"
        onClick={() => handleSocialAuth('microsoft')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '11px',
          backgroundColor: '#2F2F2F',
          border: '1.5px solid #404040',
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#3D3D3D';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2F2F2F';
        }}
      >
        <svg width="15" height="15" viewBox="0 0 21 21">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        <span>Outlook / Microsoft Graph</span>
      </button>
    </div>
  );
}
export default SocialLoginButtons;

