import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  AlertTriangle, 
  Download, 
  LogOut, 
  Trash2, 
  Camera, 
  ShieldCheck, 
  Sliders,
  Lock,
  LayoutGrid,
  TrendingUp,
  ShieldOff,
  Calendar,
  Dumbbell,
  Timer,
  Users
} from 'lucide-react';

export function ProfileModal({ isOpen, onClose, user, onUpdateUser, onLogout }) {
  // Dados Pessoais
  const [name, setName] = useState(user?.name || 'Matheus D.');
  const [email, setEmail] = useState(user?.email || 'matheus.d@email.com');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.photoUrl || '');
  const fileInputRef = useRef(null);

  // Preferências
  const [language, setLanguage] = useState(user?.language || 'Portuguese');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC-3');
  const [theme, setTheme] = useState(user?.theme || 'Escuro');
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotifications !== false);

  // Estados de Interface e Feedback
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPagesConfig, setShowPagesConfig] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', text: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Preferências de Páginas da Interface
  const defaultPagePreferences = {
    dashboard: true,   // FIXO / OBRIGATÓRIO
    telemetry: true,   // FIXO / ESTATÍSTICAS OBRIGATÓRIO
    habits: true,      // Customizável
    bad_habits: true,  // Customizável (Maus hábitos / sobriedade)
    calendar: true,    // Customizável
    workouts: true,    // Customizável
    focus: true,       // Customizável
    social: true       // Customizável
  };

  const [pagePreferences, setPagePreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(`ethos_pages_${user?.id || 'default'}`);
      if (saved) return { ...defaultPagePreferences, ...JSON.parse(saved) };
    } catch (e) {}
    return { ...defaultPagePreferences, ...(user?.pagePreferences || {}) };
  });

  useEffect(() => {
    if (user) {
      setName(user.name || 'Matheus D.');
      setEmail(user.email || 'matheus.d@email.com');
      setAvatarUrl(user.avatarUrl || user.photoUrl || '');
      if (user.pagePreferences) {
        setPagePreferences(prev => ({ ...prev, ...user.pagePreferences }));
      }
    }
  }, [user, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Upload de Imagem de Avatar Local
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Salvar Alterações de Perfil
  const handleSave = async (e) => {
    e?.preventDefault?.();
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');

    const updated = {
      ...user,
      name: name.trim(),
      email: email.trim(),
      avatar: initials || user?.avatar || 'MD',
      avatarUrl,
      language,
      timezone,
      theme,
      emailNotifications,
      pagePreferences
    };

    try {
      localStorage.setItem(`ethos_pages_${user?.id || 'default'}`, JSON.stringify(pagePreferences));
    } catch (e) {}

    onUpdateUser?.(updated);

    if (user?.id) {
      try {
        await fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            avatarUrl,
            language,
            timezone,
            theme,
            emailNotifications,
            pagePreferences
          })
        });
      } catch (err) {
        console.warn('Erro ao sincronizar perfil com backend:', err);
      }
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  // Alteração de Senha
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          token: 'DIRECT_USER_UPDATE',
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        // Fallback: se o endpoint exigir token, enviamos o código por e-mail automaticamente
        await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() })
        });
        setPasswordFeedback({ type: 'success', text: 'Código de confirmação enviado para seu e-mail!' });
      } else {
        setPasswordFeedback({ type: 'success', text: 'Senha atualizada com sucesso!' });
        setTimeout(() => {
          setShowPasswordChange(false);
          setPasswordFeedback({ type: '', text: '' });
          setCurrentPassword('');
          setNewPassword('');
        }, 1200);
      }
    } catch (_err) {
      setPasswordFeedback({ type: 'error', text: 'Falha ao atualizar a senha.' });
    }
  };

  // Exportar Dados (LGPD)
  const handleExportData = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user/${user.id}/privacy/export`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethos_dados_${user.username || 'usuario'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      alert('Erro ao exportar dados.');
    }
  };

  // Desativar Conta
  const handleDeactivate = () => {
    if (window.confirm('Tem certeza que deseja desativar sua sessão atual? Você poderá entrar novamente a qualquer momento.')) {
      onLogout?.();
      onClose();
    }
  };

  // Excluir Conta Permanentemente (LGPD)
  const handleEraseAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      if (user?.id && user.role !== 'admin') {
        await fetch(`/api/user/${user.id}/privacy/erase`, { method: 'DELETE' });
      }
      onLogout?.();
      onClose();
    } catch (_err) {
      alert('Falha ao excluir a conta.');
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      {/* CARD LIQUID FROSTED GLASS FIEL À IMAGEM DE REFERÊNCIA */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(225, 235, 250, 0.45) 100%)',
          backdropFilter: 'blur(32px) saturate(190%)',
          WebkitBackdropFilter: 'blur(32px) saturate(190%)',
          border: '1.5px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16), inset 0 1px 2px rgba(255, 255, 255, 0.95), inset 0 -1px 2px rgba(255, 255, 255, 0.3)',
          borderRadius: '26px',
          padding: '24px 28px',
          boxSizing: 'border-box',
          color: '#1E293B',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}
      >
        {/* CABEÇALHO: TÍTULO + BADGES + BOTÃO SALVAR ALTERAÇÕES */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', margin: 0, letterSpacing: '-0.01em' }}>
              Configurações do Perfil
            </h2>
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#B45309',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: '10px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              3
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.55)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '7px 20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {savedSuccess ? <Check size={14} /> : null}
              <span>{savedSuccess ? 'Salvo!' : 'Salvar Alterações'}</span>
            </button>

            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#B45309',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: '10px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              7
            </span>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                marginLeft: '2px'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 1: INFORMAÇÕES PESSOAIS                                  */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '10px' }}>
            Informações Pessoais
          </span>

          {/* Avatar Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#CBD5E1',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={30} color="#64748B" />
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
                  {name || 'Matheus D.'}
                </h4>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                borderRadius: '999px',
                padding: '5px 16px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.55)')}
            >
              Alterar Foto
            </button>
          </div>

          {/* Form Inputs: Nome Completo e E-mail */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: '#475569', fontWeight: 500, marginBottom: '4px' }}>
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: '#475569', fontWeight: 500, marginBottom: '4px' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 2: SEGURANÇA                                             */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
            Segurança
          </span>

          <button
            type="button"
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.7) 20%, rgba(244, 63, 94, 0.22) 50%, rgba(255, 255, 255, 0.7) 80%, rgba(255, 255, 255, 0.45) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
              borderRadius: '999px',
              padding: '10px 0',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Alterar Senha</span>
            {showPasswordChange ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Gaveta de Alteração de Senha */}
          {showPasswordChange && (
            <form onSubmit={handleChangePassword} style={{ marginTop: '10px', backgroundColor: 'rgba(255, 255, 255, 0.5)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.8)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#475569', display: 'block', marginBottom: '2px' }}>Senha Atual</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.8)', fontSize: '11.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#475569', display: 'block', marginBottom: '2px' }}>Nova Senha (min 6)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.8)', fontSize: '11.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {passwordFeedback.text && (
                <div style={{ fontSize: '11px', color: passwordFeedback.type === 'error' ? '#EF4444' : '#10B981', marginBottom: '6px', fontWeight: 600 }}>
                  {passwordFeedback.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  style={{ backgroundColor: '#211F38', color: '#FFFFFF', border: 'none', borderRadius: '999px', padding: '5px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 3: PREFERÊNCIAS                                          */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
            Preferências
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#475569', fontWeight: 500, marginBottom: '3px' }}>
                Idioma
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  padding: '6px 8px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Portuguese">Portuguese</option>
                <option value="English">English</option>
                <option value="Español">Español</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#475569', fontWeight: 500, marginBottom: '3px' }}>
                Fuso Horário
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  padding: '6px 8px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="UTC-3">UTC-3</option>
                <option value="UTC-4">UTC-4</option>
                <option value="UTC+0">UTC+0</option>
                <option value="UTC-5">UTC-5</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#475569', fontWeight: 500, marginBottom: '3px' }}>
                Tema
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  padding: '6px 8px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Escuro">Escuro</option>
                <option value="Claro">Claro</option>
                <option value="Automático">Automático</option>
              </select>
            </div>
          </div>

          {/* Toggle Notificações por E-mail */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ fontSize: '11.5px', color: '#334155', fontWeight: 500 }}>
              Notificações por E-mail
            </span>

            {/* iOS-Style Toggle Switch */}
            <div
              onClick={() => setEmailNotifications(!emailNotifications)}
              style={{
                width: '36px',
                height: '20px',
                borderRadius: '999px',
                backgroundColor: emailNotifications ? '#6366F1' : 'rgba(203, 213, 225, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                  position: 'absolute',
                  top: '1px',
                  left: emailNotifications ? '17px' : '2px',
                  transition: 'left 0.2s ease'
                }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 4: PÁGINAS ATIVAS NA INTERFACE (REQ. CUSTOMIZAÇÃO)       */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setShowPagesConfig(!showPagesConfig)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              borderRadius: '12px',
              padding: '7px 12px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={13} color="#6366F1" />
              <span>Personalizar Páginas da Interface (Hábitos, Vícios, Agenda...)</span>
            </div>
            {showPagesConfig ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showPagesConfig && (
            <div style={{ marginTop: '8px', backgroundColor: 'rgba(255, 255, 255, 0.5)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.8)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                { id: 'dashboard', label: 'Painel Principal', icon: LayoutGrid, fixed: true },
                { id: 'telemetry', label: 'Análise de Progresso', icon: TrendingUp, fixed: true },
                { id: 'habits', label: 'Hábitos & Rotinas', icon: Check, fixed: false },
                { id: 'bad_habits', label: 'Maus Hábitos & Vícios', icon: ShieldOff, fixed: false },
                { id: 'calendar', label: 'Agenda Semanal', icon: Calendar, fixed: false },
                { id: 'workouts', label: 'Musculação & Treino', icon: Dumbbell, fixed: false },
                { id: 'focus', label: 'Foco Pomodoro', icon: Timer, fixed: false },
                { id: 'social', label: 'Comunidade', icon: Users, fixed: false }
              ].map(page => {
                const isEnabled = page.fixed || pagePreferences[page.id] !== false;
                return (
                  <div
                    key={page.id}
                    onClick={() => {
                      if (!page.fixed) {
                        setPagePreferences(prev => ({ ...prev, [page.id]: !isEnabled }));
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: '8px',
                      backgroundColor: isEnabled ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.4)',
                      border: isEnabled ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(0,0,0,0.05)',
                      cursor: page.fixed ? 'default' : 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#1E293B' }}>
                      {page.label}
                    </span>
                    {page.fixed ? (
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#6366F1' }}>Fixo</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: '#6366F1' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 5: DADOS E ARMAZENAMENTO                                 */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
            Dados e Armazenamento
          </span>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>
                  Uso de Armazenamento
                </span>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                  65%
                </span>
              </div>

              {/* Barra de Progresso Degradê */}
              <div
                style={{
                  width: '100%',
                  height: '5px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(203, 213, 225, 0.5)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: '65%',
                    height: '100%',
                    borderRadius: '999px',
                    background: 'linear-gradient(90deg, #6366F1 0%, #38BDF8 100%)'
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportData}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                borderRadius: '999px',
                padding: '5px 14px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.55)')}
            >
              Exportar Dados
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 6: AÇÕES DA CONTA                                        */}
        {/* ============================================================== */}
        <div>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
            Ações da Conta
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDeactivate}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '999px',
                padding: '8px 0',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.75)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)')}
            >
              Desativar Conta
            </button>

            <button
              type="button"
              onClick={handleEraseAccount}
              style={{
                background: confirmDelete 
                  ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.55) 0%, rgba(220, 38, 38, 0.65) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.75)',
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.45)',
                borderRadius: '999px',
                padding: '8px 0',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 0 22px rgba(239, 68, 68, 0.65)')}
              onMouseOut={(e) => (e.currentTarget.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.45)')}
            >
              {confirmDelete ? 'Confirmar Exclusão' : 'Excluir Conta Permanentemente'}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
