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

import { INITIAL_TAGS, INITIAL_WORKOUTS, INITIAL_BADGES } from './data/initialData';
import { Lock } from 'lucide-react';

export function App() {
  // REQUISITO 5: PRIMEIRA COISA AO CARREGAR É O LOGIN (user inicia como null)
  const [user, setUser] = useState(() => {
    // Check if session exists in sessionStorage (clears on fresh browser tab/window load)
    const sessionUser = sessionStorage.getItem('ethos_current_user');
    return sessionUser ? JSON.parse(sessionUser) : null;
  });

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

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load user data when user changes
  const loadUserData = async (activeUser) => {
    if (!activeUser) return;

    try {
      const res = await fetch(`/api/user/${activeUser.id}/data`);
      if (res.ok) {
        const data = await res.json();
        setHabits(data.habits || []);
        setEvents(data.events || []);
        if (data.health) setHealth(data.health);
        if (data.tags && data.tags.length > 0) {
          setTags([...INITIAL_TAGS, ...data.tags.filter(t => !INITIAL_TAGS.find(it => it.name === t.name))]);
        }
      }
    } catch (e) {
      console.warn('Backend offline, using local states.');
    }
  };

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('ethos_current_user', JSON.stringify(user));
      loadUserData(user);
    } else {
      sessionStorage.removeItem('ethos_current_user');
    }
  }, [user]);

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

  // Handler: Complete Workout (US11)
  const handleCompleteWorkout = (workoutName) => {
    if (user?.is_public) {
      const feedItem = {
        id: `feed_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        type: 'workout_completed',
        title: 'Treino de Força Finalizado (US11)',
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

    alert(`Parabéns! O treino "${workoutName}" foi finalizado com sucesso!`);
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
    setUser(authenticatedUser);
    if (authenticatedUser.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('ethos_current_user');
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

  return (
    <div className="app-container">
      {/* DESKTOP SIDEBAR */}
      <DesktopSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdd={() => setShowAddModal(true)}
        isAdmin={isAdmin}
        userPermissions={permissions}
      />

      {/* TOP HEADER */}
      <Header
        user={user}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAdmin={() => setActiveTab('admin')}
        activeTab={activeTab}
      />

      {/* MAIN VIEWPORT */}
      <main className="main-content">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            habits={habits}
            setHabits={setHabits}
            events={events}
            health={health}
            setHealth={setHealth}
            tags={tags}
            onOpenAdd={() => setShowAddModal(true)}
            onOpenWorkout={() => setActiveTab('workouts')}
            onAddTag={handleAddTag}
            onToggleEvent={handleToggleEvent}
          />
        )}

        {/* TAB 2: MUSCULAÇÃO */}
        {activeTab === 'workouts' && (
          permissions.workouts === false ? (
            <div className="card-native" style={{ textAlign: 'center', padding: '40px 16px' }}>
              <Lock size={36} color="var(--accent-rose)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>Módulo de Musculação Bloqueado</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                O Administrador desativou o seu acesso a este módulo no portal de permissões.
              </p>
            </div>
          ) : (
            <WorkoutTab
              workouts={workouts}
              setWorkouts={setWorkouts}
              onCompleteWorkout={handleCompleteWorkout}
            />
          )
        )}

        {/* TAB 3: FOCO POMODORO */}
        {activeTab === 'focus' && (
          permissions.focus === false ? (
            <div className="card-native" style={{ textAlign: 'center', padding: '40px 16px' }}>
              <Lock size={36} color="var(--accent-rose)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>Módulo de Foco Bloqueado</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
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

        {/* TAB 4: CALENDÁRIO COM VISUALIZAÇÃO DE ATIVIDADES DIRETAS (REQUISITO 2) */}
        {activeTab === 'calendar' && (
          <CalendarTab
            events={events}
            habits={habits}
            onOpenAdd={() => setShowAddModal(true)}
            onToggleEvent={handleToggleEvent}
          />
        )}

        {/* TAB 5: TELEMETRIA */}
        {activeTab === 'telemetry' && (
          permissions.telemetry === false ? (
            <div className="card-native" style={{ textAlign: 'center', padding: '40px 16px' }}>
              <Lock size={36} color="var(--accent-rose)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>Telemetria Bloqueada</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                O Administrador desativou o seu acesso aos gráficos comparativos.
              </p>
            </div>
          ) : (
            <TelemetryTab
              habits={habits}
              health={health}
              heatmapData={[]}
            />
          )
        )}

        {/* TAB 6: SOCIAL */}
        {activeTab === 'social' && (
          permissions.social === false ? (
            <div className="card-native" style={{ textAlign: 'center', padding: '40px 16px' }}>
              <Lock size={36} color="var(--accent-rose)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>Comunidade Bloqueada</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
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

        {/* TAB 7: PORTAL ADMIN (Requisito 2) */}
        {activeTab === 'admin' && (
          <AdminPortalTab
            onSystemReset={handleSystemReset}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdd={() => setShowAddModal(true)}
        isAdmin={isAdmin}
        userPermissions={permissions}
      />

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
