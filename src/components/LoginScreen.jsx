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
import { FIVE_SEEDED_USERS } from '../data/initialData';

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

  // Estados de Recuperação de Senha por Token
  const [tokenInput, setTokenInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);

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
        setErrorMessage(data.error || 'Erro ao efetuar login.');
        setLoading(false);
        return;
      }

      onLoginSuccess(data);
    } catch (err) {
      // Fallback local se backend offline
      const found = FIVE_SEEDED_USERS.find(
        u => (u.username.toLowerCase() === loginInput.trim().toLowerCase() || u.email.toLowerCase() === loginInput.trim().toLowerCase()) && u.password === password
      );
      if (found) {
        onLoginSuccess(found);
      } else {
        setErrorMessage('Usuário ou senha incorretos.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
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

      onLoginSuccess(data);
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
        setErrorMessage(data.error || 'Erro ao solicitar token.');
        setLoading(false);
        return;
      }

      setGeneratedToken(data.token);
      setMode('forgot_verify');
    } catch (err) {
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedToken(token);
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

  // Quick Seed Login
  const handleQuickLogin = (seededUser) => {
    setLoginInput(seededUser.username);
    setPassword(seededUser.password);
    setErrorMessage('');
    onLoginSuccess(seededUser);
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
                <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                  Email
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px', borderBottom: '1.5px solid #4a6b96' }}>
                  <Mail size={16} color="#1e293b" strokeWidth={1.75} />
                  <input 
                    type="email" 
                    placeholder="Digite seu email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '13.5px', color: '#1e293b', backgroundColor: 'transparent', border: 'none', outline: 'none' }}
                  />
                </div>
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
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#f0f7ff', border: '1px solid #bae6fd', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, color: '#0369a1', display: 'block' }}>
                  Token de Recuperação:
                </span>
                <strong style={{ fontSize: '16px', letterSpacing: '0.15em', color: '#0f172a' }}>{generatedToken}</strong>
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

        {/* Atalho discreto para contas de demonstração */}
        <div 
          style={{
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            opacity: 0.45,
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '0.45')}
        >
          <span style={{ fontSize: '10px', color: '#64748b' }}>Demo:</span>
          {FIVE_SEEDED_USERS.slice(0, 3).map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleQuickLogin(u)}
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '10px',
                backgroundColor: 'rgba(203, 213, 225, 0.6)',
                color: '#334155',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {u.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
