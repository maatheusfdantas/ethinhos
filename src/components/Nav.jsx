import React from 'react';
import { 
  LayoutDashboard, 
  Dumbbell, 
  Timer, 
  Calendar, 
  BarChart3, 
  Users, 
  Plus, 
  Shield,
  ShieldAlert
} from 'lucide-react';

export function DesktopSidebar({ activeTab, setActiveTab, onOpenAdd, isAdmin, userPermissions = {} }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
    { id: 'workouts', label: 'Musculação', icon: Dumbbell, enabled: userPermissions.workouts !== false },
    { id: 'focus', label: 'Foco Pomodoro', icon: Timer, enabled: userPermissions.focus !== false },
    { id: 'calendar', label: 'Calendário & Matriz', icon: Calendar, enabled: true },
    { id: 'telemetry', label: 'Telemetria', icon: BarChart3, enabled: userPermissions.telemetry !== false },
    { id: 'social', label: 'Social & Amigos', icon: Users, enabled: userPermissions.social !== false },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Painel Admin', icon: ShieldAlert, enabled: true });
  }

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-header">
        <div className="brand-logo-badge">
          <Shield size={24} strokeWidth={2.4} />
        </div>
        <div>
          <h2 className="brand-title">ETHOS</h2>
          <span className="brand-subtitle">Cloud OS</span>
        </div>
      </div>

      <nav className="nav-group">
        {navItems.filter(item => item.enabled).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} className="nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {userPermissions.habits !== false && (
          <button 
            className="sidebar-add-btn"
            onClick={onOpenAdd}
          >
            <Plus size={20} strokeWidth={2.6} />
            <span>Novo Registro</span>
          </button>
        )}
      </nav>
    </aside>
  );
}

export function MobileBottomNav({ activeTab, setActiveTab, onOpenAdd, isAdmin, userPermissions = {} }) {
  return (
    <nav className="mobile-bottom-nav">
      <button
        className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard size={20} className="nav-icon" />
        <span>Início</span>
      </button>

      {userPermissions.workouts !== false && (
        <button
          className={`mobile-nav-btn ${activeTab === 'workouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('workouts')}
        >
          <Dumbbell size={20} className="nav-icon" />
          <span>Treinos</span>
        </button>
      )}

      {userPermissions.habits !== false && (
        <button
          className="mobile-nav-add-btn"
          onClick={onOpenAdd}
          aria-label="Adicionar Hábito ou Evento"
        >
          <Plus size={24} strokeWidth={2.8} />
        </button>
      )}

      {userPermissions.focus !== false && (
        <button
          className={`mobile-nav-btn ${activeTab === 'focus' ? 'active' : ''}`}
          onClick={() => setActiveTab('focus')}
        >
          <Timer size={20} className="nav-icon" />
          <span>Foco</span>
        </button>
      )}

      {isAdmin ? (
        <button
          className={`mobile-nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          <ShieldAlert size={20} className="nav-icon" />
          <span>Admin</span>
        </button>
      ) : (
        <button
          className={`mobile-nav-btn ${activeTab === 'social' ? 'active' : ''}`}
          onClick={() => setActiveTab('social')}
        >
          <Users size={20} className="nav-icon" />
          <span>Social</span>
        </button>
      )}
    </nav>
  );
}
