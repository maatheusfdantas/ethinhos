/**
 * ============================================================================
 * COMPONENTE ISOLADO: CONEXÃO GOOGLE CALENDAR (OAUTH 2.0 + VALIDAÇÃO API V3)
 * ============================================================================
 * Renderiza o botão "Conectar com o Google", previne o Erro 401 (invalid_client)
 * permitindo configurar o Client ID / Client Secret diretamente pela interface
 * (ou usar o Sandbox OAuth 2.0 local) e exibe o resultado de `/calendarList`.
 * Usa React Portal (`createPortal`) no `document.body` para nunca ser cortado
 * por containers com `overflow: hidden` ou `backdrop-filter`.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { RefreshCw, ExternalLink, X, AlertCircle, KeyRound, Play } from 'lucide-react';

const GOOGLE_OAUTH_START_URL = '/api/auth/google';
const GOOGLE_SANDBOX_START_URL = '/api/auth/google/sandbox-consent';
const TEST_USER_ID = 'test_user_1';

export function GoogleCalendarConnect({ userId = TEST_USER_ID }) {
  const [status, setStatus] = useState({
    loading: true,
    connected: false,
    mode: 'google_live',
    hasRefreshToken: false,
    refreshTokenPreview: null,
    calendars: [],
    credentialsConfigured: false,
    redirectUri: 'http://localhost:3001/api/auth/google/callback',
    error: null
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);

  const fetchGoogleConnectionStatus = async (validateLive = false) => {
    try {
      setStatus((prev) => ({ ...prev, loading: true, error: null }));
      const query = new URLSearchParams({
        userId: userId || TEST_USER_ID,
        ...(validateLive ? { validate: 'true' } : {})
      });

      const res = await fetch(`/api/auth/google/status?${query.toString()}`);
      if (!res.ok) throw new Error('Não foi possível consultar o status do Google OAuth.');
      const data = await res.json();

      setStatus({
        loading: false,
        connected: Boolean(data.connected),
        mode: data.mode || 'google_live',
        hasRefreshToken: Boolean(data.hasRefreshToken),
        refreshTokenPreview: data.refreshTokenPreview || null,
        calendars: Array.isArray(data.calendars) ? data.calendars : [],
        credentialsConfigured: Boolean(data.credentialsConfigured),
        redirectUri: data.redirectUri || 'http://localhost:3001/api/auth/google/callback',
        error: data.validationError || null
      });
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: err.message
      }));
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('google_auth');
    const authErrorMsg = params.get('message');

    if (authResult === 'success') {
      fetchGoogleConnectionStatus(true);
      setShowDetailsModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authResult === 'needs_credentials') {
      fetchGoogleConnectionStatus(false);
      setShowSetupModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authResult === 'error') {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: authErrorMsg || 'Erro durante o consentimento OAuth 2.0 do Google.'
      }));
      setShowDetailsModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      fetchGoogleConnectionStatus(false);
    }
  }, [userId]);

  const handleConnectWithGoogle = () => {
    if (!status.credentialsConfigured) {
      setShowSetupModal(true);
      return;
    }
    window.location.href = `${GOOGLE_OAUTH_START_URL}?userId=${encodeURIComponent(userId || TEST_USER_ID)}`;
  };

  const handleSaveCredentialsAndRedirect = async (e) => {
    e.preventDefault();
    if (!clientIdInput.trim() || !clientSecretInput.trim()) return;

    try {
      setSavingCreds(true);
      const res = await fetch('/api/auth/google/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientIdInput.trim(),
          clientSecret: clientSecretInput.trim()
        })
      });

      if (res.ok) {
        window.location.href = `${GOOGLE_OAUTH_START_URL}?userId=${encodeURIComponent(userId || TEST_USER_ID)}`;
      }
    } finally {
      setSavingCreds(false);
    }
  };

  const handleStartSandboxFlow = () => {
    window.location.href = `${GOOGLE_SANDBOX_START_URL}?userId=${encodeURIComponent(userId || TEST_USER_ID)}`;
  };

  const handleDisconnect = async () => {
    await fetch(`/api/auth/google/disconnect?userId=${encodeURIComponent(userId || TEST_USER_ID)}`, {
      method: 'DELETE'
    });
    setStatus((prev) => ({
      ...prev,
      connected: false,
      hasRefreshToken: false,
      refreshTokenPreview: null,
      calendars: [],
      error: null
    }));
    setShowDetailsModal(false);
  };

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        {/* BOTÃO PRINCIPAL REQUISITADO: "Conectar com o Google" */}
        {!status.connected ? (
          <button
            type="button"
            onClick={handleConnectWithGoogle}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: '#FFFFFF',
              color: '#1A1B2F',
              border: '1.5px solid rgba(255, 255, 255, 0.9)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.14)',
              transition: 'all 0.15s ease'
            }}
            title="Iniciar fluxo OAuth 2.0 com Google Calendar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.86c2.26-2.09 3.56-5.17 3.56-8.8z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.4l3.99-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.99 3.09c.95-2.85 3.6-4.94 6.72-4.94z"
              />
            </svg>
            <span>Conectar com o Google</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowDetailsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: '#FFFFFF',
              color: '#1A1B2F',
              border: '1.5px solid #2CC295',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
            }}
            title="Ver calendários validados na conta Google"
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#2CC295'
              }}
            />
            <span>Google Conectado ({status.calendars.length})</span>
          </button>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL DE CONFIGURAÇÃO RENDERIZADO NO DOCUMENT.BODY VIA PORTAL     */}
      {/* ================================================================= */}
      {showSetupModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setShowSetupModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(18, 16, 36, 0.55)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="ethos-modal-card"
            >
              {/* Cabeçalho */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(33, 31, 56, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '11px',
                      backgroundColor: '#211F38',
                      color: '#38BDF8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15.5px', fontWeight: 700, margin: 0, color: '#1A1B2F' }}>
                      Conectar Google Calendar (OAuth 2.0)
                    </h3>
                    <span style={{ fontSize: '11.5px', color: '#5A5B75' }}>
                      Informe suas credenciais do Google Cloud ou execute o simulador OAuth 2.0 local
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '9px',
                    border: 'none',
                    backgroundColor: '#DCDCE6',
                    color: '#211F38',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Corpo em 2 colunas horizontais no PC/Tablet e 1 coluna rolável no Celular */}
              <div className="ethos-modal-grid-2col">
                {/* Coluna 1: Inserir Client ID e Client Secret Reais */}
                <form
                  onSubmit={handleSaveCredentialsAndRedirect}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D2E0',
                    borderRadius: '16px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px'
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1A1B2F' }}>
                    Opção 1: Credenciais Google Cloud
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#5A5B75', marginBottom: '3px' }}>
                      GOOGLE_CLIENT_ID
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 123456-abc.apps.googleusercontent.com"
                      value={clientIdInput}
                      onChange={(e) => setClientIdInput(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '9px',
                        border: '1px solid #D0D2E0',
                        backgroundColor: '#F8F9FC',
                        fontSize: '11.5px',
                        color: '#1A1B2F',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#5A5B75', marginBottom: '3px' }}>
                      GOOGLE_CLIENT_SECRET
                    </label>
                    <input
                      type="password"
                      placeholder="Ex: GOCSPX-xxxxxxxxxxxxxxxx"
                      value={clientSecretInput}
                      onChange={(e) => setClientSecretInput(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '9px',
                        border: '1px solid #D0D2E0',
                        backgroundColor: '#F8F9FC',
                        fontSize: '11.5px',
                        color: '#1A1B2F',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: '10.5px',
                      color: '#5A5B75',
                      backgroundColor: '#F4F4F9',
                      padding: '6px 9px',
                      borderRadius: '8px',
                      border: '1px solid #E2E4F0',
                      wordBreak: 'break-all'
                    }}
                  >
                    <strong>Redirect URI:</strong>{' '}
                    <code style={{ color: '#211F38', fontWeight: 600 }}>{status.redirectUri}</code>
                  </div>

                  <button
                    type="submit"
                    disabled={savingCreds}
                    style={{
                      marginTop: 'auto',
                      padding: '9px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#211F38',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {savingCreds ? 'Salvando...' : 'Salvar e Ir para Login do Google'}
                  </button>
                </form>

                {/* Coluna 2: Testar Fluxo OAuth em Modo Sandbox */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D2E0',
                    borderRadius: '16px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 9px',
                        borderRadius: '999px',
                        backgroundColor: '#E0F2FE',
                        color: '#0369A1',
                        fontSize: '10px',
                        fontWeight: 700,
                        marginBottom: '6px'
                      }}
                    >
                      Teste Imediato (Sem Conta Cloud)
                    </span>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1A1B2F', marginBottom: '6px' }}>
                      Opção 2: Simulador OAuth 2.0 Local
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#5A5B75', lineHeight: 1.45, margin: 0 }}>
                      Não possui um <code>CLIENT_ID</code> criado no Google Cloud Console agora? Execute o fluxo completo de consentimento, captura do <code>code</code> no callback, gravação do <code>refresh_token</code> e listagem de calendários localmente.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartSandboxFlow}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #211F38',
                      backgroundColor: '#DCDCE6',
                      color: '#1A1B2F',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Play size={13} />
                    Testar Fluxo OAuth (Sandbox)
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================================================================= */}
      {/* MODAL DE INSPEÇÃO RENDERIZADO NO DOCUMENT.BODY VIA PORTAL         */}
      {/* ================================================================= */}
      {showDetailsModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setShowDetailsModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(18, 16, 36, 0.55)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '580px',
                backgroundColor: '#ECECF4',
                borderRadius: '24px',
                padding: '20px 24px',
                border: '1.5px solid #FFFFFF',
                boxShadow: '0 28px 70px rgba(15, 14, 34, 0.45)',
                color: '#1A1B2F',
                fontFamily: "'Outfit', 'Inter', sans-serif"
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1A1B2F' }}>
                    Status da Conexão Google Calendar (OAuth 2.0)
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#5A5B75' }}>
                    Validação via GET /calendar/v3/users/me/calendarList
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '9px',
                    border: 'none',
                    backgroundColor: '#DCDCE6',
                    color: '#211F38',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {status.error && (
                <div
                  style={{
                    backgroundColor: '#FFE4E6',
                    border: '1px solid #FDA4AF',
                    color: '#9F1239',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{status.error}</span>
                </div>
              )}

              {/* Resumo dos Tokens salvos */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D0D2E0',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ color: '#5A5B75', display: 'block', fontSize: '11px' }}>Usuário de Teste</span>
                  <strong style={{ color: '#1A1B2F' }}>{userId || TEST_USER_ID}</strong>
                </div>
                <div>
                  <span style={{ color: '#5A5B75', display: 'block', fontSize: '11px' }}>Refresh Token Armazenado</span>
                  <strong style={{ color: status.hasRefreshToken ? '#059669' : '#D97706' }}>
                    {status.hasRefreshToken
                      ? `Sim (${status.refreshTokenPreview || 'Salvo'})`
                      : 'Aguardando 1º consentimento'}
                  </strong>
                </div>
              </div>

              {/* Lista de Calendários retornados pela API v3 */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A1B2F' }}>
                    Calendários Encontrados ({status.calendars.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchGoogleConnectionStatus(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: 'none',
                      backgroundColor: '#DCDCE6',
                      color: '#211F38',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={11} />
                    Testar API Novamente
                  </button>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D2E0',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  {status.calendars.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#5A5B75' }}>
                      Nenhum calendário carregado ainda.
                    </span>
                  ) : (
                    status.calendars.map((cal) => (
                      <div
                        key={cal.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 0',
                          borderBottom: '1px solid rgba(0,0,0,0.05)',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '9px',
                              height: '9px',
                              borderRadius: '50%',
                              backgroundColor: cal.backgroundColor || '#4285F4'
                            }}
                          />
                          <span style={{ fontWeight: 600, color: '#1A1B2F' }}>{cal.summary}</span>
                          {cal.primary && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '999px',
                                backgroundColor: '#211F38',
                                color: '#FFFFFF',
                                fontWeight: 600
                              }}
                            >
                              Principal
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#5A5B75' }}>{cal.timeZone}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                {status.connected && (
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(true)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#FFE4E6',
                      color: '#9F1239',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Desconectar Conta
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowSetupModal(true);
                  }}
                  style={{
                    marginLeft: 'auto',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#211F38',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ExternalLink size={13} />
                  Configurar / Reconectar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      <ConfirmDeleteModal
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        isCategory={false}
        itemName="Google Agenda"
        title="Desconectar Google Agenda"
        message="Deseja desconectar sua conta do Google Agenda deste dispositivo? A sincronização de eventos será interrompida."
        onConfirm={async () => {
          await handleDisconnect();
          setShowDisconnectConfirm(false);
        }}
      />
    </>
  );
}
