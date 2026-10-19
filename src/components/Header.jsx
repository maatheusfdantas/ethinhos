import React from 'react';
import { Shield, Settings, User, Globe, Lock, LogOut } from 'lucide-react';

export function Header({ user, onOpenProfile, onOpenAuth, onLogout }) {
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
        <button 
          className="profile-pill" 
          onClick={onOpenProfile}
          title="Configurações de Perfil e Privacidade"
        >
          <div className="profile-avatar">
            {user?.avatar || 'EM'}
          </div>
          <span className="profile-name">{user?.name || 'Eu Matheus'}</span>
          <span 
            className={`privacy-dot ${user?.isPublic ? 'public' : 'private'}`}
            title={user?.isPublic ? 'Perfil Público (Feed Social Ativo)' : 'Perfil Privado'}
          />
        </button>

        <button 
          className="header-icon-btn" 
          onClick={onOpenAuth}
          title="Autenticação e Contas"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
