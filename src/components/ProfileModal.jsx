import React, { useState } from 'react';
import { 
  X, 
  User, 
  Globe, 
  Lock, 
  Flame, 
  Trophy, 
  Save, 
  ShieldCheck, 
  CheckCircle2 
} from 'lucide-react';

export function ProfileModal({ isOpen, onClose, user, onUpdateUser }) {
  const [name, setName] = useState(user?.name || 'Eu Matheus');
  const [bio, setBio] = useState(user?.bio || 'Engenharia de Software & Produtividade Extrema');
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? true); // US37: Configuração de perfil (Público/Privado)
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
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
      avatar: initials || user.avatar
    };

    onUpdateUser(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--accent-cyan)" />
            <h2 className="modal-title">Perfil & Privacidade</h2>
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
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{user?.name}</h3>
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

          {/* US37: CONTROLE DE PRIVACIDADE BÁSICA (PÚBLICO / PRIVADO) */}
          <div className="form-group">
            <label className="form-label">Controle de Privacidade</label>
            <div className="card-native" style={{ padding: '14px', background: 'var(--surface-elevated)' }}>
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
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {isPublic 
                        ? 'Amigos aprovados podem ver suas conclusões de foco e treinos no feed.'
                        : 'Nenhuma atividade sua é compartilhada no feed da comunidade.'}
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
            </div>
          </div>

          {savedSuccess && (
            <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              Configurações de privacidade atualizadas com sucesso!
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
    </div>
  );
}
