import React, { useState, useEffect, useRef } from 'react';

import { DesktopSidebar, MobileBottomNav, BrandMark } from './components/Nav';
import { PainelTab } from './components/PainelTab';
import { NotesTab } from './components/NotesTab';
import { HabitsTab } from './components/HabitsTab';
import { BadHabitsTab } from './components/BadHabitsTab';
import { AddModal } from './components/AddModal';
import { WorkoutTab } from './components/WorkoutTab'; // eslint-disable-line no-unused-vars -- módulo antigo preservado
import { TreinoTab } from './components/treino/TreinoTab';
import { EspacosTab } from './components/espacos/EspacosTab';
import { ProEspaco } from './components/espacos/ProEspaco';
import { useProEspaco } from './hooks/useProEspaco';
import { usePendencias } from './hooks/usePendencias';
import { PendenciasBell, PendenciasDrawer } from './components/pendencias/Pendencias';
import { FocusTab } from './components/FocusTab';
import { CalendarTab } from './components/CalendarTab';
import { TelemetryTab } from './components/TelemetryTab';
import { SocialTab } from './components/SocialTab';
import { ProfileTab } from './components/ProfileTab';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { AdminPortalTab } from './components/AdminPortalTab';
import { LoginScreen } from './components/LoginScreen';
import { CategoryConfigModal } from './components/CategoryConfigModal';
import { SupportModal } from './components/SupportModal';

import { INITIAL_TAGS, INITIAL_BADGES } from './data/initialData';
import { Lock, Plus, Bell, X, Users, Play, LifeBuoy } from 'lucide-react';
import { Toast } from './components/Toast';
import { TabErrorBoundary } from './components/TabErrorBoundary';
import { SpringPageTransition } from './components/ui/MotionPrimitives';
import { useUserSync } from './hooks/useUserSync';
import { apiFetch } from './utils/api';
import { oauthErrorMessage, PROVIDER_LABEL, takeOAuthReturn } from './utils/oauthMessages';

