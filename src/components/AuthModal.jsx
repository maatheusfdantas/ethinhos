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
  onLoginSuccess,
  onLogout
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
  const [maskedEmail, setMaskedEmail] = useState('');
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

      if (data.requireVerification) {
        setMaskedEmail(data.maskedEmail || email.trim());
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
      onClose();
    } catch (err) {
      setErrorMessage('Erro de conexão com o banco de dados SQLite.');
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

  const handleVerifyRegisterToken = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const targetEmail = (email || loginInput).trim();
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
      onClose();
    } catch (err) {
      setErrorMessage('Erro de conexão com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegisterCode = async () => {
    const targetEmail = (email || loginInput).trim();
    if (!targetEmail) {
      setErrorMessage('Informe seu e-mail ou usuário para receber o código.');
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
        alert(data.message || 'Novo código enviado com sucesso!');
      } else {
        setErrorMessage(data.error || 'Erro ao reenviar código.');
      }
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
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

      setMaskedEmail(data.maskedEmail || email.trim());
      setMode('forgot_verify');
    } catch (err) {
      // Mock fallback
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      setMaskedEmail(email.trim());
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} color="var(--accent-cyan)" />
            <h2 className="modal-title">
              {mode === 'login' && 'Autenticação no Ethos'}
              {mode === 'register' && 'Criar Conta no Ethos'}
              {mode === 'register_verify' && 'Confirmar E-mail'}
              {mode === 'forgot_request' && 'Recuperar Senha'}
              {mode === 'forgot_verify' && 'Validar Token'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {currentUser && (
          <div className="card-native" style={{ background: 'rgba(15, 23, 42, 0.7)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Conectado atualmente como:</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>{currentUser.email || currentUser.username}</div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
              onClick={() => {
                onLogout?.();
                onClose();
              }}
            >
              Sair da Conta
            </button>
          </div>
        )}

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
              {loading ? 'Validando no SQLite...' : 'Entrar na Conta'}
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

        {/* 2.1. CONFIRMAR E-MAIL (NOVA CONTA / TOKEN 48H) */}
        {mode === 'register_verify' && (
          <form onSubmit={handleVerifyRegisterToken}>
            <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              Informe seu e-mail (ou usuário) e o código de 6 dígitos recebido por e-mail ou gerado pelo Administrador (válido por 48h).
            </div>

            <div className="form-group">
              <label className="form-label">E-mail ou Usuário da Conta</label>
              <input
                type="text"
                className="input-dark"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Código / Token de 6 dígitos</label>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="000 • 000"
                maxLength={12}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                required
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px', fontWeight: 'bold' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'VALIDANDO...' : 'CONFIRMAR E ENTRAR'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.82rem' }}>
              <button type="button" onClick={handleResendRegisterCode} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline' }}>
                Reenviar código
              </button>
              <button type="button" onClick={() => { setErrorMessage(''); setMode('login'); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Voltar ao login
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
                Código de Verificação Enviado por E-mail
              </span>
              <div style={{ fontSize: '1.3rem', fontFamily: 'monospace', letterSpacing: '4px', fontWeight: 800, color: 'var(--accent-cyan)', margin: '6px 0' }}>
                Enviamos um código de 6 dígitos para o e-mail: {maskedEmail || email}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Consulte sua caixa de entrada e pasta de spam para inserir o código abaixo.
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
