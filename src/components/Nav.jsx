import { CleanIcon } from './IconLibrary';
import React from 'react';
import { 
  LayoutGrid, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Settings,
  LogOut,
  ShieldAlert,
  Timer,
  Dumbbell,
  Users,
  CheckCircle2,
  ShieldOff,
  X
} from 'lucide-react';

export function DesktopSidebar({ 
  activeTab, 
  setActiveTab, 
  onOpenAdd, 
  isAdmin, 
  userPermissions = {}, 
  user,
  tags = [],
  onConfigureCategory,
  onCreateCategory,
  onOpenProfile,
  onOpenAuth,
  onLogout,
  mobileOpen = false,
  onCloseMobile
}) {
  const defaultPagePreferences = {
    dashboard: true,
    telemetry: true,
    habits: true,
    bad_habits: true,
    calendar: true,
    workouts: true,
    focus: true,
    social: true
  };
  const pages = { ...defaultPagePreferences, ...(user?.pagePreferences || {}) };

  const navItems = [
    { id: 'dashboard', label: 'Painel Principal', icon: LayoutGrid, enabled: true },
    { id: 'habits', label: 'Hábitos & Rotinas', icon: CheckCircle2, enabled: pages.habits !== false && userPermissions.habits !== false },
    { id: 'bad_habits', label: 'Maus Hábitos & Vícios', icon: ShieldOff, enabled: pages.bad_habits !== false },
    { id: 'calendar', label: 'Agenda Semanal', icon: Calendar, enabled: pages.calendar !== false },
    { id: 'workouts', label: 'Musculação & Treino', icon: Dumbbell, enabled: pages.workouts !== false && userPermissions.workouts !== false },
    { id: 'focus', label: 'Foco Pomodoro', icon: Timer, enabled: pages.focus !== false && userPermissions.focus !== false },
    { id: 'telemetry', label: 'Análise de Progresso', icon: TrendingUp, enabled: true },
    { id: 'social', label: 'Comunidade', icon: Users, enabled: pages.social !== false && userPermissions.social !== false },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Portal Admin', icon: ShieldAlert, enabled: true });
  }

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    onCloseMobile?.();
  };

  const renderSidebarContent = (isMobileDrawer = false) => (
    <>
      <div>
        {/* 1. TOPO: LOGO ETHOS */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px 24px 10px'
          }}
        >
          <div
            onClick={() => handleSelectTab('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
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

          {isMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
          )}
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
                onClick={() => handleSelectTab(item.id)}
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

        {/* 4. ÁREAS DE FOCO / CATEGORIAS MODULARES (PASSO B) */}
        <div style={{ marginTop: '24px', padding: '0 10px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF', marginBottom: '4px' }}>
            Áreas de Foco
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#797B9E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CATEGORIAS MODULARES
            </div>
            {onCreateCategory && (
              <button
                type="button"
                onClick={onCreateCategory}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A5A6F6',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Adicionar Nova Categoria Modular"
              >
                <Plus size={12} />
                <span>Nova</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '165px', overflowY: 'auto' }}>
            {tags.map((tag) => (
              <div 
                key={tag.id || tag.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  fontSize: '12px',
                  color: '#D8DAE8'
                }}
              >
                <div
                  onClick={() => handleSelectTab('dashboard')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, cursor: 'pointer' }}
                >
                  <CleanIcon name={tag.icon || 'Bookmark'} size={13} color={tag.color || '#6366f1'} strokeWidth={2.2} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {tag.has_subclasses && tag.subclasses?.length > 0 && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(129, 140, 248, 0.2)',
                        color: '#C7D2FE'
                      }}
                      title={`${tag.subclasses.length} sub-classes ativas`}
                    >
                      {tag.subclasses.length}
                    </span>
                  )}
                  {tag.is_shared && (
                    <Users size={11} color="#38BDF8" title="Categoria Compartilhada" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseMobile?.();
                      onConfigureCategory?.(tag);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      color: '#8E90B0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={`Configuração Avançada de ${tag.name}`}
                  >
                    <Settings size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. RODAPÉ DA SIDEBAR: CONFIGURAÇÕES & SAIR */}
      <div style={{ padding: '16px 10px 0 10px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={() => {
            onCloseMobile?.();
            onOpenAuth?.();
          }}
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
          onClick={() => {
            onCloseMobile?.();
            onLogout?.();
          }}
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
    </>
  );

  return (
    /* SIDEBAR DESKTOP (VISÍVEL APENAS EM >= 1024px; EM TABLETS E CELULARES NÃO EXISTE MENU LATERAL, APENAS A BARRA DE TAREFAS) */
    <aside 
      style={{
        backgroundColor: '#211F38',
        borderRadius: '26px',
        padding: '28px 18px',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#E2E4F0',
        boxShadow: '0 20px 45px rgba(20, 18, 40, 0.25)',
        userSelect: 'none'
      }}
      className="ethos-desktop-sidebar"
    >
      {renderSidebarContent(false)}
    </aside>
  );
}

