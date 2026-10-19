import React, { useState, useEffect } from 'react';
import { 
  getStorageData, 
  setStorageData, 
  initStorage, 
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

import {
  INITIAL_USER,
  INITIAL_TAGS,
  INITIAL_HABITS,
  INITIAL_HEALTH,
  INITIAL_WORKOUTS,
  INITIAL_BADGES,
  INITIAL_FRIENDS,
  INITIAL_FEED,
  INITIAL_HEATMAP
} from './data/initialData';

export function App() {
  // Initialize storage once
  useEffect(() => {
    initStorage();
  }, []);

  // Application States persisted in LocalStorage
  const [user, setUser] = useState(() => getStorageData(STORAGE_KEYS.USER, INITIAL_USER));
  const [allUsers, setAllUsers] = useState(() => getStorageData(STORAGE_KEYS.AUTH_USERS, [INITIAL_USER]));
  const [tags, setTags] = useState(() => getStorageData(STORAGE_KEYS.TAGS, INITIAL_TAGS));
  const [habits, setHabits] = useState(() => getStorageData(STORAGE_KEYS.HABITS, INITIAL_HABITS));
  const [health, setHealth] = useState(() => getStorageData(STORAGE_KEYS.HEALTH, INITIAL_HEALTH));
  const [workouts, setWorkouts] = useState(() => getStorageData(STORAGE_KEYS.WORKOUTS, INITIAL_WORKOUTS));
  const [badges, setBadges] = useState(() => getStorageData(STORAGE_KEYS.BADGES, INITIAL_BADGES));
  const [friends, setFriends] = useState(() => getStorageData(STORAGE_KEYS.FRIENDS, INITIAL_FRIENDS));
  const [feed, setFeed] = useState(() => getStorageData(STORAGE_KEYS.FEED, INITIAL_FEED));
  const [heatmap, setHeatmap] = useState(() => getStorageData(STORAGE_KEYS.HEATMAP, INITIAL_HEATMAP));
  const [events, setEvents] = useState([]);

  // Active Navigation Tab
  // 'dashboard' | 'workouts' | 'focus' | 'calendar' | 'telemetry' | 'social'
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
    setStorageData(STORAGE_KEYS.AUTH_USERS, allUsers);
  }, [allUsers]);

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
    setStorageData(STORAGE_KEYS.BADGES, badges);
  }, [badges]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.FRIENDS, friends);
  }, [friends]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.FEED, feed);
  }, [feed]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.HEATMAP, heatmap);
  }, [heatmap]);

  // Handler: Add new Habit (US01, US19, US20, US39)
  const handleAddHabit = (newHabit) => {
    setHabits(prev => [newHabit, ...prev]);
  };

  // Handler: Add new Event
  const handleAddEvent = (newEvent) => {
    setEvents(prev => [newEvent, ...prev]);
  };

  // Handler: Complete Workout (US11)
  const handleCompleteWorkout = (workoutName) => {
    // Add workout completion event to feed (US14)
    if (user.isPublic) {
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

    // Update streak / points
    setUser(prev => ({
      ...prev,
      points: prev.points + 50
    }));

    alert(`Parabéns! O treino "${workoutName}" foi finalizado e registrado na sua telemetria e no feed social!`);
  };

  // Handler: Focus Completed (US05, US06, US25)
  const handleFocusComplete = (sessionInfo) => {
    // Publish to feed if user is public (US14)
    if (user.isPublic) {
      const feedItem = {
        id: `feed_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        type: 'focus_completed',
        title: 'Sessão de Foco Pomodoro Concluída',
        details: `${sessionInfo.durationMins} min focados em "${sessionInfo.subject}" com regra anti-fraude respeitada!`,
        timestamp: 'Agora mesmo',
        reactions: { like: 2, fire: 4, trophy: 2 },
        userReacted: 'trophy'
      };
      setFeed(prev => [feedItem, ...prev]);
    }

    // Award points
    setUser(prev => ({
      ...prev,
      points: prev.points + sessionInfo.durationMins * 2
    }));
  };

  // Handler: Login Success (US35)
  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  return (
    <div className="app-container">
      {/* DESKTOP SIDEBAR */}
      <DesktopSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdd={() => setShowAddModal(true)}
      />

      {/* TOP HEADER */}
      <Header
        user={user}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* MAIN VIEWPORT */}
      <main className="main-content">
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

        {activeTab === 'workouts' && (
          <WorkoutTab
            workouts={workouts}
            setWorkouts={setWorkouts}
            onCompleteWorkout={handleCompleteWorkout}
          />
        )}

        {activeTab === 'focus' && (
          <FocusTab
            user={user}
            onFocusComplete={handleFocusComplete}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
            heatmapData={heatmap}
            habits={habits}
            events={events}
          />
        )}

        {activeTab === 'telemetry' && (
          <TelemetryTab
            habits={habits}
            health={health}
            heatmapData={heatmap}
          />
        )}

        {activeTab === 'social' && (
          <SocialTab
            user={user}
            badges={badges}
            friends={friends}
            setFriends={setFriends}
            feed={feed}
            setFeed={setFeed}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdd={() => setShowAddModal(true)}
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
        allUsers={allUsers}
        setAllUsers={setAllUsers}
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
