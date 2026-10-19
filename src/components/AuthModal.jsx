import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Send,
  ShieldAlert
} from 'lucide-react';

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess
}) {
  // Mode: 'login', 'register', 'forgot_request', 'forgot_verify'
  const [mode, setMode] = useState('login');

  // Form fields
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  // Password Recovery Token states (US36)
  const [tokenInput, setTokenInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // US35: Login via SQLite API
  const handleLogin = async (e) => {
    e.preventDefault();
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
      onClose();
    } catch (err) {
      // Fallback local caso backend esteja offline
      if (loginInput.trim() === 'admin' && password === 'Foguete não tem ré') {
        onLoginSuccess({
          id: 'usr_admin',
          username: 'admin',
          email: 'admin@ethos.dev',
          name: 'Administrador Ethos',
          avatar: 'AD',
          role: 'admin',
          is_active: true,
          subscription_tier: 'Enterprise / Fundador',
          is_public: true,
          permissions: { focus: true, workouts: true, telemetry: true, social: true, habits: true },
          streak_days: 0,
          points: 500
        });
        onClose();
      } else {
        setErrorMessage('Erro de conexão com o banco de dados SQLite.');
      }
    } finally {
      setLoading(false);
    }
  };

  // US35: Cadastro via SQLite API
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          username: username.trim() || email.split('@')[0],
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao cadastrar usuário.');
        setLoading(false);
        return;
      }

      onLoginSuccess(data);
      onClose();
    } catch (err) {
      setErrorMessage('Erro de conexão com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  // US36: Solicitar token de recuperação
  const handleRequestToken = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
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
      // Mock fallback
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedToken(token);
      setMode('forgot_verify');
    } finally {
      setLoading(false);
    }
  };

  // US36: Redefinir senha com token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
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
        setLoginInput(email);
      }, 1500);
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Preencher credenciais de admin
  const fillAdminCredentials = () => {
    setLoginInput('admin');
    setPassword('Foguete não tem ré');
    setErrorMessage('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} color="var(--accent-cyan)" />
            <h2 className="modal-title">
              {mode === 'login' && 'Autenticação no Ethos (US35)'}
              {mode === 'register' && 'Criar Conta no SQLite (US35)'}
              {mode === 'forgot_request' && 'Recuperar Senha (US36)'}
              {mode === 'forgot_verify' && 'Validar Token (US36)'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--accent-rose)', padding: '10px 14px', borderRadius: '12px', fontSize: '0.84rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Usuário ou E-mail</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="admin ou seu e-mail"
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
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => { setErrorMessage(''); setMode('forgot_request'); }}
                >
                  Esqueceu a senha? (US36)
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

            {/* BOTÃO ATALHO ADMIN */}
            <div 
              onClick={fillAdminCredentials}
              style={{
                background: 'rgba(0, 229, 255, 0.08)',
                border: '1px dashed var(--accent-cyan)',
                borderRadius: '12px',
                padding: '8px 12px',
                marginBottom: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              title="Clique para preencher login: admin e senha: Foguete não tem ré"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={15} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.76rem', color: 'var(--text-primary)' }}>
                  Acesso Admin: <strong>admin</strong> / <strong>Foguete não tem ré</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>Preencher</span>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Validando no SQLite...' : 'Entrar na Conta (US35)'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Não tem uma conta?{' '}
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => { setErrorMessage(''); setMode('register'); }}
              >
                Cadastre-se no banco
              </button>
            </div>
          </form>
        )}

        {/* 2. CADASTRO */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="Matheus Dantas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nome de Usuário (Username)</label>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="matheus"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  className="input-dark" 
                  placeholder="matheus@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  className="input-dark" 
                  placeholder="Crie sua senha segura"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Salvando no SQLite...' : 'Criar Conta no Banco'}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Já tem conta?{' '}
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: 700 }}
                onClick={() => { setErrorMessage(''); setMode('login'); }}
              >
                Faça login
              </button>
            </div>
          </form>
        )}

        {/* 3. RECUPERAR SENHA (US36) */}
        {mode === 'forgot_request' && (
          <form onSubmit={handleRequestToken}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Informe o e-mail cadastrado. Um token de 6 dígitos será gerado no banco de dados SQLite para autenticar a redefinição.
            </p>

            <div className="form-group">
              <label className="form-label">E-mail Cadastrado</label>
              <input 
                type="email" 
                className="input-dark" 
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Gerando Token...' : 'Gerar Token de Recuperação'}
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

        {/* 4. VALIDAR TOKEN E REDEFINIR */}
        {mode === 'forgot_verify' && (
          <form onSubmit={handleResetPassword}>
            <div className="card-native" style={{ background: 'rgba(0, 229, 255, 0.1)', borderColor: 'var(--accent-cyan)', marginBottom: '16px', padding: '14px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                Simulação de E-mail (Token SQLite)
              </span>
              <div style={{ fontSize: '1.3rem', fontFamily: 'monospace', letterSpacing: '4px', fontWeight: 800, color: 'var(--accent-cyan)', margin: '6px 0' }}>
                TOKEN: {generatedToken}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Copie o token de 6 dígitos e digite abaixo.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Token de 6 Dígitos</label>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="ex: 123456"
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
                placeholder="Nova senha segura"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            {resetSuccessMsg && (
              <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', marginBottom: '12px' }}>
                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 4 }} />
                Senha atualizada com sucesso! Redirecionando...
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              Salvar Nova Senha no SQLite
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