export function MobileBottomNav({ activeTab, setActiveTab, onOpenAdd, isAdmin, userPermissions = {}, user }) {
  const defaultPagePreferences = {
    dashboard: true,
    telemetry: true,
    habits: true,
    bad_habits: true,
    calendar: true,
    workouts: true,
    focus: true,
    social: true
  };
  const pages = { ...defaultPagePreferences, ...(user?.pagePreferences || {}) };

  return (
    <nav 
      style={{
        backgroundColor: '#211F38',
        borderRadius: '22px',
        padding: '6px 8px',
        boxShadow: '0 12px 32px rgba(20, 18, 40, 0.45)'
      }}
      className="lg:hidden fixed bottom-2.5 left-2.5 right-2.5 z-50 flex items-center justify-around border border-white/10"
    >
      <button
        type="button"
        style={{
          color: activeTab === 'dashboard' ? '#FFFFFF' : '#A9ABC6',
          backgroundColor: activeTab === 'dashboard' ? '#56548A' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          padding: '5px 10px'
        }}
        className="flex flex-col items-center gap-0.5"
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutGrid size={17} />
        <span className="text-[10px] font-medium">Painel</span>
      </button>

      {pages.habits !== false && userPermissions.habits !== false && (
        <button
          type="button"
          style={{
            color: activeTab === 'habits' ? '#FFFFFF' : '#A9ABC6',
            backgroundColor: activeTab === 'habits' ? '#56548A' : 'transparent',
            border: 'none',
            borderRadius: '12px',
            padding: '5px 10px'
          }}
          className="flex flex-col items-center gap-0.5"
          onClick={() => setActiveTab('habits')}
        >
          <CheckCircle2 size={17} />
          <span className="text-[10px] font-medium">Hábitos</span>
        </button>
      )}

      {pages.bad_habits !== false && (
        <button
          type="button"
          style={{
            color: activeTab === 'bad_habits' ? '#FFFFFF' : '#A9ABC6',
            backgroundColor: activeTab === 'bad_habits' ? '#56548A' : 'transparent',
            border: 'none',
            borderRadius: '12px',
            padding: '5px 10px'
          }}
          className="flex flex-col items-center gap-0.5"
          onClick={() => setActiveTab('bad_habits')}
        >
          <ShieldOff size={17} />
          <span className="text-[10px] font-medium">Vícios</span>
        </button>
      )}

      {userPermissions.habits !== false && (
        <button
          type="button"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#56548A',
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(86, 84, 138, 0.5)'
          }}
          onClick={onOpenAdd}
          aria-label="Adicionar"
        >
          <Plus size={19} strokeWidth={2.4} />
        </button>
      )}

      {pages.calendar !== false && (
        <button
          type="button"
          style={{
            color: activeTab === 'calendar' ? '#FFFFFF' : '#A9ABC6',
            backgroundColor: activeTab === 'calendar' ? '#56548A' : 'transparent',
            border: 'none',
            borderRadius: '12px',
            padding: '5px 10px'
          }}
          className="flex flex-col items-center gap-0.5"
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={17} />
          <span className="text-[10px] font-medium">Agenda</span>
        </button>
      )}

      {pages.workouts !== false && userPermissions.workouts !== false && (
        <button
          type="button"
          style={{
            color: activeTab === 'workouts' ? '#FFFFFF' : '#A9ABC6',
            backgroundColor: activeTab === 'workouts' ? '#56548A' : 'transparent',
            border: 'none',
            borderRadius: '12px',
            padding: '5px 10px'
          }}
          className="flex flex-col items-center gap-0.5"
          onClick={() => setActiveTab('workouts')}
        >
          <Dumbbell size={17} />
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
          padding: '5px 10px'
        }}
        className="flex flex-col items-center gap-0.5"
        onClick={() => setActiveTab('telemetry')}
      >
        <TrendingUp size={17} />
        <span className="text-[10px] font-medium">Progresso</span>
      </button>
    </nav>
  );
}
