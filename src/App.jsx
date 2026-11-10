import React, { useState, useEffect, useRef } from 'react';

import { DesktopSidebar, MobileBottomNav } from './components/Nav';
import { DashboardTab } from './components/DashboardTab';
import { HabitsTab } from './components/HabitsTab';
import { BadHabitsTab } from './components/BadHabitsTab';
import { AddModal } from './components/AddModal';
import { WorkoutTab } from './components/WorkoutTab';
import { FocusTab } from './components/FocusTab';
import { CalendarTab } from './components/CalendarTab';
import { TelemetryTab } from './components/TelemetryTab';
import { SocialTab } from './components/SocialTab';
import { ProfileTab } from './components/ProfileTab';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { AdminPortalTab } from './components/AdminPortalTab';
import { LoginScreen } from './components/LoginScreen';
import { WelcomeIntro } from './components/WelcomeIntro';
import { CategoryConfigModal } from './components/CategoryConfigModal';
import { SupportModal } from './components/SupportModal';

import { INITIAL_TAGS, INITIAL_BADGES } from './data/initialData';
import { Lock, Plus, Search, Bell, X, Users, Play, LifeBuoy } from 'lucide-react';
import { Toast } from './components/Toast';
import { TabErrorBoundary } from './components/TabErrorBoundary';
import { SpringPageTransition } from './components/ui/MotionPrimitives';
import { useUserSync } from './hooks/useUserSync';
import { apiFetch } from './utils/api';

