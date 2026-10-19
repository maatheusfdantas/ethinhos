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

import { INITIAL_TAGS, INITIAL_WORKOUTS, INITIAL_BADGES } from './data/initialData';
import { Lock } from 'lucide-react';

// Default Admin user (Requisito 2: login admin, senha Foguete não tem ré)
const DEFAULT_ADMIN = {
  id: 'usr_admin',
  username: 'admin',
  email: 'admin@ethos.dev',
  name: 'Administrador Ethos',
  avatar: 'AD',
  role: 'admin',
  is_active: true,
  subscription_tier: 'Enterprise / Fundador',
  is_public: true,
  permissions: { focus: true, workouts: true, telemetry: true, social: true, habits: true },
  streak_days: 0,
  points: 500
};

// Clean zeroed initial health (Requisito 5: Zerado para verificar funcionamento)
const ZERO_HEALTH = {
  waterGlasses: 0,
  waterTarget: 10,
  waterHistory: [],
  sleep: {
    bedTime: '23:30',
    wakeTime: '07:00',
    targetHours: 8,
    logged: false
  }
};

export function App() {
  // Application States - Starts clean/zeroed per user request
  const [user, setUser] = useState(() => getStorageData(STORAGE_KEYS.USER, DEFAULT_ADMIN));
  const [tags, setTags] = useState(() => getStorageData(STORAGE_KEYS.TAGS, INITIAL_TAGS));
  const [habits, setHabits] = useState(() => getStorageData(STORAGE_KEYS.HABITS, []));
  const [health, setHealth] = useState(() => getStorageData(STORAGE_KEYS.HEALTH, ZERO_HEALTH));
  const [workouts, setWorkouts] = useState(() => getStorageData(STORAGE_KEYS.WORKOUTS, INITIAL_WORKOUTS));
  const [badges, setBadges] = useState(() => getStorageData(STORAGE_KEYS.BADGES, INITIAL_BADGES));
  const [friends, setFriends] = useState(() => getStorageData(STORAGE_KEYS.FRIENDS, []));
  const [feed, setFeed] = useState(() => getStorageData(STORAGE_KEYS.FEED, []));
  const [heatmap, setHeatmap] = useState(() => getStorageData(STORAGE_KEYS.HEATMAP, []));
  const [events, setEvents] = useState([]);

  // Active Navigation Tab: 'dashboard' | 'workouts' | 'focus' | 'calendar' | 'telemetry' | 'social' | 'admin'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    setStorageData(STORAGE_KEYS.USER, user);
  }, [user]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.HABITS, habits);
  }, [habits]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.HEALTH, health);
  }, [health]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
  }, [workouts]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.FRIENDS, friends);
  }, [friends]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.FEED, feed);
  }, [feed]);

  // Handler: Add new Habit (US01, US19, US20, US39)
  const handleAddHabit = async (newHabit) => {
    setHabits(prev => [newHabit, ...prev]);

    // Persist to SQLite DB if connected
    try {
      await fetch(`/api/user/${user.id}/habit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit)
      });
    } catch (e) {
      // offline safe
    }
  };

  // Handler: Add new Event
  const handleAddEvent = (newEvent) => {
    setEvents(prev => [newEvent, ...prev]);
  };

  // Handler: Complete Workout (US11)
  const handleCompleteWorkout = (workoutName) => {
    if (user.isPublic) {
      const feedItem = {
        id: `feed_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        type: 'workout_completed',
        title: 'Treino de Força Finalizado (US11)',
        details: `${workoutName} concluído com disciplina total!`,
        timestamp: 'Agora mesmo',
        reactions: { like: 1, fire: 3, trophy: 2 },
        userReacted: 'fire'
      };
      setFeed(prev => [feedItem, ...prev]);
    }

    setUser(prev => ({
      ...prev,
      points: prev.points + 50
    }));

    alert(`Parabéns! O treino "${workoutName}" foi registrado com sucesso!`);
  };

  // Handler: Focus Completed (US05, US06, US25)
  const handleFocusComplete = (sessionInfo) => {
    if (user.isPublic) {
      const feedItem = {
        id: `feed_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        type: 'focus_completed',
        title: 'Sessão de Foco Pomodoro Concluída',
        details: `${sessionInfo.durationMins} min focados em "${sessionInfo.subject}" com regra anti-fraude!`,
        timestamp: 'Agora mesmo',
        reactions: { like: 2, fire: 4, trophy: 2 },
        userReacted: 'trophy'
      };
      setFeed(prev => [feedItem, ...prev]);
    }

    setUser(prev => ({
      ...prev,
      points: prev.points + sessionInfo.durationMins * 2
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

  // Requisito 5: Zerar o Sistema Completamente
  const handleSystemReset = () => {
    setHabits([]);
    setHealth(ZERO_HEALTH);
    setFeed([]);
    setFriends([]);
    setHeatmap([]);
    setEvents([]);
    localStorage.removeItem(STORAGE_KEYS.HABITS);
    localStorage.removeItem(STORAGE_KEYS.HEALTH);
    localStorage.removeItem(STORAGE_KEYS.FEED);
    localStorage.removeItem(STORAGE_KEYS.FRIENDS);
    localStorage.removeItem(STORAGE_KEYS.HEATMAP);
  };

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
            health={health}
            setHealth={setHealth}
            tags={tags}
            onOpenAdd={() => setShowAddModal(true)}
            onOpenWorkout={() => setActiveTab('workouts')}
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

        {/* TAB 4: CALENDÁRIO */}
        {activeTab === 'calendar' && (
          <CalendarTab
            heatmapData={heatmap}
            habits={habits}
            events={events}
          />
        )}

        {/* TAB 5: TELEMETRIA */}
        {activeTab === 'telemetry' && (
          permissions.telemetry === false ? (
            <div className="card-native" style={{ textAlign: 'center', padding: '40px 16px' }}>
              <Lock size={36} color="var(--accent-rose)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>Telemetria Bloqueada</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                O Administrador desativou o seu acesso aos gráficos e métricas comparativas.
              </p>
            </div>
          ) : (
            <TelemetryTab
              habits={habits}
              health={health}
              heatmapData={heatmap}
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
                O Administrador desativou o seu acesso ao Feed Social e Amizades.
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
      />
    </div>
  );
}

export default App;