export function App() {
  // Volta do login social: a tela de login troca o código pela sessão (mesmo que haja outra sessão salva).
  const isOAuthLoginReturn = typeof window !== 'undefined' && /[?&]auth=ok/.test(window.location.search);

  // Persistência de sessão: restaura o usuário logado ao recarregar a página
  const [user, setUser] = useState(() => {
    if (isOAuthLoginReturn) return null;
    try {
      const saved = localStorage.getItem('ethos_current_user') || sessionStorage.getItem('ethos_current_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao restaurar sessão salva:', e);
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

  // Sincronizar conexões de amigos da rede
  useEffect(() => {
    if (!user?.id) {
      setFriends([]);
      return;
    }
    const loadFriends = async () => {
      try {
        const res = await apiFetch(`/api/user/${user.id}/connections`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.connections)) {
            setFriends(data.connections.map(c => ({
              id: c.friend_id,
              name: c.friend_name,
              avatar: c.friend_avatar,
              bio: c.friend_bio || '',
              username: c.friend_username || c.friend_name.toLowerCase().replace(/\s+/g, ''),
              status: c.status,
              streakDays: c.streak_days || 0,
              points: c.points || 0
            })));
          }
        }
      } catch (_e) {}
    };
    loadFriends();
  }, [user?.id]);

  // Active Navigation Tab (abre direto na aba Calendário ao retornar do Google OAuth)
  // Link de convite de espaço (?convite=CODIGO): abre Espaços com o código preenchido (nada muda sem confirmar).
  const [inviteFromUrl] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('convite') || ''; } catch { return ''; }
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('google_auth=')) return 'calendar';
    if (typeof window !== 'undefined' && window.location.search.includes('convite=')) return 'espacos';
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

  // Avisos da volta do provedor quando já há sessão (ex.: conectar conta pelo Perfil).
  // O login social em si é tratado na tela de login; nenhum token vem mais pela URL.
  useEffect(() => {
    if (!user || isOAuthLoginReturn) return;
    const ret = takeOAuthReturn();
    if (ret.connected) {
      showToast(`${PROVIDER_LABEL[ret.connected] || 'Conta'} conectada.`);
      if (ret.connected === 'spotify') setActiveTab('profile');
    }
    else if (ret.error) showToast(oauthErrorMessage(ret.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  useEffect(() => { document.body.classList.add('rx-body'); }, []);
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

  // Espaços profissionais: perfil da conta (o menu só muda; o servidor confere tudo a cada pedido).
  const { pro: proInfo } = useProEspaco(user);
  // Abrir uma pessoa ou turma a partir de outra tela do espaço (as abas são recriadas a cada troca).
  const [proNav, setProNav] = useState(null);
  const proNavigate = (tab, params = null) => { setProNav(params); setActiveTab(tab); };
  // Pendências dos espaços (convites, avisos) e eventos aceitos, só para leitura na Agenda e no Painel.
  const pend = usePendencias(user);
  const [pendOpen, setPendOpen] = useState(false);
  const [proMode, setProMode] = useState(() => {
    try { return localStorage.getItem('ethos_pro_mode') === '1'; } catch { return false; }
  });
  const toggleProMode = (on) => {
    setProMode(on);
    try { localStorage.setItem('ethos_pro_mode', on ? '1' : '0'); } catch { /* sem armazenamento */ }
    setActiveTab(on ? 'pro-visao' : 'dashboard');
  };
  useEffect(() => {
    // Telas do espaço só existem com perfil ativo e no contexto "Meu espaço".
    if (proInfo === undefined) return; // ainda carregando
    if (String(activeTab).startsWith('pro-') && !(proMode && proInfo?.status === 'ativo')) setActiveTab('dashboard');
  }, [activeTab, proMode, proInfo]);

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

  const TAB_TITLES = { espacos: 'Espaços', 'pro-visao': 'Meu espaço', 'pro-turmas': 'Turmas e convites', 'pro-pessoas': proInfo?.peopleLabel || 'Pessoas', 'pro-conteudo': proInfo?.model === 'nutri' ? 'Planos alimentares' : 'Fichas e programas', 'pro-agenda': 'Agenda e avisos', dashboard: 'Painel principal', habits: 'Hábitos e rotinas', calendar: 'Agenda semanal', workouts: 'Treino', focus: 'Foco', bad_habits: 'Maus hábitos', notes: 'Notas', telemetry: 'Análise de progresso', social: 'Comunidade', profile: 'Perfil' };
  const isAdmin = user?.role === 'admin';
  const permissions = user?.permissions || { focus: true, workouts: true, telemetry: true, social: true, habits: true };
  const firstName = user?.name ? user.name.split(' ')[0] : 'Dilan';

  // Redireciona usuários não-administradores se tentarem acessar a aba admin
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin]);

  // REQUISITO 5: SE NÃO ESTIVER LOGADO, MOSTRA A TELA DE LOGIN OBRIGATÓRIA
  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

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
    <div className="rx-root">
      <div key={`boot-${bootKey}`} className="rx-app">
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
          pro={proInfo}
          proMode={proMode}
          onToggleProMode={toggleProMode}
        />

        <div className="rx-col">
          <header className="rx-top">
            <button type="button" className="rx-mbrand" onClick={() => setActiveTab('dashboard')} aria-label="Ethos, ir para o painel">
              <BrandMark size={26} id="rxBrandTop" />
              <span>ethos</span>
            </button>
            <h1 className="rx-top-title">{TAB_TITLES[activeTab] || 'Ethos'}</h1>
            <span className="rx-spacer" />
            <PendenciasBell total={pend.data.total} onOpen={() => { setPendOpen(true); pend.refresh(); }} />
            <button type="button" className="rx-icon-btn" onClick={() => setShowSupportModal(true)} title="Suporte" aria-label="Abrir suporte">
              <LifeBuoy size={19} />
            </button>
            <button type="button" className="rx-btn new" onClick={() => handleOpenAdd(activeTab === 'habits' ? 'habit' : 'event')}>
              <Plus size={18} strokeWidth={2.4} />
              <span>Novo</span>
            </button>
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
          <main className="rx-main">
            <TabErrorBoundary key={activeTab}>
            <SpringPageTransition activeKey={activeTab}>
            {/* TAB 1: DASHBOARD (PAINEL PRINCIPAL FIEL AO MOCKUP) */}
            {activeTab === 'dashboard' && (
              <PainelTab
                spaceEvents={pend.spaceEvents}
                pendencias={pend.data.total}
                onOpenPendencias={() => { setPendOpen(true); pend.refresh(); }}
                habits={habits}
                setHabits={setHabits}
                events={events}
                workouts={workouts}
                health={health}
                setHealth={setHealth}
                tags={tags}
                user={user}
                onOpenAdd={() => handleOpenAdd('habit')}
                onSwitchTab={setActiveTab}
                onToggleEvent={handleToggleEvent}
                onLogSubclassEffort={handleLogSubclassEffort}
                showToast={showToast}
              />
            )}

            {/* TAB: HÁBITOS & ROTINAS (ABA DEDICADA EXCLUSIVAMENTE A HÁBITOS) */}
            {activeTab === 'habits' && (
              <div className="rx-sheet-legacy"><HabitsTab
                habits={habits}
                setHabits={setHabits}
                tags={tags}
                user={user}
                onOpenAddHabit={() => handleOpenAdd('habit')}
                onLogSubclassEffort={handleLogSubclassEffort}
                showToast={showToast}
              /></div>
            )}

            {/* TAB: MAUS HÁBITOS & VÍCIOS (SUPERAÇÃO, SOBRIEDADE E DESEMPENHO) */}
            {activeTab === 'bad_habits' && (
              <div className="rx-sheet-legacy"><BadHabitsTab
                user={user}
                showToast={showToast}
              /></div>
            )}

            {/* TAB 4: CALENDÁRIO / AGENDA MENSAL, SEMANAL E DIÁRIA */}
            {activeTab === 'calendar' && (
              <div className="rx-sheet-legacy"><CalendarTab
                events={events}
                spaceEvents={pend.spaceEvents}
                setEvents={setEvents}
                habits={habits}
                setHabits={setHabits}
                workouts={workouts}
                tags={tags}
                friends={friends}
                onOpenAdd={() => setShowAddModal(true)}
                onToggleEvent={handleToggleEvent}
                onAddEvent={handleAddEvent}
                onDeleteEvent={handleDeleteEvent}
                onSwitchTab={setActiveTab}
                showToast={showToast}
              /></div>
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
                // Treino redesenhado (proposta 05, aprovada em 18/11/2026). O WorkoutTab antigo continua no código.
                <TreinoTab
                  workouts={workouts}
                  setWorkouts={setWorkouts}
                  onCompleteWorkout={handleCompleteWorkout}
                  showToast={showToast}
                  user={user}
                />
              )
            )}

            {/* TAB: PERFIL DO USUÁRIO (XP, POST-ITS, MÚSICA, PLAYLISTS, STREAKS E BIO) */}
            {activeTab === 'profile' && (
              <div className="rx-sheet-legacy"><ProfileTab
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
                onLogout={handleLogout}
              /></div>
            )}

            {activeTab === 'espacos' && <EspacosTab showToast={showToast} initialCode={inviteFromUrl} />}
            {proMode && proInfo?.status === 'ativo' && ['pro-visao', 'pro-turmas', 'pro-pessoas', 'pro-conteudo', 'pro-agenda'].includes(activeTab) && (
              <ProEspaco view={activeTab} pro={proInfo} onNavigate={proNavigate} navParams={proNav} showToast={showToast} />
            )}

            {activeTab === 'notes' && (
              <div className="rx-sheet-legacy"><NotesTab user={user} setUser={setUser} showToast={showToast} /></div>
            )}

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

            {/* DEMAIS ABAS (COM CONTAINER ESCURO ELEGANTE PARA PRESERVAR CONTRASTE DOS COMPONENTES INTERNOS) */}
            {activeTab !== 'dashboard' && activeTab !== 'notes' && activeTab !== 'focus' && activeTab !== 'calendar' && activeTab !== 'workouts' && activeTab !== 'habits' && activeTab !== 'bad_habits' && activeTab !== 'profile' && activeTab !== 'admin' && activeTab !== 'espacos' && !String(activeTab).startsWith('pro-') && (
              <div className="rx-sheet-dark">
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

      {/* MOBILE BOTTOM NAVIGATION */}
      {activeTab !== 'admin' && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAdd={() => handleOpenAdd(activeTab === 'habits' ? 'habit' : 'event')}
          isAdmin={isAdmin}
          userPermissions={permissions}
          user={user}
          onOpenSupport={() => setShowSupportModal(true)}
          onOpenAuth={() => setShowAuthModal(true)}
          onLogout={handleLogout}
          pro={proInfo}
          proMode={proMode}
          onToggleProMode={toggleProMode}
        />
      )}

      <PendenciasDrawer open={pendOpen} onClose={() => setPendOpen(false)} data={pend.data} onChanged={pend.refresh} toast={showToast} />

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
        friends={friends}
        onAddTag={handleAddTag}
        onCreateCategory={() => { setShowAddModal(false); handleOpenCreateCategory(); }}
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
