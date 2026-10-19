import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  User, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  KeyRound, 
  Flame, 
  Zap, 
  RotateCcw,
  ShieldCheck,
  Send
} from 'lucide-react';
import { FIVE_SEEDED_USERS } from '../data/initialData';

export function LoginScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot_request', 'forgot_verify'
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Password Recovery Token states (US36)
  const [tokenInput, setTokenInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);

  // Handle Login via API
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(circle at 50% 20%, #111a2c 0%, #060910 80%)'
    }}>
      <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
        
        {/* BRAND HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="brand-logo-badge" style={{ width: 54, height: 54, margin: '0 auto 12px' }}>
            <Shield size={30} strokeWidth={2.4} />
          </div>
          <h1 className="brand-title" style={{ fontSize: '2rem', letterSpacing: '-0.02em', marginBottom: '4px' }}>ETHOS</h1>
          <span className="brand-subtitle" style={{ fontSize: '0.82rem' }}>Cloud Habit & Productivity OS</span>
        </div>

        {/* SECURE CARD CONTAINER */}
        <div className="card-native" style={{ padding: '28px', width: '100%', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          
          {/* SEGMENTED TOGGLE: ENTRAR / CRIAR CONTA */}
          <div className="segmented-control" style={{ marginBottom: '20px' }}>
            <button
              type="button"
              className={`segmented-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setErrorMessage(''); setMode('login'); }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`segmented-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setErrorMessage(''); setMode('register'); }}
            >
              Criar Conta
            </button>
          </div>

          {/* HEADER DO FORM */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {mode === 'login' && 'Acesse sua Conta'}
              {mode === 'register' && 'Cadastrar Nova Conta'}
              {mode === 'forgot_request' && 'Recuperação de Senha'}
              {mode === 'forgot_verify' && 'Validar Token de E-mail'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {mode === 'login' && 'Informe suas credenciais para acessar o painel.'}
              {mode === 'register' && 'Os dados serão persistidos de forma segura no SQLite.'}
              {mode === 'forgot_request' && 'Um token seguro de 6 dígitos será gerado no SQLite.'}
              {mode === 'forgot_verify' && 'Insira o token gerado para definir uma nova senha.'}
            </span>
          </div>

          {errorMessage && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: 'var(--accent-rose)', padding: '10px 12px', borderRadius: '12px', fontSize: '0.84rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">Usuário ou E-mail</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="input-dark" 
                    placeholder="ex: admin ou matheus.pro"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    style={{ paddingLeft: '38px' }}
                    required
                  />
                  <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Senha</label>
                  <button 
                    type="button" 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.76rem', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => { setErrorMessage(''); setMode('forgot_request'); }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password" 
                    className="input-dark" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '38px' }}
                    required
                  />
                  <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }} disabled={loading}>
                {loading ? 'Validando no SQLite...' : 'Entrar no Sistema'}
              </button>

              <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Não tem uma conta?{' '}
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => { setErrorMessage(''); setMode('register'); }}
                >
                  Cadastre-se gratuitamente
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="Seu Nome"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nome de Usuário</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="seu.usuario"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input 
                  type="email" 
                  className="input-dark" 
                  placeholder="email@exemplo.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Senha</label>
                <input 
                  type="password" 
                  className="input-dark" 
                  placeholder="Crie sua senha"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                {loading ? 'Cadastrando...' : 'Finalizar Cadastro no SQLite'}
              </button>

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                  onClick={() => setMode('login')}
                >
                  Já tem conta? Faça login
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD (US36) */}
          {mode === 'forgot_request' && (
            <form onSubmit={handleRequestToken}>
              <div className="form-group">
                <label className="form-label">E-mail Cadastrado</label>
                <input 
                  type="email" 
                  className="input-dark" 
                  placeholder="seuemail@exemplo.com"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                {loading ? 'Gerando...' : 'Gerar Token de Recuperação'}
              </button>

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
                  onClick={() => setMode('login')}
                >
                  Voltar ao Login
                </button>
              </div>
            </form>
          )}

          {/* 4. VERIFY TOKEN (US36) */}
          {mode === 'forgot_verify' && (
            <form onSubmit={handleResetPassword}>
              <div className="card-native" style={{ background: 'rgba(0, 229, 255, 0.1)', borderColor: 'var(--accent-cyan)', marginBottom: '14px', padding: '12px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  TOKEN DE RECUPERAÇÃO GERADO (SIMULAÇÃO):
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '4px', margin: '4px 0' }}>
                  {generatedToken}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Copie o código de 6 dígitos acima e cole no campo abaixo.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Token de 6 Dígitos</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="123456"
                  maxLength={6}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nova Senha</label>
                <input 
                  type="password" 
                  className="input-dark" 
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              {resetSuccessMsg && (
                <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 4 }} />
                  Senha alterada no SQLite com sucesso!
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                Confirmar Nova Senha
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
