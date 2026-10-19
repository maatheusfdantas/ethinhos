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
  Send 
} from 'lucide-react';

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  allUsers,
  setAllUsers
}) {
  // Mode: 'login', 'register', 'forgot_request', 'forgot_verify'
  const [mode, setMode] = useState('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Recovery Token states (US36)
  const [tokenInput, setTokenInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // US35: Login
  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      setErrorMessage('Usuário não encontrado. Crie uma conta ou use o usuário padrão.');
      return;
    }

    if (found.password !== password) {
      setErrorMessage('Senha incorreta.');
      return;
    }

    onLoginSuccess(found);
    onClose();
  };

  // US35: Cadastro (Register)
  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Preencha todos os campos.');
      return;
    }

    const existing = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setErrorMessage('Já existe um usuário cadastrado com este e-mail.');
      return;
    }

    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      password,
      avatar: initials || 'EU',
      isPublic: true,
      bio: 'Novo usuário do Ethos OS',
      streakDays: 1,
      points: 100
    };

    setAllUsers(prev => [...prev, newUser]);
    onLoginSuccess(newUser);
    onClose();
  };

  // US36: Solicitar token de recuperação no e-mail
  const handleRequestToken = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail para receber o token.');
      return;
    }

    // Generate 6-digit mock security token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedToken(token);
    setMode('forgot_verify');
  };

  // US36: Validar token e redefinir senha
  const handleResetPassword = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (tokenInput.trim() !== generatedToken) {
      setErrorMessage('Token inválido. Verifique o código simulado enviado ao seu e-mail.');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 3) {
      setErrorMessage('A nova senha deve ter no mínimo 3 caracteres.');
      return;
    }

    // Update user password in storage
    setAllUsers(prev => prev.map(u => {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return { ...u, password: newPassword };
      }
      return u;
    }));

    setResetSuccessMsg(true);
    setTimeout(() => {
      setResetSuccessMsg(false);
      setMode('login');
      setPassword(newPassword);
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} color="var(--accent-cyan)" />
            <h2 className="modal-title">
              {mode === 'login' && 'Entrar no Ethos (US35)'}
              {mode === 'register' && 'Criar Nova Conta (US35)'}
              {mode === 'forgot_request' && 'Recuperar Senha (US36)'}
              {mode === 'forgot_verify' && 'Validar Token de Acesso (US36)'}
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

        {/* 1. LOGIN (US35) */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  className="input-dark" 
                  placeholder="matheus@ethos.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
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

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
              Entrar na Conta
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

        {/* 2. CADASTRO (US35) */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="Matheus Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  className="input-dark" 
                  placeholder="seuemail@exemplo.com"
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
                  placeholder="Crie uma senha segura"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
              Finalizar Cadastro
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

        {/* 3. RECUPERAÇÃO DE SENHA - SOLICITAR TOKEN (US36) */}
        {mode === 'forgot_request' && (
          <form onSubmit={handleRequestToken}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Informe o e-mail cadastrado. Um token de 6 dígitos será gerado e simulado em tempo real para redefinir sua credencial.
            </p>

            <div className="form-group">
              <label className="form-label">E-mail Cadastrado</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  className="input-dark" 
                  placeholder="matheus@ethos.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', gap: '8px' }}>
              <Send size={16} />
              Enviar Token de Recuperação (US36)
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

        {/* 4. RECUPERAÇÃO DE SENHA - VALIDAR TOKEN E REDEFINIR (US36) */}
        {mode === 'forgot_verify' && (
          <form onSubmit={handleResetPassword}>
            {/* SIMULADOR DE EMAIL RECEBIDO */}
            <div className="card-native" style={{ background: 'rgba(0, 229, 255, 0.1)', borderColor: 'var(--accent-cyan)', marginBottom: '16px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <Mail size={14} />
                Simulação de E-mail de Recuperação (Ethos Cloud)
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: '6px' }}>
                Destinatário: <strong>{email}</strong>
              </div>
              <div style={{ marginTop: '8px', fontSize: '1.2rem', fontFamily: 'monospace', letterSpacing: '4px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                TOKEN: {generatedToken}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Copie o token de 6 dígitos acima e insira no campo abaixo para redefinir.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Token de 6 Dígitos</label>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="ex: 847291"
                maxLength={6}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nova Senha</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  className="input-dark" 
                  placeholder="Nova senha segura"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
              </div>
            </div>

            {resetSuccessMsg && (
              <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                Senha redefinida com sucesso! Redirecionando...
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>
              Confirmar Nova Senha (US36)
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
