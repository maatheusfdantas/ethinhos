import React from 'react';
import { 
  LayoutGrid, 
  Calendar, 
  CheckSquare, 
  TrendingUp, 
  Plus, 
  Settings,
  LogOut,
  ShieldAlert,
  Timer,
  Dumbbell,
  Users
} from 'lucide-react';

export function DesktopSidebar({ 
  activeTab, 
  setActiveTab, 
  onOpenAdd, 
  isAdmin, 
  userPermissions = {}, 
  user,
  tags = [],
  onOpenProfile,
  onOpenAuth,
  onLogout 
}) {
  const navItems = [
    { id: 'dashboard', label: 'Painel Principal', icon: LayoutGrid, enabled: true },
    { id: 'calendar', label: 'Agenda Semanal', icon: Calendar, enabled: true },
    { id: 'workouts', label: 'Musculação & Treino', icon: Dumbbell, enabled: userPermissions.workouts !== false },
    { id: 'focus', label: 'Foco Pomodoro', icon: Timer, enabled: userPermissions.focus !== false },
    { id: 'telemetry', label: 'Análise de Progresso', icon: TrendingUp, enabled: userPermissions.telemetry !== false },
    { id: 'social', label: 'Comunidade', icon: Users, enabled: userPermissions.social !== false },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Portal Admin', icon: ShieldAlert, enabled: true });
  }

  return (
    <aside 
      style={{
        width: '235px',
        minWidth: '235px',
        backgroundColor: '#211F38',
        borderRadius: '26px',
        padding: '28px 18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#E2E4F0',
        boxShadow: '0 20px 45px rgba(20, 18, 40, 0.25)',
        userSelect: 'none'
      }}
      className="hidden lg:flex shrink-0"
    >
      <div>
        {/* 1. TOPO: LOGO ETHOS */}
        <div 
          onClick={() => setActiveTab('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0 10px 26px 10px',
            cursor: 'pointer'
          }}
        >
          <svg width="36" height="20" viewBox="0 0 68 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M 34 17 C 28 5, 6 5, 6 17 C 6 29, 28 29, 34 17 C 40 5, 62 5, 62 17 C 62 29, 40 29, 34 17 Z" 
              stroke="#FFFFFF" 
              strokeWidth="5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <line x1="6" y1="17" x2="23" y2="17" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '21px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            Ethos
          </span>
        </div>

        {/* 2. MENU PRINCIPAL */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.filter(item => item.enabled).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? '#56548A' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#A9ABC6',
                  boxShadow: isActive ? '0 6px 16px rgba(86, 84, 138, 0.35)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.75} style={{ flexShrink: 0 }} />
                <span style={{ lineHeight: 1.25 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 3. AÇÃO RÁPIDA */}
        <div style={{ marginTop: '24px', padding: '0 10px' }}>
          <button
            type="button"
            onClick={onOpenAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px dashed rgba(169, 171, 198, 0.35)',
              borderRadius: '12px',
              padding: '9px 12px',
              width: '100%',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              color: '#D8DAE8'
            }}
          >
            <span 
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#56548A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0
              }}
            >
              <Plus size={12} />
            </span>
            <span>Novo Hábito / Evento</span>
          </button>
        </div>

        {/* 4. ÁREAS DE FOCO / CATEGORIAS REAIS */}
        <div style={{ marginTop: '24px', padding: '0 10px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF', marginBottom: '6px' }}>
            Áreas de Foco
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#797B9E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            CATEGORIAS ATIVAS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
            {tags.map((tag) => (
              <div 
                key={tag.name}
                onClick={() => setActiveTab('dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#D8DAE8', cursor: 'pointer' }}
              >
                <span 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: tag.color || '#6366f1', 
                    display: 'inline-block',
                    flexShrink: 0
                  }} 
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. RODAPÉ DA SIDEBAR: CONFIGURAÇÕES & SAIR */}
      <div style={{ padding: '16px 10px 0 10px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={onOpenAuth}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#C5C7DE',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Settings size={15} />
          <span>Configurações</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          title="Sair da Conta"
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            color: '#8E90B0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}

export function MobileBottomNav({ activeTab, setActiveTab, onOpenAdd, isAdmin, userPermissions = {} }) {
  return (
    <nav 
      style={{
        backgroundColor: '#211F38',
        borderRadius: '22px',
        padding: '8px 12px',
        boxShadow: '0 12px 32px rgba(20, 18, 40, 0.45)'
      }}
      className="lg:hidden fixed bottom-3 left-3 right-3 z-50 flex items-center justify-around border border-white/10"
    >
      <button
        type="button"
        style={{
          color: activeTab === 'dashboard' ? '#FFFFFF' : '#A9ABC6',
          backgroundColor: activeTab === 'dashboard' ? '#56548A' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          padding: '6px 12px'
        }}
        className="flex flex-col items-center gap-1"
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutGrid size={18} />
        <span className="text-[10px] font-medium">Painel</span>
      </button>

      <button
        type="button"
        style={{
          color: activeTab === 'calendar' ? '#FFFFFF' : '#A9ABC6',
          backgroundColor: activeTab === 'calendar' ? '#56548A' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          padding: '6px 12px'
        }}
        className="flex flex-col items-center gap-1"
        onClick={() => setActiveTab('calendar')}
      >
        <Calendar size={18} />
        <span className="text-[10px] font-medium">Agenda</span>
      </button>

      {userPermissions.habits !== false && (
        <button
          type="button"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: '#56548A',
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(86, 84, 138, 0.5)'
          }}
          onClick={onOpenAdd}
          aria-label="Adicionar"
        >
          <Plus size={20} strokeWidth={2.4} />
        </button>
      )}

      {userPermissions.workouts !== false && (
        <button
          type="button"
          style={{
            color: activeTab === 'workouts' ? '#FFFFFF' : '#A9ABC6',
            backgroundColor: activeTab === 'workouts' ? '#56548A' : 'transparent',
            border: 'none',
            borderRadius: '12px',
            padding: '6px 12px'
          }}
          className="flex flex-col items-center gap-1"
          onClick={() => setActiveTab('workouts')}
        >
          <Dumbbell size={18} />
          <span className="text-[10px] font-medium">Treinos</span>
        </button>
      )}

      <button
        type="button"
        style={{
          color: activeTab === 'telemetry' ? '#FFFFFF' : '#A9ABC6',
          backgroundColor: activeTab === 'telemetry' ? '#56548A' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          padding: '6px 12px'
        }}
        className="flex flex-col items-center gap-1"
        onClick={() => setActiveTab('telemetry')}
      >
        <TrendingUp size={18} />
        <span className="text-[10px] font-medium">Progresso</span>
      </button>
    </nav>
  );
}
