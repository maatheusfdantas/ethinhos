import React from 'react';
import { Shield, Settings, User, Globe, Lock, ShieldAlert, LogOut } from 'lucide-react';

export function Header({ user, onOpenProfile, onOpenAuth, onOpenAdmin, activeTab }) {
  const isAdmin = user?.role === 'admin';

  return (
    <header className="top-header">
      <div className="brand-section">
        <div className="brand-logo-badge">
          <Shield size={22} strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="brand-title">ETHOS</h1>
          <span className="brand-subtitle">Cloud Habit & Productivity OS</span>
        </div>
      </div>

      <div className="user-profile-header">
        {/* BOTÃO DE ACESSO AO PORTAL ADMIN SE FOR ADMINISTRADOR */}
        {isAdmin && (
          <button 
            className="btn-primary"
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.78rem',
              background: activeTab === 'admin' ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
              color: activeTab === 'admin' ? '#030712' : 'var(--accent-cyan)',
              borderColor: 'var(--accent-cyan)',
              boxShadow: activeTab === 'admin' ? 'var(--shadow-cyan)' : 'none'
            }}
            onClick={onOpenAdmin}
            title="Portal de Administração e Permissões"
          >
            <ShieldAlert size={14} />
            <span>Painel Admin</span>
          </button>
        )}

        <button 
          className="profile-pill" 
          onClick={onOpenProfile}
          title="Configurações de Perfil e Privacidade"
        >
          <div className="profile-avatar">
            {user?.avatar || 'EM'}
          </div>
          <span className="profile-name">{user?.name || user?.username || 'Usuário'}</span>
          <span 
            className={`privacy-dot ${user?.isPublic ? 'public' : 'private'}`}
            title={user?.isPublic ? 'Perfil Público (Feed Social Ativo)' : 'Perfil Privado'}
          />
        </button>

        <button 
          className="header-icon-btn" 
          onClick={onOpenAuth}
          title="Autenticação e Contas (US35)"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
