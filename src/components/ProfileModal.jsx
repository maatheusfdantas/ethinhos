import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  User, 
  Globe, 
  Lock, 
  Flame, 
  Trophy, 
  Save, 
  ShieldCheck, 
  CheckCircle2,
  Scale,
  Download,
  LogOut,
  Trash2,
  Sliders,
  LayoutGrid,
  TrendingUp,
  ShieldOff,
  Calendar,
  Dumbbell,
  Timer,
  Users
} from 'lucide-react';

export function ProfileModal({ isOpen, onClose, user, onUpdateUser, onLogout }) {
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'pages' | 'security'
  const [name, setName] = useState(user?.name || 'Eu Matheus');
  const [bio, setBio] = useState(user?.bio || 'Engenharia de Software & Produtividade Extrema');
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? true);
  const [weight, setWeight] = useState(user?.weight !== undefined ? user.weight : 70.0);
  const [height, setHeight] = useState(user?.height !== undefined ? user.height : 1.75);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState('');

  // Preferências de visibilidade das páginas da interface
  // REQUISITO: Usuários decidem quais abas querem, mas abas principais e estatísticas são fixas
  const defaultPagePreferences = {
    dashboard: true,   // FIXO / OBRIGATÓRIO
    telemetry: true,   // FIXO / ESTATÍSTICAS OBRIGATÓRIO
    habits: true,      // Customizável
    bad_habits: true,  // Customizável (Nova aba de vícios/maus hábitos)
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

  if (!isOpen || typeof document === 'undefined') return null;

  const numWeight = parseFloat(weight);
  const numHeight = parseFloat(height);
  const isValidBmi = numWeight > 0 && numHeight > 0;
  const bmiValue = isValidBmi ? (numWeight / (numHeight * numHeight)) : 0;
  const formattedBmi = bmiValue > 0 ? bmiValue.toFixed(1) : '--';

  let bmiClass = {
    label: 'Calculando...',
    color: 'var(--text-secondary)',
    bg: 'rgba(255,255,255,0.06)',
    desc: 'Informe o peso e a altura.'
  };

  if (bmiValue > 0) {
    if (bmiValue < 18.5) {
      bmiClass = {
        label: 'Abaixo do peso',
        color: 'var(--accent-amber)',
        bg: 'rgba(251, 191, 36, 0.15)',
        desc: 'Abaixo da faixa recomendada para sua estatura.'
      };
    } else if (bmiValue < 25.0) {
      bmiClass = {
        label: 'Peso Normal / Saudável',
        color: 'var(--accent-emerald)',
        bg: 'rgba(52, 211, 153, 0.15)',
        desc: 'Excelente! Seu índice está no intervalo ideal de saúde.'
      };
    } else if (bmiValue < 30.0) {
      bmiClass = {
        label: 'Sobrepeso',
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.15)',
        desc: 'Levemente acima da faixa ideal recomendada.'
      };
    } else if (bmiValue < 35.0) {
      bmiClass = {
        label: 'Obesidade Grau I',
        color: 'var(--accent-rose)',
        bg: 'rgba(244, 63, 94, 0.15)',
        desc: 'Atenção aos hábitos nutricionais e atividade física.'
      };
    } else if (bmiValue < 40.0) {
      bmiClass = {
        label: 'Obesidade Grau II',
        color: 'var(--accent-rose)',
        bg: 'rgba(244, 63, 94, 0.2)',
        desc: 'Recomenda-se acompanhamento e reeducação da rotina.'
      };
    } else {
      bmiClass = {
        label: 'Obesidade Grau III',
        color: 'var(--accent-rose)',
        bg: 'rgba(244, 63, 94, 0.25)',
        desc: 'Grau elevado. Atenção primordial à saúde integral.'
      };
    }
  }

  const minIdeal = isValidBmi ? (18.5 * numHeight * numHeight).toFixed(1) : null;
  const maxIdeal = isValidBmi ? (24.9 * numHeight * numHeight).toFixed(1) : null;

  const handleSave = async (e) => {
    e.preventDefault();
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');

    const updated = {
      ...user,
      name: name.trim(),
      bio: bio.trim(),
      isPublic,
      weight: numWeight || 70.0,
      height: numHeight || 1.75,
      avatar: initials || user.avatar,
      pagePreferences
    };

    try {
      localStorage.setItem(`ethos_pages_${user?.id || 'default'}`, JSON.stringify(pagePreferences));
    } catch (e) {}

    onUpdateUser(updated);

    if (user?.id) {
      try {
        await fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            bio: bio.trim(),
            is_public: isPublic,
            weight: numWeight || 70.0,
            height: numHeight || 1.75,
            pagePreferences
          })
        });
      } catch (err) {
        console.warn('Erro ao salvar no backend:', err);
      }
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  // LGPD Art. 18, V: Portabilidade / Exportação de Dados Pessoais
  const handleExportLgpdData = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user/${user.id}/privacy/export`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethos_dados_pessoais_${user.username || user.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSecurityFeedback('Exportação LGPD concluída com sucesso (JSON baixado).');
    } catch (_err) {
      setSecurityFeedback('Erro ao exportar dados.');
    }
  };

  // Revogar Sessões em Todos os Dispositivos
  const handleRevokeAllSessions = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      setSecurityFeedback(data.message || 'Sessões revogadas em todos os dispositivos.');
    } catch (_err) {
      setSecurityFeedback('Falha ao revogar sessões.');
    }
  };

  // LGPD Art. 18, VI: Exclusão Segura da Conta
  const handleEraseAccount = async () => {
    if (!user?.id || user.role === 'admin') return;
    try {
      const res = await fetch(`/api/user/${user.id}/privacy/erase`, { method: 'DELETE' });
      if (res.ok) {
        onLogout?.();
        onClose();
      }
    } catch (_err) {
      setSecurityFeedback('Não foi possível excluir a conta.');
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-sheet" style={{ maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--accent-cyan)" />
            <h2 className="modal-title">Configurações & Painel Pessoal</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* PROFILE HEADER SUMMARY */}
        <div className="card-native" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div className="profile-avatar" style={{ width: 52, height: 52, fontSize: '1.2rem' }}>
            {user?.avatar || 'EM'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>{user?.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user?.email}</span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <span className="section-badge" style={{ color: 'var(--accent-cyan)' }}>
                <Flame size={12} style={{ display: 'inline', marginRight: 3 }} />
                {user?.streakDays || 7} dias de ofensiva
              </span>
              <span className="section-badge">
                <Trophy size={12} style={{ display: 'inline', marginRight: 3 }} />
                {user?.points || 1420} pts
              </span>
            </div>
          </div>
        </div>

        {/* ABAS INTERNAS DE NAVEGAÇÃO DO MODAL */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '18px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            style={{
              padding: '7px 8px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeSection === 'profile' ? 'var(--accent-cyan)' : 'transparent',
              color: activeSection === 'profile' ? '#0F172A' : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <User size={13} />
            <span>Perfil & Biometria</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('pages')}
            style={{
              padding: '7px 8px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeSection === 'pages' ? 'var(--accent-cyan)' : 'transparent',
              color: activeSection === 'pages' ? '#0F172A' : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={13} />
            <span>Páginas da Interface</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('security')}
            style={{
              padding: '7px 8px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeSection === 'security' ? 'var(--accent-cyan)' : 'transparent',
              color: activeSection === 'security' ? '#0F172A' : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldCheck size={13} />
            <span>Segurança & LGPD</span>
          </button>
        </div>

        <form onSubmit={handleSave}>
          
          {/* ========================================================================= */}
          {/* SEÇÃO 1: PERFIL & BIOMETRIA                                               */}
          {/* ========================================================================= */}
          {activeSection === 'profile' && (
            <div>
              <div className="form-group">
                <label className="form-label">Nome de Exibição</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Biografia / Ocupação</label>
                <textarea 
                  className="input-dark" 
                  rows={2}
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              {/* BIOMETRIA: PESO, ALTURA E CÁLCULO DE IMC */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scale size={14} color="var(--accent-cyan)" />
                  Biometria Corporal & Cálculo do IMC
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Peso (kg)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      min="20"
                      max="300"
                      className="input-dark"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="ex: 75.0"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Altura (metros)
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0.50"
                      max="2.50"
                      className="input-dark"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="ex: 1.75"
                      required
                    />
                  </div>
                </div>

                <div className="card-native" style={{ 
                  background: 'rgba(15, 23, 42, 0.7)', 
                  border: `1px solid ${bmiClass.color}40`,
                  borderRadius: '12px',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Índice de Massa Corporal (IMC)
                    </span>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      color: bmiClass.color, 
                      background: bmiClass.bg, 
                      padding: '2px 8px', 
                      borderRadius: '6px' 
                    }}>
                      {bmiClass.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      {formattedBmi}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>kg/m²</span>
                  </div>

                  <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    {bmiClass.desc}
                  </p>

                  {minIdeal && maxIdeal && (
                    <div style={{ 
                      fontSize: '0.72rem', 
                      color: 'var(--accent-cyan)', 
                      paddingTop: '8px', 
                      borderTop: '1px solid rgba(255,255,255,0.06)' 
                    }}>
                      Faixa de peso saudável para {numHeight}m: <strong>{minIdeal} kg a {maxIdeal} kg</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SEÇÃO 2: PÁGINAS DA INTERFACE (CUSTOMIZAÇÃO EXIGIDA PELO USUÁRIO)        */}
          {/* ========================================================================= */}
          {activeSection === 'pages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div 
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(0, 229, 255, 0.08)',
                  border: '1px solid rgba(0, 229, 255, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Sliders size={16} color="var(--accent-cyan)" />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Personalizar Módulos da Interface</strong>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Ative ou oculte as páginas que deseja no seu menu. O <strong>Painel Principal</strong> e as abas de <strong>Estatísticas</strong> permanecem sempre ativas para garantir a integridade dos seus relatórios.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* 1. Painel Principal - OBRIGATÓRIO */}
                <div className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <LayoutGrid size={18} color="var(--accent-cyan)" />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>Painel Principal (Dashboard)</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Visão geral dos hábitos, tarefas e cronograma diário</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: 'rgba(0, 229, 255, 0.15)', color: 'var(--accent-cyan)' }}>
                    OBRIGATÓRIO
                  </span>
                </div>

                {/* 2. Análise de Progresso & Estatísticas - OBRIGATÓRIO */}
                <div className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendingUp size={18} color="var(--accent-cyan)" />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>Análise de Progresso & Estatísticas</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Telemetria, consistência, heatmaps e métricas analíticas</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', backgroundColor: 'rgba(0, 229, 255, 0.15)', color: 'var(--accent-cyan)' }}>
                    FIXO / ESTATÍSTICAS
                  </span>
                </div>

                {/* 3. Hábitos & Rotinas */}
                <div className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={18} color="#38BDF8" />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>Hábitos & Rotinas</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Aba dedicada exclusivamente à gestão e conclusão de hábitos</span>
                    </div>
                  </div>
                  <div 
                    className={`switch-track ${pagePreferences.habits ? 'on' : ''}`}
                    onClick={() => setPagePreferences(prev => ({ ...prev, habits: !prev.habits }))}
                    title="Alternar visibilidade da aba Hábitos"
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {/* 4. Maus Hábitos & Vícios (Superação) */}
                <div className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldOff size={18} color="#F43F5E" />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>Maus Hábitos & Vícios (Superação)</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Acompanhamento de sobriedade (cigarro, álcool, automutilação)</span>
                    </div>
                  </div>
                  <div 
                    className={`switch-track ${pagePreferences.bad_habits ? 'on' : ''}`}
                    onClick={() => setPagePreferences(prev => ({ ...prev, bad_habits: !prev.bad_habits }))}
                    title="Alternar visibilidade da aba Maus Hábitos"
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {/* 5. Agenda Semanal & Calendário */}
                <div className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={18} color="#FDE68A" />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>Agenda Semanal & Calendário</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Calendário visual com eventos e compromissos sincronizados</span>
                    </div>
                  </div>
                  <div 
                    className={`switch-track ${pagePreferences.calendar ? 'on' : ''}`}
                    onClick={() => setPagePreferences(prev => ({ ...prev, calendar: !prev.calendar }))}
                    title="Alternar visibilidade da aba Agenda"
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {/* 6. Musculação & Treino */}
                <div className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Dumbbell size={18} color="#FB923C" />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>Musculação & Treino</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fichas de exercícios, séries, repetições e carga</span>
                    </div>
                  </div>
                  <div 
                    className={`switch-track ${pagePreferences.workouts ? 'on' : ''}`}
                    onClick={() => setPagePreferences(prev => ({ ...prev, workouts: !prev.workouts }))}
                    title="Alternar visibilidade da aba Musculação"
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {/* 7. Foco Pomodoro */}
                <div className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Timer size={18} color="#A78BFA" />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>Foco Pomodoro</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cronômetro produtivo com sub-classes e foco colaborativo</span>
                    </div>
                  </div>
                  <div 
                    className={`switch-track ${pagePreferences.focus ? 'on' : ''}`}
                    onClick={() => setPagePreferences(prev => ({ ...prev, focus: !prev.focus }))}
                    title="Alternar visibilidade da aba Foco Pomodoro"
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {/* 8. Comunidade Social */}
                <div className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={18} color="#34D399" />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block' }}>Comunidade</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Feed de amigos, desafios em grupo e ranking de ofensivas</span>
                    </div>
                  </div>
                  <div 
                    className={`switch-track ${pagePreferences.social ? 'on' : ''}`}
                    onClick={() => setPagePreferences(prev => ({ ...prev, social: !prev.social }))}
                    title="Alternar visibilidade da aba Comunidade"
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SEÇÃO 3: SEGURANÇA & PRIVACIDADE LGPD                                     */}
          {/* ========================================================================= */}
          {activeSection === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="card-native" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={16} color="var(--accent-cyan)" />
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, display: 'block' }}>
                        Perfil Público / Visibilidade
                      </span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {isPublic 
                          ? 'Amigos aprovados podem ver suas conclusões no feed.'
                          : 'Nenhuma atividade é compartilhada publicamente.'}
                      </p>
                    </div>
                  </div>

                  <div 
                    className={`switch-track ${isPublic ? 'on' : ''}`}
                    onClick={() => setIsPublic(!isPublic)}
                    title="Alternar entre Público e Privado"
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    type="button"
                    onClick={handleExportLgpdData}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Download size={13} />
                    Exportar Dados (LGPD)
                  </button>

                  <button
                    type="button"
                    onClick={handleRevokeAllSessions}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <LogOut size={13} />
                    Revogar Todas Sessões
                  </button>
                </div>

                {user?.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={handleEraseAccount}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '7px 10px', borderColor: 'rgba(244,63,94,0.4)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Trash2 size={13} />
                    Excluir Conta e Dados Pessoais (Direito ao Esquecimento)
                  </button>
                )}

                {securityFeedback && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    {securityFeedback}
                  </div>
                )}
              </div>
            </div>
          )}

          {savedSuccess && (
            <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', margin: '14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              Configurações e preferências salvas com sucesso!
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ flex: 1, borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}
              onClick={() => {
                onLogout?.();
                onClose();
              }}
            >
              Sair da Conta
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ flex: 1.5, gap: '8px' }}
            >
              <Save size={16} />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
