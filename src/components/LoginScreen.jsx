import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowLeft,
  CheckCircle2, 
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { SocialLoginButtons } from './SocialLoginButtons';

export function LoginScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot_request', 'forgot_verify'
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Campos de Cadastro
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [emailCheck, setEmailCheck] = useState({
    status: 'idle', // 'idle' | 'checking' | 'valid' | 'invalid'
    message: '',
    mxServer: ''
  });

  // Estados de Recuperação de Senha por Token
  const [tokenInput, setTokenInput] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);

  // Verificação de existência de e-mail via API Externa (Disify + Google DNS MX)
  const verifyEmailAddress = async (rawEmail) => {
    const email = String(rawEmail || '').trim();
    if (!email || !email.includes('@')) {
      setEmailCheck({ status: 'idle', message: '', mxServer: '' });
      return false;
    }

    setEmailCheck({
      status: 'checking',
      message: 'Consultando API de verificação (DNS/MX)...',
      mxServer: ''
    });

    try {
      const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setEmailCheck({
          status: 'invalid',
          message: data.error || 'Este e-mail não existe ou não possui servidor ativo.',
          mxServer: ''
        });
        return false;
      }

      setEmailCheck({
        status: 'valid',
        message: `E-mail existente e verificado (${data.mxServer || data.domain})`,
        mxServer: data.mxServer || ''
      });
      return true;
    } catch (_err) {
      setEmailCheck({
        status: 'invalid',
        message: 'Não foi possível validar o e-mail na API.',
        mxServer: ''
      });
      return false;
    }
  };

  // Submissão de Login via API
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requireVerification) {
          setRegEmail(data.email || loginInput.trim());
          setMaskedEmail(data.maskedEmail || data.email || loginInput.trim());
          setTokenInput('');
          setErrorMessage(data.error || 'Valide sua conta com o código enviado por e-mail ou com um token de 48h.');
          setMode('register_verify');
          setLoading(false);
          return;
        }
        setErrorMessage(data.error || 'Erro ao efetuar login.');
        setLoading(false);
        return;
      }

      if (data.requireVerification) {
        setRegEmail(data.email || loginInput.trim());
        setMaskedEmail(data.maskedEmail || data.email || loginInput.trim());
        setTokenInput('');
        setMode('register_verify');
        setLoading(false);
        return;
      }

      if (data.auth?.accessToken) {
        sessionStorage.setItem('ethos_access_token', data.auth.accessToken);
        localStorage.setItem('ethos_access_token', data.auth.accessToken);
      }
      if (data.auth?.refreshToken) {
        sessionStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
        localStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
      }
      onLoginSuccess(data);
    } catch (err) {
      setErrorMessage('Erro ao conectar com o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register (Exige verificação de existência do e-mail por API)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const isEmailReal = await verifyEmailAddress(regEmail);
      if (!isEmailReal) {
        setErrorMessage('Informe um endereço de e-mail real e existente para concluir o cadastro.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          username: regUsername.trim() || regEmail.split('@')[0],
          password: regPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao criar conta.');
        setLoading(false);
        return;
      }

      if (data.requireVerification) {
        setMaskedEmail(data.maskedEmail || regEmail);
        setTokenInput('');
        setMode('register_verify');
        setLoading(false);
        return;
      }

      if (data.auth?.accessToken) {
        sessionStorage.setItem('ethos_access_token', data.auth.accessToken);
        localStorage.setItem('ethos_access_token', data.auth.accessToken);
      }
      if (data.auth?.refreshToken) {
        sessionStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
        localStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
      }
      onLoginSuccess(data);
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Validar código de confirmação de e-mail no cadastro / token de 48h
  const handleVerifyRegisterToken = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const targetEmail = (regEmail || loginInput).trim();
    const cleanToken = tokenInput.replace(/\D/g, '') || tokenInput.trim();

    try {
      const res = await fetch('/api/auth/verify-email-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          token: cleanToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Código incorreto ou expirado.');
        setLoading(false);
        return;
      }

      if (data.auth?.accessToken) {
        sessionStorage.setItem('ethos_access_token', data.auth.accessToken);
        localStorage.setItem('ethos_access_token', data.auth.accessToken);
      }
      if (data.auth?.refreshToken) {
        sessionStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
        localStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
      }
      onLoginSuccess(data.user ? { ...data.user, auth: data.auth } : data);
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código de confirmação de e-mail
  const handleResendRegisterCode = async () => {
    const targetEmail = (regEmail || loginInput).trim();
    if (!targetEmail) {
      setErrorMessage('Informe seu e-mail ou nome de usuário acima para receber o código.');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Novo código de verificação enviado!');
      } else {
        setErrorMessage(data.error || 'Erro ao reenviar código.');
      }
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Request Token (US36)
  const handleRequestToken = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao solicitar token de recuperação.');
        setLoading(false);
        return;
      }

      setMaskedEmail(data.maskedEmail || loginInput.trim());
      setMode('forgot_verify');
    } catch (err) {
      setMaskedEmail(loginInput.trim());
      setMode('forgot_verify');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password (US36)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginInput.trim(),
          token: tokenInput.trim(),
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao redefinir senha.');
        setLoading(false);
        return;
      }

      setResetSuccessMsg(true);
      setTimeout(() => {
        setResetSuccessMsg(false);
        setMode('login');
        setPassword(newPassword);
      }, 1500);
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundImage: 'url("/ethos-login-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#f1f5f9',
        color: '#1e293b',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
        padding: '24px 16px'
      }}
    >
      {/* Espaçador superior para centralização equilibrada */}
      <div style={{ height: '16px' }} />

      {/* ============================================================== */}
      {/* CARD CENTRAL DE LOGIN (FIEL AO MOCKUP ENVIADO)                 */}
      {/* ============================================================== */}
      <div 
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '380px',
          margin: 'auto 0'
        }}
      >
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            boxShadow: '0 18px 45px -12px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04)',
            padding: '38px 36px 34px 36px'
          }}
        >
          {/* LOGO ETHOS (SÍMBOLO INFINITO COM 'E' E BRILHO GLOSSY) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
            <img 
              src="/ethos-logo-exact.png" 
              alt="Ethos Logo" 
              style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
              }}
            />
            <svg 
              width="76" 
              height="38" 
              viewBox="0 0 76 38" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'none' }}
            >
              <defs>
                <linearGradient id="ethosGrad" x1="0" y1="0" x2="76" y2="38" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#12355b" />
                  <stop offset="50%" stopColor="#22558c" />
                  <stop offset="100%" stopColor="#3b76b2" />
                </linearGradient>
              </defs>
              <path 
                d="M 38 19 C 31 6, 8 6, 8 19 C 8 32, 31 32, 38 19 C 45 6, 68 6, 68 19 C 68 32, 45 32, 38 19 Z" 
                stroke="url(#ethosGrad)" 
                strokeWidth="4.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <line 
                x1="8" 
                y1="19" 
                x2="25" 
                y2="19" 
                stroke="#12355b" 
                strokeWidth="4.5" 
                strokeLinecap="round" 
              />
            </svg>
          </div>

          {/* TÍTULO */}
          <h1 
            style={{
              fontSize: '21px',
              fontWeight: 500,
              color: '#0f172a',
              textAlign: 'center',
              marginBottom: '26px',
              letterSpacing: '-0.01em'
            }}
          >
            {mode === 'login' && 'Entrar no Ethos'}
            {mode === 'register' && 'Cadastrar no Ethos'}
            {mode === 'register_verify' && 'Confirmar E-mail'}
            {mode === 'forgot_request' && 'Recuperar Senha'}
            {mode === 'forgot_verify' && 'Validar Código'}
          </h1>

          {/* MENSAGEM DE ERRO */}
          {errorMessage && (
            <div 
              style={{
                marginBottom: '16px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================== */}
          {/* 1. FORMULÁRIO DE LOGIN                                     */}
          {/* ========================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Campo Email */}
              <div style={{ marginBottom: '18px' }}>
                <label 
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    color: '#64748b',
                    marginBottom: '6px',
                    fontWeight: 400
                  }}
                >
                  Email
                </label>
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingBottom: '7px',
                    borderBottom: '1.5px solid #4a6b96'
                  }}
                >
                  <Mail size={16} color="#1e293b" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  <input 
                    type="text" 
                    placeholder="Digite seu email"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      fontSize: '13.5px',
                      color: '#1e293b',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div style={{ marginBottom: '8px' }}>
                <label 
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    color: '#64748b',
                    marginBottom: '6px',
                    fontWeight: 400
                  }}
                >
                  Senha
                </label>
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingBottom: '7px',
                    borderBottom: '1.5px solid #4a6b96'
                  }}
                >
                  <Lock size={16} color="#1e293b" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  <input 
                    type="password" 
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      fontSize: '13.5px',
                      color: '#1e293b',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Esqueceu sua senha? */}
              <div style={{ textAlign: 'right', marginBottom: '22px' }}>
                <button 
                  type="button" 
                  onClick={() => { setErrorMessage(''); setMode('forgot_request'); }}
                  style={{
                    fontSize: '11.5px',
                    color: '#2b5b92',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 400
                  }}
                >
                  Esqueceu sua senha?
                </button>
              </div>

              {/* Botão ENTRAR */}
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '7px',
                  backgroundColor: '#215287',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: 'none',
                  boxShadow: '0 4px 10px rgba(33, 82, 135, 0.25)',
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#19416d'; }}
                onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#215287'; }}
              >
                {loading ? 'ENTRANDO...' : 'ENTRAR'}
              </button>

              {/* Botões Oficiais de Login Social e Sincronização de Calendários */}
              <SocialLoginButtons />

              {/* Link Cadastre-se agora */}
              <div 
                style={{
                  marginTop: '18px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#334155'
                }}
              >
                Ainda não tem uma conta?{' '}
                <button 
                  type="button" 
                  onClick={() => { setErrorMessage(''); setMode('register'); }}
                  style={{
                    color: '#215287',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '12px'
                  }}
                >
                  Cadastre-se agora
                </button>
              </div>

              {/* Atalho direto para validar conta com Token de 48h */}
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    if (loginInput.trim()) setRegEmail(loginInput.trim());
                    setTokenInput('');
                    setMode('register_verify');
                  }}
                  style={{
                    fontSize: '11.5px',
                    color: '#0f766e',
                    backgroundColor: '#f0fdfa',
                    border: '1px solid #99f6e4',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    width: '100%'
                  }}
                >
                  🔑 Já tenho um Token / Validar Conta (48h)
                </button>
              </div>

            </form>
          )}

          {/* ========================================================== */}
          {/* 2. FORMULÁRIO DE CADASTRO                                  */}
          {/* ========================================================== */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  Nome Completo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px', borderBottom: '1.5px solid #4a6b96' }}>
                  <User size={16} color="#1e293b" strokeWidth={1.75} />
                  <input 
                    type="text" 
                    placeholder="Digite seu nome"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b' }}>
                    Email (Verificado por API)
                  </label>
                  <button
                    type="button"
                    onClick={() => verifyEmailAddress(regEmail)}
                    disabled={!regEmail || emailCheck.status === 'checking'}
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: '#215287',
                      backgroundColor: 'rgba(33, 82, 135, 0.08)',
                      border: '1px solid rgba(33, 82, 135, 0.2)',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      cursor: regEmail ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {emailCheck.status === 'checking' ? 'Verificando...' : 'Verificar E-mail'}
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    paddingBottom: '6px',
                    borderBottom:
                      emailCheck.status === 'valid'
                        ? '1.5px solid #10b981'
                        : emailCheck.status === 'invalid'
                        ? '1.5px solid #e11d48'
                        : '1.5px solid #4a6b96'
                  }}
                >
                  <Mail
                    size={16}
                    color={
                      emailCheck.status === 'valid'
                        ? '#059669'
                        : emailCheck.status === 'invalid'
                        ? '#e11d48'
                        : '#1e293b'
                    }
                    strokeWidth={1.75}
                  />
                  <input 
                    type="email" 
                    placeholder="Digite um e-mail real existente"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (emailCheck.status !== 'idle') {
                        setEmailCheck({ status: 'idle', message: '', mxServer: '' });
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.includes('@')) {
                        verifyEmailAddress(e.target.value);
                      }
                    }}
                    required
                    style={{ width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
                {emailCheck.status !== 'idle' && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '6px 9px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor:
                        emailCheck.status === 'valid'
                          ? '#ecfdf5'
                          : emailCheck.status === 'invalid'
                          ? '#fff1f2'
                          : '#f8fafc',
                      border:
                        emailCheck.status === 'valid'
                          ? '1px solid #a7f3d0'
                          : emailCheck.status === 'invalid'
                          ? '1px solid #fecdd3'
                          : '1px solid #e2e8f0',
                      color:
                        emailCheck.status === 'valid'
                          ? '#047857'
                          : emailCheck.status === 'invalid'
                          ? '#be123c'
                          : '#475569'
                    }}
                  >
                    {emailCheck.status === 'valid' && <CheckCircle2 size={13} style={{ flexShrink: 0 }} />}
                    {emailCheck.status === 'invalid' && <AlertCircle size={13} style={{ flexShrink: 0 }} />}
                    <span>{emailCheck.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  Usuário
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px', borderBottom: '1.5px solid #4a6b96' }}>
                  <User size={16} color="#1e293b" strokeWidth={1.75} />
                  <input 
                    type="text" 
                    placeholder="Digite seu usuário"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  Senha
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px', borderBottom: '1.5px solid #4a6b96' }}>
                  <Lock size={16} color="#1e293b" strokeWidth={1.75} />
                  <input 
                    type="password" 
                    placeholder="Crie uma senha"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  height: '40px',
                  marginTop: '8px',
                  borderRadius: '7px',
                  backgroundColor: '#215287',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: 'none',
                  boxShadow: '0 4px 10px rgba(33, 82, 135, 0.25)',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'CRIANDO CONTA...' : 'CADASTRAR'}
              </button>

              <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '12px', color: '#334155' }}>
                Já possui uma conta?{' '}
                <button 
                  type="button" 
                  onClick={() => { setErrorMessage(''); setMode('login'); }}
                  style={{ color: '#215287', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                >
                  Entrar agora
                </button>
              </div>
            </form>
          )}

          {/* ========================================================== */}
          {/* 2.1. CONFIRMAÇÃO DE E-MAIL (CADASTRO / TOKEN 48H)          */}
          {/* ========================================================== */}
          {mode === 'register_verify' && (
            <form onSubmit={handleVerifyRegisterToken} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Mail size={15} color="#16a34a" />
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#15803d' }}>
                    Validação de Conta (E-mail ou Token 48h)
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#1f2937', margin: 0, lineHeight: 1.45 }}>
                  Informe seu e-mail (ou usuário) e o código de 6 dígitos recebido no e-mail ou gerado pelo Administrador (válido por 48h).
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  E-mail ou Usuário da Conta
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px', borderBottom: '1.5px solid #4a6b96' }}>
                  <Mail size={16} color="#1e293b" strokeWidth={1.75} />
                  <input
                    type="text"
                    placeholder="Digite seu e-mail ou usuário"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      fontSize: '13.5px',
                      color: '#1e293b',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  Código / Token de 6 dígitos
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px', borderBottom: '1.5px solid #4a6b96' }}>
                  <KeyRound size={16} color="#1e293b" strokeWidth={1.75} />
                  <input 
                    type="text" 
                    placeholder="000 • 000"
                    maxLength={12}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      fontSize: '18px',
                      fontWeight: 700,
                      letterSpacing: '4px',
                      color: '#1e293b',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      textAlign: 'center'
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '7px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                {loading ? 'VALIDANDO...' : 'CONFIRMAR E ENTRAR'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '12px' }}>
                <button
                  type="button"
                  onClick={handleResendRegisterCode}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setMode('login'); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          )}

          {/* ========================================================== */}
          {/* 3. RECUPERAR SENHA                                         */}
          {/* ========================================================== */}
          {mode === 'forgot_request' && (
            <form onSubmit={handleRequestToken} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '6px' }}>
                  Email da conta
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '7px', borderBottom: '1.5px solid #4a6b96' }}>
                  <Mail size={16} color="#1e293b" strokeWidth={1.75} />
                  <input 
                    type="email" 
                    placeholder="Digite seu email"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    autoFocus
                    required
                    style={{ width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '7px',
                  backgroundColor: '#215287',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: 'none',
                  boxShadow: '0 4px 10px rgba(33, 82, 135, 0.25)',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'ENVIANDO...' : 'RECEBER CÓDIGO'}
              </button>

              <button 
                type="button" 
                onClick={() => setMode('login')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#64748b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={14} />
                <span>Voltar para o login</span>
              </button>
            </form>
          )}

          {/* ========================================================== */}
          {/* 4. VALIDAR TOKEN E REDEFINIR SENHA                         */}
          {/* ========================================================== */}
          {mode === 'forgot_verify' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f0f7ff', border: '1px solid #bae6fd', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Mail size={15} color="#0284c7" />
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#0369a1' }}>
                    Código Enviado por E-mail
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: 1.45 }}>
                  Enviamos um código de 6 dígitos para o e-mail <strong>{maskedEmail || loginInput}</strong>. Digite-o abaixo junto com a sua nova senha (expira em 15 min).
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  Código de 6 dígitos
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px', borderBottom: '1.5px solid #4a6b96' }}>
                  <KeyRound size={16} color="#1e293b" strokeWidth={1.75} />
                  <input 
                    type="text" 
                    placeholder="Digite o código"
                    maxLength={6}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  Nova Senha
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px', borderBottom: '1.5px solid #4a6b96' }}>
                  <Lock size={16} color="#1e293b" strokeWidth={1.75} />
                  <input 
                    type="password" 
                    placeholder="Digite a nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
              </div>

              {resetSuccessMsg && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} />
                  <span>Senha alterada com sucesso!</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  height: '40px',
                  marginTop: '4px',
                  borderRadius: '7px',
                  backgroundColor: '#215287',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                SALVAR NOVA SENHA
              </button>
            </form>
          )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* RODAPÉ FIEL À IMAGEM DE REFERÊNCIA                             */}
      {/* ============================================================== */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', paddingBottom: '8px' }}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            fontSize: '11.5px',
            color: '#64748b',
            flexWrap: 'wrap'
          }}
        >
          <a href="#sobre" onClick={(e) => e.preventDefault()} style={{ color: '#64748b', textDecoration: 'none' }}>Sobre</a>
          <a href="#suporte" onClick={(e) => e.preventDefault()} style={{ color: '#64748b', textDecoration: 'none' }}>Suporte</a>
          <a href="#privacidade" onClick={(e) => e.preventDefault()} style={{ color: '#64748b', textDecoration: 'none' }}>Política de Privacidade</a>
          <span>© 2024 Ethos</span>
        </div>
      </div>

    </div>
  );
}
