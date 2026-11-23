import React, { useState, useRef, useEffect } from 'react';
import { todayLocal } from '../utils/healthDay';
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
  Users,
  AtSign,
  Copy,
  Droplets
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { VaulModalSheet } from './ui/MotionPrimitives';
import { calculateDailyWaterTarget } from '../utils/biometricsAndAnalytics';
import { ProfileAccountSections } from './profile/ProfileAccountSections';
import { MetaAgua } from './perfil/MetaAgua';

export function ProfileModal({ isOpen, onClose, user, onUpdateUser, onLogout, health = {}, setHealth, showToast }) {
  // Dados Pessoais & Identidade
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.photoUrl || '');
  const [weight, setWeight] = useState(user?.weight && Number(user.weight) > 0 ? String(user.weight) : '');
  const [copiedHandle, setCopiedHandle] = useState(false);
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', text: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEraseModal, setShowEraseModal] = useState(false);

  // Preferências de Páginas da Interface
  const defaultPagePreferences = {
    dashboard: true,   // FIXO
    telemetry: true,   // FIXO
    habits: true,
    bad_habits: true,
    calendar: true,
    workouts: true,
    focus: true,
    social: true
  };

  const [pagePreferences, setPagePreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(`ethos_pages_${user?.id || 'default'}`);
      if (saved) return { ...defaultPagePreferences, ...JSON.parse(saved) };
    } catch (e) { }
    return { ...defaultPagePreferences, ...(user?.pagePreferences || {}) };
  });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAvatarUrl(user.avatarUrl || user.photoUrl || '');
      setWeight(user.weight && Number(user.weight) > 0 ? String(user.weight) : '');
      if (user.pagePreferences) {
        setPagePreferences(prev => ({ ...prev, ...user.pagePreferences }));
      }
    }
  }, [user, isOpen]);

  const waterCalc = calculateDailyWaterTarget(weight, health?.glassMl || 250);
  const numericWeightKg = waterCalc.weightKg;
  const dailyWaterIdealMl = waterCalc.dailyMl;
  const dailyWaterIdealGlasses = waterCalc.targetGlasses;

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCopyHandle = () => {
    const handleText = username.startsWith('@') ? username : `@${username}`;
    navigator.clipboard?.writeText(handleText);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

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

  const handleSave = async (e) => {
    e?.preventDefault?.();
    const cleanUsername = username.replace(/^@/, '').trim();
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'EU';

    const updatedUser = {
      ...user,
      name: name.trim(),
      username: cleanUsername,
      email: email.trim(),
      avatar: initials,
      avatarUrl,
      weight: numericWeightKg,
      language,
      timezone,
      theme,
      emailNotifications,
      pagePreferences
    };

    onUpdateUser?.(updatedUser);

    if (numericWeightKg > 0 && setHealth) {
      setHealth((prev) => ({
        ...prev,
        waterTarget: dailyWaterIdealGlasses
      }));
    }

    try {
      localStorage.setItem(`ethos_pages_${user?.id || 'default'}`, JSON.stringify(pagePreferences));
      if (numericWeightKg > 0) {
        localStorage.setItem(`ethos_user_weight_${user?.id || 'default'}`, String(numericWeightKg));
      }
      localStorage.setItem('ethos_current_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('ethos_current_user', JSON.stringify(updatedUser));
    } catch (_err) {}

    try {
      if (user?.id) {
        await fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            username: cleanUsername,
            avatarUrl,
            weight: numericWeightKg,
            pagePreferences
          })
        });
        if (numericWeightKg > 0) {
          await fetch(`/api/user/${user.id}/health`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              waterGlasses: health?.waterGlasses ?? health?.water ?? 0,
              waterDate: todayLocal(),
              waterTarget: dailyWaterIdealGlasses,
              sleep: health?.sleep,
              glassMl: health?.glassMl ?? 250
            })
          });
        }
      }
    } catch (_err) {
      console.warn('Backend update failed, using local profile.');
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', text: 'Informe sua senha atual.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'As novas senhas não coincidem.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          currentPassword,
          newPassword
        })
      });

      if (!res.ok) {
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
          setConfirmPassword('');
        }, 1200);
      }
    } catch (_err) {
      setPasswordFeedback({ type: 'error', text: 'Falha ao atualizar a senha.' });
    }
  };

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

  const handleDeactivate = () => {
    if (window.confirm('Tem certeza que deseja encerrar sua sessão atual? Você poderá entrar novamente a qualquer momento com suas credenciais.')) {
      onLogout?.();
      onClose();
    }
  };

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
    <VaulModalSheet
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="580px"
      className="pm-sheet"
      style={{
        background: 'var(--rx-glass-strong)',
        border: '1px solid var(--rx-line-2)',
        boxShadow: 'var(--rx-shadow-pop)',
        color: 'var(--rx-ink)'
      }}
    >
      <div>
        {/* CABEÇALHO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--rx-line)' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--rx-ink)', margin: 0, letterSpacing: '-0.01em' }}>
              Configurações do Perfil
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--rx-ink-3)', margin: '3px 0 0' }}>
              Gerencie seus dados pessoais, saúde, hidratação e preferências
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                boxShadow: '0 0 18px rgba(99, 102, 241, 0.45)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {savedSuccess ? <Check size={14} /> : null}
              <span>{savedSuccess ? 'Salvo!' : 'Salvar Alterações'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '7px'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 1: INFORMAÇÕES PESSOAIS & @USERNAME NA REDE              */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>
            Informações Pessoais & Identidade
          </span>

          {/* Avatar & @Handle Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.07)', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  border: '2px solid rgba(129, 140, 248, 0.4)',
                  boxShadow: '0 0 16px rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#A5B4FC' }}>
                    {name ? name.slice(0, 2).toUpperCase() : 'EU'}
                  </span>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                  {name || 'Usuário Ethos'}
                </h4>
                {/* @Handle Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '8px', backgroundColor: 'rgba(129, 140, 248, 0.15)', border: '1px solid rgba(129, 140, 248, 0.3)', color: '#A5B4FC', fontSize: '11px', fontWeight: 600 }}>
                    <AtSign size={11} />
                    <span>{username.replace(/^@/, '') || 'usuario'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHandle}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title="Copiar meu @"
                  >
                    {copiedHandle ? <Check size={12} color="#34D399" /> : <Copy size={12} />}
                  </button>
                </div>
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
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '12px',
                padding: '7px 16px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#E2E8F0',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Camera size={13} />
              <span>Alterar Foto</span>
            </button>
          </div>

          {/* Form Inputs: Nome, @username e E-mail */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#CBD5E1', fontWeight: 600, marginBottom: '6px' }}>
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#CBD5E1', fontWeight: 600, marginBottom: '6px' }}>
                Nome de Usuário (@ na rede)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#818cf8', fontWeight: 700, fontSize: '13px' }}>@</span>
                <input
                  type="text"
                  value={username.replace(/^@/, '')}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="seu_arroba"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '12px',
                    padding: '10px 14px 10px 28px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#CBD5E1', fontWeight: 600, marginBottom: '6px' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Seção específica de Água (Capacidade dos copos + Meta diária + Sugestão 35 ml/kg) e Saúde (Peso e Altura) */}
          <div className="pf" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="settings-account-sections">
            <MetaAgua
              user={user}
              setUser={onUpdateUser}
              health={health}
              setHealth={setHealth}
              showToast={showToast}
            />
            <ProfileAccountSections
              user={user}
              setUser={onUpdateUser}
              health={health}
              setHealth={setHealth}
              showToast={showToast}
              onOpenSettings={onClose}
              onLogout={onLogout}
              waterSlot={false}
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 2: SEGURANÇA                                             */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
            Segurança & Acesso
          </span>

          <button
            type="button"
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '10px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#F1F5F9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} color="#818CF8" />
              <span>Alterar Senha</span>
            </div>
            {showPasswordChange ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showPasswordChange && (
            <form onSubmit={handleChangePassword} style={{ marginTop: '10px', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '3px' }}>Senha Atual</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '3px' }}>Nova Senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '3px' }}>Confirmar</label>
                  <input
                    type="password"
                    placeholder="Confirmar"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {passwordFeedback.text && (
                <div style={{ fontSize: '11px', color: passwordFeedback.type === 'error' ? '#F87171' : '#34D399', marginBottom: '8px', fontWeight: 600 }}>
                  {passwordFeedback.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  style={{ backgroundColor: '#6366F1', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '6px 14px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 3: PREFERÊNCIAS DO SISTEMA                               */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
            Preferências do Sistema
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: '#94A3B8', fontWeight: 500, marginBottom: '4px' }}>
                Idioma
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Portuguese" style={{ background: '#0F172A' }}>Português</option>
                <option value="English" style={{ background: '#0F172A' }}>English</option>
                <option value="Español" style={{ background: '#0F172A' }}>Español</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: '#94A3B8', fontWeight: 500, marginBottom: '4px' }}>
                Fuso Horário
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="UTC-3" style={{ background: '#0F172A' }}>UTC-3 (Brasília)</option>
                <option value="UTC-4" style={{ background: '#0F172A' }}>UTC-4 (Manaus)</option>
                <option value="UTC+0" style={{ background: '#0F172A' }}>UTC+0 (Londres)</option>
                <option value="UTC-5" style={{ background: '#0F172A' }}>UTC-5 (Nova York)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: '#94A3B8', fontWeight: 500, marginBottom: '4px' }}>
                Tema
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Escuro" style={{ background: '#0F172A' }}>Escuro (Padrão)</option>
                <option value="AMOLED" style={{ background: '#0F172A' }}>Preto Puro (AMOLED)</option>
                <option value="Cyberpunk" style={{ background: '#0F172A' }}>Cyberpunk Neon</option>
              </select>
            </div>
          </div>

          {/* Toggle Notificações por E-mail (Resend) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#F1F5F9', fontWeight: 500, display: 'block' }}>
                Notificações por E-mail
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                Disparos via Resend para lembretes de agenda e alertas
              </span>
            </div>

            <div
              onClick={() => setEmailNotifications(!emailNotifications)}
              style={{
                width: '38px',
                height: '22px',
                borderRadius: '999px',
                backgroundColor: emailNotifications ? '#6366F1' : 'rgba(255, 255, 255, 0.15)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  position: 'absolute',
                  top: '3px',
                  left: emailNotifications ? '19px' : '3px',
                  transition: 'left 0.2s ease'
                }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEÇÃO 4: PÁGINAS VISÍVEIS NA INTERFACE                         */}
        {/* ============================================================== */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setShowPagesConfig(!showPagesConfig)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '10px 14px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#F1F5F9',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={14} color="#818CF8" />
              <span>Personalizar Módulos do Menu Lateral</span>
            </div>
            {showPagesConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showPagesConfig && (
            <div style={{ marginTop: '8px', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                { id: 'dashboard', label: 'Painel Principal', icon: LayoutGrid, fixed: true },
                { id: 'telemetry', label: 'Análise de Progresso', icon: TrendingUp, fixed: true },
                { id: 'habits', label: 'Hábitos & Rotinas', icon: Check, fixed: false },
                { id: 'bad_habits', label: 'Maus Hábitos & Vícios', icon: ShieldOff, fixed: false },
                { id: 'calendar', label: 'Agenda Semanal', icon: Calendar, fixed: false },
                { id: 'workouts', label: 'Musculação & Treino', icon: Dumbbell, fixed: false },
                { id: 'focus', label: 'Foco Pomodoro', icon: Timer, fixed: false },
                { id: 'social', label: 'Comunidade & Conexões', icon: Users, fixed: false }
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
                      padding: '7px 10px',
                      borderRadius: '10px',
                      backgroundColor: isEnabled ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isEnabled ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: page.fixed ? 'default' : 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#E2E8F0' }}>
                      {page.label}
                    </span>
                    {page.fixed ? (
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#818CF8' }}>Fixo</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => { }}
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
        {/* SEÇÃO 5: DADOS, PRIVACIDADE & AÇÕES DA CONTA                   */}
        {/* ============================================================== */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#F1F5F9', display: 'block' }}>
                Portabilidade de Dados (LGPD)
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                Baixe uma cópia completa dos seus hábitos, agenda e telemetria
              </span>
            </div>

            <button
              type="button"
              onClick={handleExportData}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#E2E8F0',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={13} />
              <span>Exportar Dados</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDeactivate}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '9px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#94A3B8',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              Desativar Sessão
            </button>

            <button
              type="button"
              onClick={() => setShowEraseModal(true)}
              style={{
                background: confirmDelete
                  ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
                  : 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '12px',
                padding: '9px 0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FCA5A5',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {confirmDelete ? 'Confirmar Exclusão' : 'Excluir Conta Permanentemente'}
            </button>
          </div>
        </div>

      </div>

      <ConfirmDeleteModal
        isOpen={showEraseModal}
        onClose={() => setShowEraseModal(false)}
        isCategory={false}
        itemName={user?.email || user?.name || 'sua conta'}
        title="Excluir Conta Permanentemente"
        message="Atenção: Todos os seus registros, hábitos, agenda, telemetria e credenciais serão permanentemente apagados dos nossos servidores de forma irreversível (LGPD)."
        onConfirm={async () => {
          try {
            if (user?.id && user.role !== 'admin') {
              await fetch(`/api/user/${user.id}/privacy/erase`, { method: 'DELETE' });
            }
            setShowEraseModal(false);
            onLogout?.();
            onClose();
          } catch (_err) {
            alert('Falha ao excluir a conta.');
          }
        }}
      />
    </VaulModalSheet>,
    document.body
  );
}