export function App() {
  const isReturningFromGoogleOAuth = typeof window !== 'undefined' && window.location.search.includes('google_auth=');

  // Persistência de sessão: restaura o usuário logado ao recarregar a página
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ethos_current_user') || sessionStorage.getItem('ethos_current_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao restaurar sessão salva:', e);
    }
    if (isReturningFromGoogleOAuth) {
      return { id: 'usr_1', name: 'Lucas Dev', username: 'lucas', email: 'lucas@ethos.dev', role: 'user', avatar: 'LD' };
    }
    return null;
  });

  // Mantém localStorage e sessionStorage sempre sincronizados com o estado do usuário
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('ethos_current_user', JSON.stringify(user));
        sessionStorage.setItem('ethos_current_user', JSON.stringify(user));
      } catch (e) {}
    }
  }, [user]);

  // User-specific states
  const [tags, setTags] = useState(INITIAL_TAGS);
  const [habits, setHabits] = useState([]);
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState({
    waterGlasses: 0,
    waterTarget: 10,
    waterHistory: [],
    sleep: { bedTime: '23:30', wakeTime: '07:00', targetHours: 8, logged: false }
  });
  const [workouts, setWorkouts] = useState(() => {
    try {
      const activeId = localStorage.getItem('ethos_user_id') || user?.id;
      if (activeId) {
        const saved = localStorage.getItem(`ethos_workouts_${activeId}`);
        if (saved) return JSON.parse(saved);
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  const [badges, setBadges] = useState(INITIAL_BADGES);
  const [friends, setFriends] = useState([]);
  const [feed, setFeed] = useState([]);

  // Active Navigation Tab (abre direto na aba Calendário ao retornar do Google OAuth)
  const [activeTab, setActiveTab] = useState(() => {
    if (isReturningFromGoogleOAuth) return 'calendar';
    try {
      const savedTab = localStorage.getItem('ethos_active_tab');
      if (savedTab) return savedTab;
    } catch (e) {}
    return 'dashboard';
  });

  useEffect(() => {
    if (activeTab) {
      try {
        localStorage.setItem('ethos_active_tab', activeTab);
      } catch (e) {}
    }
  }, [activeTab]);

  useEffect(() => {
    if (user?.id && !user.pagePreferences) {
      try {
        const saved = localStorage.getItem(`ethos_pages_${user.id}`);
        if (saved) {
          setUser(prev => ({ ...prev, pagePreferences: JSON.parse(saved) }));
        }
      } catch (e) {}
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.pagePreferences && user.pagePreferences[activeTab] === false) {
      setActiveTab('dashboard');
    }
  }, [user?.pagePreferences, activeTab]);

  // Captura retorno de autenticação social OAuth (Google Agenda ou Microsoft Graph)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth_success');
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const rawUser = urlParams.get('user');
    const authError = urlParams.get('auth_error');

    if (authError) {
      showToast(`Aviso de login social: ${decodeURIComponent(authError)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (authSuccess === 'true' && accessToken && rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser);
        localStorage.setItem('ethos_access_token', accessToken);
        sessionStorage.setItem('ethos_access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('ethos_refresh_token', refreshToken);
          sessionStorage.setItem('ethos_refresh_token', refreshToken);
        }
        localStorage.setItem('ethos_current_user', JSON.stringify(parsedUser));
        sessionStorage.setItem('ethos_current_user', JSON.stringify(parsedUser));
        setUser(parsedUser);
        loadUserData(parsedUser);
        showToast(`Bem-vindo, ${parsedUser.name}! Agenda sincronizada.`);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('Erro ao processar sessão OAuth:', err);
      }
    }
  }, []);

  // Modals & Header Controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialMode, setAddModalInitialMode] = useState('event');

  const handleOpenAdd = (targetMode = 'event') => {
    setAddModalInitialMode(targetMode);
    setShowAddModal(true);
  };
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);
  const [bootKey, setBootKey] = useState(0);

  // Passo B & Passo D: Configuração Avançada de Categoria & Dinâmica Colaborativa em Tempo Real
  const [configCategory, setConfigCategory] = useState(null);
  const [syncedFocusRequest, setSyncedFocusRequest] = useState(null);
  const [sharedPomodoroAlert, setSharedPomodoroAlert] = useState({
    active: false,
    memberName: '',
    categoryName: '',
    subclassName: ''
  });

  // Discreet Toast Notification (with Undo / Ctrl+Z support)
  const [toast, setToast] = useState(null);

  const showToast = (message, onUndo = null) => {
    setToast({ message, onUndo });
  };

  // Sincronização e hidratação segura do usuário via hook modular
  const { loadUserData, resetSyncState } = useUserSync({
    user,
    setUser,
    habits,
    setHabits,
    events,
    setEvents,
    tags,
    setTags,
    health,
    setHealth,
    workouts,
    setWorkouts
  });

  // Handler: Add new Habit (US01, US19, US20, US39)
  const handleAddHabit = async (newHabit) => {
    setHabits(prev => [newHabit, ...prev]);

    if (user) {
      try {
        await apiFetch(`/api/user/${user.id}/habit`, {
          method: 'POST',
          body: JSON.stringify(newHabit)
        });
      } catch (e) {
        console.error('Error saving habit to SQLite:', e);
      }
    }
  };

  // Handler: Add new Event (Requisito 3: Data e Horário)
  const handleAddEvent = async (newEvent) => {
    setEvents(prev => [...prev, newEvent]);

    if (user) {
      try {
        await apiFetch(`/api/user/${user.id}/event`, {
          method: 'POST',
          body: JSON.stringify(newEvent)
        });
      } catch (e) {
        console.error('Error saving event to SQLite:', e);
      }
    }
  };

  // Handler: Toggle Event Completion
  const handleToggleEvent = async (eventId, completed) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, completed } : e));

    if (user) {
      try {
        await apiFetch(`/api/user/${user.id}/event/${eventId}/toggle`, {
          method: 'PUT',
          body: JSON.stringify({ completed })
        });
      } catch (e) {
        console.error('Error updating event:', e);
      }
    }
  };

  // Handler: Delete Event
  const handleDeleteEvent = async (eventId) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));

    if (user) {
      try {
        await apiFetch(`/api/user/${user.id}/event/${eventId}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.error('Error deleting event:', e);
      }
    }
  };

  // Passo A: Criação Rápida de Categoria (Nasce puramente Básica: is_shared = false, has_subclasses = false)
  const handleAddTag = async (newTag) => {
    const basicCategory = {
      ...newTag,
      is_shared: false,
      has_subclasses: false,
      subclasses: [],
      members: []
    };
    setTags(prev => [...prev, basicCategory]);

    if (user) {
      try {
        await apiFetch(`/api/user/${user.id}/tag`, {
          method: 'POST',
          body: JSON.stringify(basicCategory)
        });
      } catch (e) {
        console.error('Error saving tag:', e);
      }
    }
  };

  // Passo B & D: Evolução para Configuração Avançada de Categoria (Sub-classes + Compartilhamento + Restrição Antibug)
  const handleUpdateCategoryConfig = async (updatedCat) => {
    setTags(prev => {
      const exists = prev.some(t => t.id === updatedCat.id || t.name === updatedCat.name);
      if (exists) {
        return prev.map(t => (t.id === updatedCat.id || t.name === updatedCat.name ? { ...t, ...updatedCat, isNew: false } : t));
      } else {
        return [...prev, { ...updatedCat, id: updatedCat.id || `tag_${Date.now()}`, isNew: false }];
      }
    });
    showToast(
      `Categoria "${updatedCat.name}" ${updatedCat.isNew ? 'criada' : 'atualizada'} (${
        updatedCat.has_subclasses ? `${updatedCat.subclasses?.length || 0} sub-classes` : 'Básica'
      }${updatedCat.is_shared ? ' • Compartilhada' : ''})`
    );

    if (user) {
      try {
        await apiFetch(`/api/user/${user.id}/category/${encodeURIComponent(updatedCat.id || updatedCat.name)}/config`, {
          method: 'PUT',
          body: JSON.stringify(updatedCat)
        });
      } catch (e) {
        console.error('Error updating category config:', e);
      }
    }
  };

  // Abrir Modal para Criar Nova Categoria Modular do Zero
  const handleOpenCreateCategory = () => {
    setConfigCategory({
      isNew: true,
      id: `tag_${Date.now()}`,
      name: '',
      color: '#818cf8',
      bg: 'rgba(129, 140, 248, 0.15)',
      icon: 'BookOpen',
      has_subclasses: false,
      is_shared: false,
      subclasses: [],
      members: []
    });
  };

  // Passo C & E: Registrar horas/esforço em Sub-classe (Pomodoro ou Hábito Coringa) para Drill-Down Analítico
  const handleLogSubclassEffort = async (categoryNameOrId, subclassName, hoursDelta = 0.5) => {
    const targetCat = tags.find(t => t.id === categoryNameOrId || t.name === categoryNameOrId);
    if (!targetCat) return;

    setTags(prev =>
      prev.map(cat => {
        if (cat.id !== targetCat.id && cat.name !== targetCat.name) return cat;
        if (!subclassName || !Array.isArray(cat.subclasses)) return cat;
        const nextSubs = cat.subclasses.map(sub =>
          sub.name === subclassName
            ? { ...sub, hours: Number((Number(sub.hours || 0) + Number(hoursDelta)).toFixed(2)) }
            : sub
        );
        return { ...cat, subclasses: nextSubs };
      })
    );

    if (user && subclassName) {
      try {
        await apiFetch(`/api/user/${user.id}/category/${encodeURIComponent(targetCat.id)}/log-effort`, {
          method: 'POST',
          body: JSON.stringify({ subclassName, hoursDelta })
        });
      } catch (e) {
        console.error('Error logging subclass effort:', e);
      }
    }
  };

  // Handler: Delete Tag / Category
  const handleDeleteTag = async (tagId, tagName) => {
    setTags(prev => prev.filter(t => t.id !== tagId && t.name !== tagName));

    if (user) {
      try {
        await apiFetch(`/api/user/${user.id}/tag/${encodeURIComponent(tagId || tagName)}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.error('Error deleting tag:', e);
      }
    }
  };

  // Handler: Complete Workout (US11)
  const handleCompleteWorkout = (workoutName) => {
    if (user?.is_public) {
      const feedItem = {
        id: `feed_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        type: 'workout_completed',
        title: 'Treino de Força Finalizado',
        details: `${workoutName} concluído com sucesso e disciplina total!`,
        timestamp: 'Agora mesmo',
        reactions: { like: 1, fire: 3, trophy: 2 },
        userReacted: 'fire'
      };
      setFeed(prev => [feedItem, ...prev]);
    }

    setUser(prev => ({
      ...prev,
      points: (prev?.points || 0) + 50
    }));
  };

  // Handler: Focus Completed (US05, US06, US25)
  const handleFocusComplete = (sessionInfo) => {
    if (user?.is_public) {
      const feedItem = {
        id: `feed_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        type: 'focus_completed',
        title: 'Sessão de Foco Pomodoro Concluída',
        details: `${sessionInfo.durationMins} min dedicados a "${sessionInfo.subject}" com regra anti-fraude!`,
        timestamp: 'Agora mesmo',
        reactions: { like: 2, fire: 4, trophy: 2 },
        userReacted: 'trophy'
      };
      setFeed(prev => [feedItem, ...prev]);
    }

    setUser(prev => ({
      ...prev,
      points: (prev?.points || 0) + sessionInfo.durationMins * 2
    }));
  };

  // Handler: Login Success (US35)
  const handleLoginSuccess = (authenticatedUser) => {
    if (authenticatedUser?.auth?.accessToken) {
      sessionStorage.setItem('ethos_access_token', authenticatedUser.auth.accessToken);
      localStorage.setItem('ethos_access_token', authenticatedUser.auth.accessToken);
    }
    if (authenticatedUser?.auth?.refreshToken) {
      sessionStorage.setItem('ethos_refresh_token', authenticatedUser.auth.refreshToken);
      localStorage.setItem('ethos_refresh_token', authenticatedUser.auth.refreshToken);
    }
    try {
      localStorage.setItem('ethos_current_user', JSON.stringify(authenticatedUser));
      sessionStorage.setItem('ethos_current_user', JSON.stringify(authenticatedUser));
      localStorage.setItem('ethos_user_id', authenticatedUser.id);
      const savedWorkouts = localStorage.getItem(`ethos_workouts_${authenticatedUser.id}`);
      setWorkouts(savedWorkouts ? JSON.parse(savedWorkouts) : []);
    } catch (e) {}
    setUser(authenticatedUser);
    loadUserData(authenticatedUser);
    setShowWelcomeIntro(true);
    setBootKey(prev => prev + 1);
    if (authenticatedUser.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Logout handler
  const handleLogout = () => {
    resetSyncState();
    setUser(null);
    setShowWelcomeIntro(false);
    sessionStorage.removeItem('ethos_current_user');
    sessionStorage.removeItem('ethos_access_token');
    sessionStorage.removeItem('ethos_refresh_token');
    localStorage.removeItem('ethos_current_user');
    localStorage.removeItem('ethos_access_token');
    localStorage.removeItem('ethos_refresh_token');
    localStorage.removeItem('ethos_active_tab');
    localStorage.removeItem('ethos_user_id');
    setWorkouts([]);
    setHabits([]);
    setEvents([]);
    setTags([]);
    setHealth({
      waterGlasses: 0,
      waterTarget: 10,
      glassMl: 250,
      waterHistory: [],
      sleep: { bedTime: '23:30', wakeTime: '07:00', targetHours: 8, logged: false }
    });
    setShowAuthModal(false);
    setShowProfileModal(false);
    setShowAddModal(false);
    setActiveTab('dashboard');
  };

  // System Reset (Requisito 5)
  const handleSystemReset = () => {
    if (user) {
      loadUserData(user);
    }
  };

  // REQUISITO 5: SE NÃO ESTIVER LOGADO, MOSTRA A TELA DE LOGIN OBRIGATÓRIA
  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = user?.role === 'admin';
  const permissions = user?.permissions || { focus: true, workouts: true, telemetry: true, social: true, habits: true };
  const firstName = user?.name ? user.name.split(' ')[0] : 'Dilan';

  // Redireciona usuários não-administradores se tentarem acessar a aba admin
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin]);

  // PORTAL DO ADMINISTRADOR DEDICADO (SEPARAÇÃO TOTAL DE ESCOPO E DESIGN ESTILO LANDING PAGE)
  if (activeTab === 'admin' && isAdmin) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#0A0A0C' }}>
        <AdminPortalTab
          onSystemReset={handleSystemReset}
          showToast={showToast}
          onSwitchToApp={() => setActiveTab('dashboard')}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="ethos-app-outer">
      {/* ANIMAÇÃO CINEMATOGRÁFICA DE BOAS-VINDAS EM ALTA RESOLUÇÃO (PÓS-LOGIN) */}
      {showWelcomeIntro && (
        <WelcomeIntro
          userName={user?.name}
          onComplete={() => {
            setShowWelcomeIntro(false);
            setBootKey(prev => prev + 1);
          }}
        />
      )}

      {/* MOLDURA TRANSLÚCIDA FLUTUANTE COM EFEITO LIQUID GLASS DO IPHONE */}
      {!showWelcomeIntro && (
        <div
          key={`boot-${bootKey}`}
          className="ethos-boot-frame"
        >
        {/* 1. SIDEBAR ESQUERDA ARREDONDADA (DARK PLUM #211F38) + DRAWER MOBILE */}
        <DesktopSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAdd={() => handleOpenAdd(activeTab === 'habits' ? 'habit' : 'event')}
          isAdmin={isAdmin}
          userPermissions={permissions}
          user={user}
          tags={tags}
          onConfigureCategory={(cat) => setConfigCategory(cat)}
          onCreateCategory={handleOpenCreateCategory}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenSupport={() => setShowSupportModal(true)}
          onLogout={handleLogout}
        />

        {/* 2. ÁREA DE CONTEÚDO PRINCIPAL */}
        <div className="ethos-main-content">
          
          {/* TOP HEADER: Botão Menu Mobile + "Hi, Dilan!" + [+ Create] + Search + Bell + Avatar */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              

              <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#1A1B2F', letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeTab === 'workouts' ? 'Workout & Fitness' : activeTab === 'profile' ? 'Perfil do Usuário' : `Hi, ${firstName}!`}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Barra de busca expansível */}
              {showSearchBar && (
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: '999px', padding: '6px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12.5px', color: '#1A1B2F', width: '130px' }}
                  />
                  <button
                    type="button"
                    onClick={() => { setShowSearchBar(false); setSearchQuery(''); }}
                    style={{ background: 'none', border: 'none', color: '#7E7F9A', cursor: 'pointer', display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Botão + Create (Pílula Preta/Escura) */}
              <button
                type="button"
                onClick={() => handleOpenAdd(activeTab === 'habits' ? 'habit' : 'event')}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '999px',
                  backgroundColor: '#181824',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(24, 24, 36, 0.22)'
                }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Create</span>
              </button>

              {/* Botão Search Circular Branco */}
              <button
                type="button"
                onClick={() => setShowSearchBar(!showSearchBar)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#F8F8FA',
                  color: '#1A1B2F',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
                title="Pesquisar"
              >
                <Search size={17} strokeWidth={2} />
              </button>

              {/* Botão Suporte / Abrir Ticket Circular Branco */}
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#F8F8FA',
                  color: '#56548A',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
                title="Central de Suporte / Abrir Ticket de Ajuda"
              >
                <LifeBuoy size={17} strokeWidth={2} />
              </button>

              {/* Botão Notificações Circular Branco com Ponto Vermelho */}
              <button
                type="button"
                onClick={() => showToast('Você tem 2 tarefas em andamento e 1 meta concluída hoje!')}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#F8F8FA',
                  color: '#1A1B2F',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
                title="Notificações"
              >
                <Bell size={17} strokeWidth={2} />
                <span 
                  style={{
                    position: 'absolute',
                    top: '9px',
                    right: '10px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#EF4444',
                    border: '1.5px solid #F8F8FA'
                  }}
                />
              </button>

              {/* Avatar Circular do Usuário */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#211F38',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: '0 4px 14px rgba(33, 31, 56, 0.25)'
                }}
                title="Abrir Perfil e Biometria"
              >
                {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'DL')}
              </button>
            </div>
          </header>

          {/* PASSO D: ALERTA SUTIL EM TEMPO REAL DE POMODORO COMPARTILHADO */}
          {sharedPomodoroAlert?.active && tags.some(t => t.name === sharedPomodoroAlert.categoryName && t.is_shared) && (
            <div
              style={{
                backgroundColor: '#211F38',
                borderRadius: '18px',
                padding: '12px 16px',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                boxShadow: '0 8px 24px rgba(33, 31, 56, 0.16)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(56, 189, 248, 0.18)',
                    color: '#38BDF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Users size={16} />
                </div>
                <div style={{ fontSize: '12.5px', lineHeight: 1.35 }}>
                  <strong style={{ color: '#38BDF8' }}>{sharedPomodoroAlert.memberName}</strong> iniciou um Pomodoro em{' '}
                  <strong style={{ color: '#FDE68A' }}>{sharedPomodoroAlert.subclassName}</strong>{' '}
                  <span style={{ color: '#A9ABC6', fontSize: '11.5px' }}>({sharedPomodoroAlert.categoryName})</span> — deseja focar junto?
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSyncedFocusRequest({
                      categoryName: sharedPomodoroAlert.categoryName,
                      subclassName: sharedPomodoroAlert.subclassName,
                      memberName: sharedPomodoroAlert.memberName,
                      timestamp: Date.now()
                    });
                    setSharedPomodoroAlert(prev => ({ ...prev, active: false }));
                    setActiveTab('focus');
                    showToast(`Sincronizado com ${sharedPomodoroAlert.memberName} em ${sharedPomodoroAlert.subclassName}!`);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    backgroundColor: '#38BDF8',
                    color: '#1A1B2F',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <Play size={12} fill="#1A1B2F" />
                  <span>Focar Junto Agora</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSharedPomodoroAlert(prev => ({ ...prev, active: false }))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    color: '#A9ABC6',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Dispensar alerta"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA ABA ATIVA */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TabErrorBoundary key={activeTab}>
            <SpringPageTransition activeKey={activeTab}>
            {/* TAB 1: DASHBOARD (PAINEL PRINCIPAL FIEL AO MOCKUP) */}
            {activeTab === 'dashboard' && (
              <DashboardTab
                habits={habits}
                setHabits={setHabits}
                events={events}
                workouts={workouts}
                health={health}
                setHealth={setHealth}
                tags={tags}
                user={user}
                onOpenAdd={() => handleOpenAdd('habit')}
                onOpenWorkout={() => setActiveTab('workouts')}
                onCreateCategory={handleOpenCreateCategory}
                onAddTag={handleAddTag}
                onDeleteTag={handleDeleteTag}
                onConfigureCategory={(cat) => setConfigCategory(cat)}
                onLogSubclassEffort={handleLogSubclassEffort}
                onToggleEvent={handleToggleEvent}
                onSwitchTab={setActiveTab}
                showToast={showToast}
              />
            )}

            {/* TAB: HÁBITOS & ROTINAS (ABA DEDICADA EXCLUSIVAMENTE A HÁBITOS) */}
            {activeTab === 'habits' && (
              <HabitsTab
                habits={habits}
                setHabits={setHabits}
                tags={tags}
                user={user}
                onOpenAddHabit={() => handleOpenAdd('habit')}
                onLogSubclassEffort={handleLogSubclassEffort}
                showToast={showToast}
              />
            )}

            {/* TAB: MAUS HÁBITOS & VÍCIOS (SUPERAÇÃO, SOBRIEDADE E DESEMPENHO) */}
            {activeTab === 'bad_habits' && (
              <BadHabitsTab
                user={user}
                showToast={showToast}
              />
            )}

            {/* TAB 4: CALENDÁRIO / AGENDA MENSAL, SEMANAL E DIÁRIA */}
            {activeTab === 'calendar' && (
              <CalendarTab
                events={events}
                setEvents={setEvents}
                habits={habits}
                setHabits={setHabits}
                workouts={workouts}
                tags={tags}
                onOpenAdd={() => setShowAddModal(true)}
                onToggleEvent={handleToggleEvent}
                onAddEvent={handleAddEvent}
                onDeleteEvent={handleDeleteEvent}
                onSwitchTab={setActiveTab}
                showToast={showToast}
              />
            )}

            {/* TAB 2: MUSCULAÇÃO & TREINO (RENDERIZADO DIRETO NA MOLDURA CLARA FIEL AO MOCKUP) */}
            {activeTab === 'workouts' && (
              permissions.workouts === false ? (
                <div style={{ backgroundColor: '#211F38', borderRadius: '28px', padding: '40px 24px', color: '#F8FAFC', textAlign: 'center' }}>
                  <Lock size={32} className="text-zinc-400 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-zinc-200 mb-1">Módulo de Musculação Bloqueado</h3>
                  <p className="text-xs text-zinc-400">
                    O Administrador desativou o seu acesso a este módulo no portal de permissões.
                  </p>
                </div>
              ) : (
                <WorkoutTab
                  workouts={workouts}
                  setWorkouts={setWorkouts}
                  onCompleteWorkout={handleCompleteWorkout}
                  habits={habits}
                  setHabits={setHabits}
                />
              )
            )}

            {/* TAB: PERFIL DO USUÁRIO (XP, POST-ITS, MÚSICA, PLAYLISTS, STREAKS E BIO) */}
            {activeTab === 'profile' && (
              <ProfileTab
                user={user}
                setUser={setUser}
                habits={habits}
                workouts={workouts}
                health={health}
                setHealth={setHealth}
                badges={badges}
                friends={friends}
                showToast={showToast}
                onOpenSettings={() => setShowProfileModal(true)}
                onOpenSupport={() => setShowSupportModal(true)}
              />
            )}

            {/* DEMAIS ABAS (COM CONTAINER ESCURO ELEGANTE PARA PRESERVAR CONTRASTE DOS COMPONENTES INTERNOS) */}
            {activeTab !== 'dashboard' && activeTab !== 'calendar' && activeTab !== 'workouts' && activeTab !== 'habits' && activeTab !== 'bad_habits' && activeTab !== 'profile' && activeTab !== 'admin' && (
              <div 
                style={{
                  backgroundColor: '#211F38',
                  borderRadius: '28px',
                  padding: '24px',
                  color: '#F8FAFC',
                  boxShadow: '0 16px 40px rgba(33, 31, 56, 0.22)'
                }}
              >
                {/* TAB 3: FOCO POMODORO / BIBLIOTECA DE PROJETOS */}
                {activeTab === 'focus' && (
                  permissions.focus === false ? (
                    <div className="card-native text-center py-10 px-4">
                      <Lock size={32} className="text-zinc-400 mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-zinc-200 mb-1">Módulo de Foco Bloqueado</h3>
                      <p className="text-xs text-zinc-400">
                        O Administrador desativou o seu acesso ao Cronômetro de Foco.
                      </p>
                    </div>
                  ) : (
                    <FocusTab
                      user={user}
                      tags={tags}
                      syncedFocusRequest={syncedFocusRequest}
                      onConfigureCategory={(cat) => setConfigCategory(cat)}
                      onLogSubclassEffort={handleLogSubclassEffort}
                      onTriggerSharedPomodoro={(info) => setSharedPomodoroAlert({ active: true, ...info })}
                      onFocusComplete={handleFocusComplete}
                    />
                  )
                )}

                {/* TAB 5: TELEMETRIA / ANÁLISE DE PROGRESSO */}
                {activeTab === 'telemetry' && (
                  permissions.telemetry === false ? (
                    <div className="card-native text-center py-10 px-4">
                      <Lock size={32} className="text-zinc-400 mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-zinc-200 mb-1">Telemetria Bloqueada</h3>
                      <p className="text-xs text-zinc-400">
                        O Administrador desativou o seu acesso aos gráficos comparativos.
                      </p>
                    </div>
                  ) : (
                    <TelemetryTab
                      habits={habits}
                      health={health}
                      tags={tags}
                      onConfigureCategory={(cat) => setConfigCategory(cat)}
                      heatmapData={[]}
                      user={user}
                    />
                  )
                )}

                {/* TAB 6: SOCIAL / COMUNIDADE */}
                {activeTab === 'social' && (
                  permissions.social === false ? (
                    <div className="card-native text-center py-10 px-4">
                      <Lock size={32} className="text-zinc-400 mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-zinc-200 mb-1">Comunidade Bloqueada</h3>
                      <p className="text-xs text-zinc-400">
                        O Administrador desativou o seu acesso ao Feed Social.
                      </p>
                    </div>
                  ) : (
                    <SocialTab
                      user={user}
                      badges={badges}
                      friends={friends}
                      setFriends={setFriends}
                      feed={feed}
                      setFeed={setFeed}
                    />
                  )
                )}

              </div>
            )}
            </SpringPageTransition>
            </TabErrorBoundary>
          </main>
        </div>
      </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      {activeTab !== 'admin' && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAdd={() => handleOpenAdd(activeTab === 'habits' ? 'habit' : 'event')}
          isAdmin={isAdmin}
          userPermissions={permissions}
          user={user}
        />
      )}

      {/* DISCREET TOAST NOTIFICATION (WITH UNDO / CTRL+Z) */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* MODAL OVERLAYS */}
      <AddModal
        isOpen={showAddModal}
        initialMode={addModalInitialMode}
        onClose={() => setShowAddModal(false)}
        onAddHabit={handleAddHabit}
        onAddEvent={handleAddEvent}
        tags={tags}
        onAddTag={handleAddTag}
      />

      <CategoryConfigModal
        isOpen={Boolean(configCategory)}
        category={configCategory}
        onClose={() => setConfigCategory(null)}
        onSaveConfig={handleUpdateCategoryConfig}
        onDeleteCategory={handleDeleteTag}
        onTriggerSharedPomodoro={(info) => {
          setSharedPomodoroAlert({ active: true, ...info });
          showToast(`Alerta colaborativo disparado: ${info.memberName} iniciou Pomodoro em ${info.subclassName}!`);
        }}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={user}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        health={health}
        setHealth={setHealth}
        onUpdateUser={(updated) => {
          setUser(updated);
          try {
            localStorage.setItem('ethos_current_user', JSON.stringify(updated));
          } catch (e) {}
        }}
        onLogout={handleLogout}
      />

      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        user={user}
        showToast={showToast}
      />
    </div>
  );
}

export default App;
