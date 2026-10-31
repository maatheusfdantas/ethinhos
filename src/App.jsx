import React, { useState, useEffect } from 'react';
import { 
  getStorageData, 
  setStorageData, 
  STORAGE_KEYS 
} from './services/storage';

import { Header } from './components/Header';
import { DesktopSidebar, MobileBottomNav } from './components/Nav';
import { DashboardTab } from './components/DashboardTab';
import { AddModal } from './components/AddModal';
import { WorkoutTab } from './components/WorkoutTab';
import { FocusTab } from './components/FocusTab';
import { CalendarTab } from './components/CalendarTab';
import { TelemetryTab } from './components/TelemetryTab';
import { SocialTab } from './components/SocialTab';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { AdminPortalTab } from './components/AdminPortalTab';
import { LoginScreen } from './components/LoginScreen';
import { WelcomeIntro } from './components/WelcomeIntro';

import { INITIAL_TAGS, INITIAL_WORKOUTS, INITIAL_BADGES } from './data/initialData';
import { Lock, Shield, Plus, Search, Bell, X } from 'lucide-react';
import { GlobalProgressBar } from './components/GlobalProgressBar';
import { Toast } from './components/Toast';

export function App() {
  // REQUISITO: SEMPRE O LOCALHOST DEVE ENVIAR PARA A PÁGINA DE LOGIN PRIMEIRO
  // (Exceto quando retornando do callback OAuth 2.0 do Google Calendar: ?google_auth=...)
  const isReturningFromGoogleOAuth = typeof window !== 'undefined' && window.location.search.includes('google_auth=');

  const [user, setUser] = useState(() => {
    if (isReturningFromGoogleOAuth) {
      const saved = sessionStorage.getItem('ethos_current_user');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      return { id: 'usr_1', name: 'Lucas Dev', username: 'lucas', email: 'lucas@ethos.dev', role: 'user', avatar: 'LD' };
    }
    return null;
  });

  // Limpa qualquer resquício de sessão ao inicializar normalmente
  useEffect(() => {
    if (!isReturningFromGoogleOAuth) {
      sessionStorage.removeItem('ethos_current_user');
      localStorage.removeItem('ethos_current_user');
    }
  }, []);

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
  const [workouts, setWorkouts] = useState(INITIAL_WORKOUTS);
  const [badges, setBadges] = useState(INITIAL_BADGES);
  const [friends, setFriends] = useState([]);
  const [feed, setFeed] = useState([]);

  // Active Navigation Tab (abre direto na aba Calendário ao retornar do Google OAuth)
  const [activeTab, setActiveTab] = useState(() => isReturningFromGoogleOAuth ? 'calendar' : 'dashboard');

  // Modals & Header Controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);
  const [bootKey, setBootKey] = useState(0);

  // Discreet Toast Notification (with Undo / Ctrl+Z support)
  const [toast, setToast] = useState(null);

  const showToast = (message, onUndo = null) => {
    setToast({ message, onUndo });
  };

  // Load user data when user changes
  const loadUserData = async (activeUser) => {
    if (!activeUser) return;

    try {
      const res = await fetch(`/api/user/${activeUser.id}/data`);
      if (res.ok) {
        const data = await res.json();
        if (data.habits) setHabits(data.habits);
        if (data.events) setEvents(data.events);
        if (data.health) setHealth(data.health);
        if (data.tags && data.tags.length > 0) {
          setTags([...INITIAL_TAGS, ...data.tags.filter(t => !INITIAL_TAGS.find(it => it.name === t.name))]);
        }
        if (data.user) {
          setUser(prev => ({ ...prev, ...data.user }));
        }
      }
    } catch (e) {
      console.warn('Backend offline, using local states.');
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadUserData(user);
    }
  }, [user?.id]);

  // Handler: Add new Habit (US01, US19, US20, US39)
  const handleAddHabit = async (newHabit) => {
    setHabits(prev => [newHabit, ...prev]);

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/habit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        await fetch(`/api/user/${user.id}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        await fetch(`/api/user/${user.id}/event/${eventId}/toggle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
        await fetch(`/api/user/${user.id}/event/${eventId}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.error('Error deleting event:', e);
      }
    }
  };

  // Handler: Add New Tag / Category (Requisito 4)
  const handleAddTag = async (newTag) => {
    setTags(prev => [...prev, newTag]);

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/tag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTag)
        });
      } catch (e) {
        console.error('Error saving tag:', e);
      }
    }
  };

  // Handler: Delete Tag / Category
  const handleDeleteTag = async (tagId, tagName) => {
    setTags(prev => prev.filter(t => t.id !== tagId && t.name !== tagName));

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/tag/${encodeURIComponent(tagId || tagName)}`, {
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
    }
    if (authenticatedUser?.auth?.refreshToken) {
      sessionStorage.setItem('ethos_refresh_token', authenticatedUser.auth.refreshToken);
    }
    setUser(authenticatedUser);
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
    setUser(null);
    setShowWelcomeIntro(false);
    sessionStorage.removeItem('ethos_current_user');
    sessionStorage.removeItem('ethos_access_token');
    sessionStorage.removeItem('ethos_refresh_token');
    localStorage.removeItem('ethos_current_user');
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

  return (
    <div 
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundImage: "url('/ethos-wallpaper.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        padding: '28px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#1A1B2F'
      }}
      className="pb-20 lg:pb-7"
    >
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
        style={{
          width: '100%',
          maxWidth: '1360px',
          minHeight: '830px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.09) 48%, rgba(255, 255, 255, 0.18) 100%)',
          backdropFilter: 'blur(18px) saturate(165%)',
          WebkitBackdropFilter: 'blur(18px) saturate(165%)',
          borderRadius: '40px',
          border: '1.5px solid rgba(255, 255, 255, 0.48)',
          boxShadow: '0 32px 80px rgba(12, 14, 34, 0.28), inset 0 1.5px 1px rgba(255, 255, 255, 0.85), inset 0 -1.5px 2px rgba(255, 255, 255, 0.32), inset 1px 0 1.5px rgba(255, 255, 255, 0.35)',
          padding: '22px',
          display: 'flex',
          gap: '26px',
          position: 'relative'
        }}
      >
        {/* 1. SIDEBAR ESQUERDA ARREDONDADA (DARK PLUM #211F38) */}
        <DesktopSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAdd={() => setShowAddModal(true)}
          isAdmin={isAdmin}
          userPermissions={permissions}
          user={user}
          tags={tags}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onLogout={handleLogout}
        />

        {/* 2. ÁREA DE CONTEÚDO PRINCIPAL */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px', padding: '6px 6px 6px 0' }}>
          
          {/* TOP HEADER: "Hi, Dilan!" / "Workout & Fitness" + [+ Create] + Search + Bell + Avatar */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1A1B2F', letterSpacing: '-0.02em', margin: 0 }}>
                {activeTab === 'workouts' ? 'Workout & Fitness' : `Hi, ${firstName}!`}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Barra de busca expansível */}
              {showSearchBar && (
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: '999px', padding: '6px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <input
                    type="text"
                    placeholder="Buscar tarefas ou projetos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12.5px', color: '#1A1B2F', width: '170px' }}
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
                onClick={() => setShowAddModal(true)}
                style={{
                  height: '40px',
                  padding: '0 22px',
                  borderRadius: '999px',
                  backgroundColor: '#181824',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
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
                onClick={() => setShowProfileModal(true)}
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

          {/* CONTEÚDO DA ABA ATIVA */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                onOpenAdd={() => setShowAddModal(true)}
                onOpenWorkout={() => setActiveTab('workouts')}
                onAddTag={handleAddTag}
                onDeleteTag={handleDeleteTag}
                onToggleEvent={handleToggleEvent}
                onSwitchTab={setActiveTab}
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

            {/* DEMAIS ABAS (COM CONTAINER ESCURO ELEGANTE PARA PRESERVAR CONTRASTE DOS COMPONENTES INTERNOS) */}
            {activeTab !== 'dashboard' && activeTab !== 'calendar' && activeTab !== 'workouts' && (
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

                {/* TAB 7: PORTAL ADMIN */}
                {activeTab === 'admin' && (
                  <AdminPortalTab
                    onSystemReset={handleSystemReset}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdd={() => setShowAddModal(true)}
        isAdmin={isAdmin}
        userPermissions={permissions}
      />

      {/* DISCREET TOAST NOTIFICATION (WITH UNDO / CTRL+Z) */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* MODAL OVERLAYS */}
      <AddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddHabit={handleAddHabit}
        onAddEvent={handleAddEvent}
        tags={tags}
        onAddTag={handleAddTag}
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
        onUpdateUser={setUser}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
