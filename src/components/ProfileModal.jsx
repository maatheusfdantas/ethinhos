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
  Trash2
} from 'lucide-react';

export function ProfileModal({ isOpen, onClose, user, onUpdateUser, onLogout }) {
  const [name, setName] = useState(user?.name || 'Eu Matheus');
  const [bio, setBio] = useState(user?.bio || 'Engenharia de Software & Produtividade Extrema');
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? true);
  const [weight, setWeight] = useState(user?.weight !== undefined ? user.weight : 70.0);
  const [height, setHeight] = useState(user?.height !== undefined ? user.height : 1.75);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState('');

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
      avatar: initials || user.avatar
    };

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
            height: numHeight || 1.75
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
      <div className="modal-sheet" style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--accent-cyan)" />
            <h2 className="modal-title">Perfil, Biometria & Segurança LGPD</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* PROFILE HEADER SUMMARY */}
        <div className="card-native" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div className="profile-avatar" style={{ width: 54, height: 54, fontSize: '1.2rem' }}>
            {user?.avatar || 'EM'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>{user?.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user?.email}</span>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
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

        <form onSubmit={handleSave}>
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
                  borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${bmiClass.color}50`
                }}>
                  {bmiClass.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: bmiClass.color }}>
                  {formattedBmi}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  kg/m² (peso ÷ altura²)
                </span>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                {bmiClass.desc}
              </p>

              {minIdeal && maxIdeal && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                  Faixa de peso saudável para sua altura ({numHeight}m): <strong style={{ color: 'var(--text-primary)' }}>{minIdeal} kg a {maxIdeal} kg</strong>
                </div>
              )}
            </div>
          </div>

          {/* CONTROLE DE PRIVACIDADE E DIREITOS LGPD / SEGURANÇA */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="var(--accent-emerald)" />
              Privacidade, Sessões & Conformidade LGPD/GDPR
            </label>
            <div className="card-native" style={{ padding: '14px', background: 'var(--surface-elevated)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isPublic ? (
                    <div className="widget-icon-box" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--accent-emerald)' }}>
                      <Globe size={18} />
                    </div>
                  ) : (
                    <div className="widget-icon-box" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--accent-amber)' }}>
                      <Lock size={18} />
                    </div>
                  )}
                  <div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {isPublic ? 'Perfil Público' : 'Perfil Privado'}
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

          {savedSuccess && (
            <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              Configurações salvas e IMC atualizado com sucesso!
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
              Salvar Perfil
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
