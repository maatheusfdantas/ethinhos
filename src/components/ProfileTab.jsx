import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Camera, 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Heart, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Flame, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Copy, 
  Check, 
  Sparkles, 
  Edit3, 
  SlidersHorizontal,
  X,
  Disc,
  Dumbbell,
  Timer,
  Zap,
  StickyNote,
  Pin,
  HelpCircle,
  Trophy
} from 'lucide-react';

const POSTIT_COLORS = [
  { id: 'yellow', name: 'Amarelo Clássico', bg: '#FEF08A', border: '#FDE047', text: '#713F12', pin: '#CA8A04' },
  { id: 'pink', name: 'Rosa Pastel', bg: '#FBCFE8', border: '#F9A8D4', text: '#831843', pin: '#DB2777' },
  { id: 'blue', name: 'Azul Céu', bg: '#BAE6FD', border: '#7DD3FC', text: '#0C4A6E', pin: '#0284C7' },
  { id: 'green', name: 'Verde Menta', bg: '#BBF7D0', border: '#86EFAC', text: '#14532D', pin: '#16A34A' },
  { id: 'purple', name: 'Lavanda Criativa', bg: '#DDD6FE', border: '#C4B5FD', text: '#4C1D95', pin: '#7C3AED' },
  { id: 'orange', name: 'Pêssego Solar', bg: '#FED7AA', border: '#FDBA74', text: '#7C2D12', pin: '#EA580C' }
];

const PRESET_TRACKS = [
  { title: 'Starboy', artist: 'The Weeknd, Daft Punk', album: 'Starboy', duration: 230, gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #3B82F6 100%)' },
  { title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", duration: 243, gradient: 'linear-gradient(135deg, #6366F1 0%, #0EA5E9 50%, #10B981 100%)' },
  { title: 'Veridis Quo', artist: 'Daft Punk', album: 'Discovery', duration: 345, gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #8B5CF6 100%)' },
  { title: 'After Dark', artist: 'Mr.Kitty', album: 'Time', duration: 259, gradient: 'linear-gradient(135deg, #1E293B 0%, #7C3AED 50%, #EC4899 100%)' }
];

function getLevelTitle(level) {
  if (level <= 2) return 'Iniciante Consciente';
  if (level <= 4) return 'Praticante Consistente';
  if (level <= 7) return 'Estrategista da Rotina';
  if (level <= 11) return 'Arquiteto de Performance';
  return 'Mestre do Ethos';
}

export function ProfileTab({ 
  user, 
  setUser, 
  habits = [], 
  workouts = [], 
  badges = [], 
  friends = [], 
  showToast,
  onOpenSettings,
  onOpenSupport
}) {
  const firstName = user?.name ? user.name.split(' ')[0] : 'Usuário';
  const fileInputRef = useRef(null);

  // -------------------------------------------------------------------------
  // 1. ESTADOS DE BIO (LIMITE DE 150 CARACTERES - ESTILO INSTAGRAM / TIKTOK)
  // -------------------------------------------------------------------------
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(user?.bio || '');
  const [copiedHandle, setCopiedHandle] = useState(false);

  useEffect(() => {
    if (user?.bio !== undefined) {
      setBioText(user.bio || '');
    } else {
      try {
        const localBio = localStorage.getItem(`ethos_user_bio_${user?.id || 'default'}`);
        if (localBio) setBioText(localBio);
      } catch (_e) {}
    }
  }, [user?.bio, user?.id]);

  const handleSaveBio = async () => {
    const trimmed = bioText.slice(0, 150);
    const updatedUser = { ...user, bio: trimmed };
    setUser?.(updatedUser);
    setIsEditingBio(false);

    try {
      localStorage.setItem(`ethos_user_bio_${user?.id || 'default'}`, trimmed);
      if (user?.id) {
        await fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: trimmed })
        });
      }
      showToast?.('Bio do perfil atualizada!');
    } catch (_e) {
      showToast?.('Bio salva localmente.');
    }
  };

  // -------------------------------------------------------------------------
  // 2. ALTERAÇÃO DE FOTO DE PERFIL (ÚNICO CAMPO DE FOTO PERMITIDO)
  // -------------------------------------------------------------------------
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast?.('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (!dataUrl) return;

      const updatedUser = { ...user, avatar: dataUrl };
      setUser?.(updatedUser);

      try {
        localStorage.setItem(`ethos_user_avatar_${user?.id || 'default'}`, dataUrl);
        if (user?.id) {
          await fetch(`/api/user/${user.id}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: dataUrl })
          });
        }
        showToast?.('Foto de perfil atualizada com sucesso!');
      } catch (_e) {
        showToast?.('Foto salva localmente.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyHandle = () => {
    const handle = `@${user?.username || 'usuario'}`;
    navigator.clipboard?.writeText?.(handle);
    setCopiedHandle(true);
    showToast?.(`Handle ${handle} copiado para a área de transferência!`);
    setTimeout(() => setCopiedHandle(false), 2200);
  };

  // -------------------------------------------------------------------------
  // 3. WIDGET DE MÚSICA (ÚLTIMA ESCUTADA / OUVINDO AGORA + PERSONALIZAÇÃO)
  // -------------------------------------------------------------------------
  const [trackIndex, setTrackIndex] = useState(0);
  const [customTrack, setCustomTrack] = useState(() => {
    try {
      const saved = localStorage.getItem(`ethos_music_track_${user?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return null;
  });
  const [showEditTrackModal, setShowEditTrackModal] = useState(false);
  const [editTrackTitle, setEditTrackTitle] = useState('');
  const [editTrackArtist, setEditTrackArtist] = useState('');
  const [editTrackAlbum, setEditTrackAlbum] = useState('');

  const activeTrack = customTrack || null;
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isLikedSong, setIsLikedSong] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const musicDuration = activeTrack?.duration || 215;

  useEffect(() => {
    let timer;
    if (isPlayingMusic && activeTrack) {
      timer = setInterval(() => {
        setMusicProgress(prev => (prev >= musicDuration ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingMusic, musicDuration, activeTrack]);

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleNextTrack = () => {
    const nextIdx = (trackIndex + 1) % PRESET_TRACKS.length;
    setTrackIndex(nextIdx);
    setCustomTrack(PRESET_TRACKS[nextIdx]);
    setMusicProgress(0);
  };

  const handlePrevTrack = () => {
    const prevIdx = (trackIndex - 1 + PRESET_TRACKS.length) % PRESET_TRACKS.length;
    setTrackIndex(prevIdx);
    setCustomTrack(PRESET_TRACKS[prevIdx]);
    setMusicProgress(0);
  };

  const handleSaveCustomTrack = (e) => {
    e.preventDefault();
    if (!editTrackTitle.trim() || !editTrackArtist.trim()) return;
    const nextTrack = {
      title: editTrackTitle.trim(),
      artist: editTrackArtist.trim(),
      album: editTrackAlbum.trim() || 'Single',
      duration: 215,
      gradient: 'linear-gradient(135deg, #1DB954 0%, #0EA5E9 50%, #6366F1 100%)'
    };
    setCustomTrack(nextTrack);
    setMusicProgress(42);
    setShowEditTrackModal(false);
    try {
      localStorage.setItem(`ethos_music_track_${user?.id || 'default'}`, JSON.stringify(nextTrack));
    } catch (_e) {}
    showToast?.('Música do perfil atualizada!');
  };

  // -------------------------------------------------------------------------
  // 4. FEED DE PLAYLISTS DO USUÁRIO
  // -------------------------------------------------------------------------
  const [playlists, setPlaylists] = useState(() => {
    try {
      if (Array.isArray(user?.playlists) && user.playlists.length > 0) {
        return user.playlists;
      }
      const saved = localStorage.getItem(`ethos_playlists_${user?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return [];
  });

  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistPlatform, setNewPlaylistPlatform] = useState('spotify');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  const handleSavePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim() || !newPlaylistUrl.trim()) return;

    const accent = newPlaylistPlatform === 'spotify' 
      ? '#1DB954' 
      : newPlaylistPlatform === 'youtube' 
      ? '#FF0000' 
      : newPlaylistPlatform === 'apple' 
      ? '#FC3C44' 
      : '#8B5CF6';

    const newItem = {
      id: `pl_${Date.now()}`,
      title: newPlaylistTitle.trim(),
      url: newPlaylistUrl.trim(),
      platform: newPlaylistPlatform,
      description: newPlaylistDesc.trim() || 'Playlist compartilhada do meu dia a dia',
      accentColor: accent
    };

    const nextList = [newItem, ...playlists];
    setPlaylists(nextList);
    setShowAddPlaylistModal(false);
    setNewPlaylistTitle('');
    setNewPlaylistUrl('');
    setNewPlaylistDesc('');

    try {
      localStorage.setItem(`ethos_playlists_${user?.id || 'default'}`, JSON.stringify(nextList));
      if (user?.id) {
        await fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlists: nextList })
        });
      }
      showToast?.('Playlist adicionada ao seu perfil! (+15 XP)');
    } catch (_e) {
      showToast?.('Playlist salva localmente.');
    }
  };

  const handleDeletePlaylist = async (plId) => {
    const nextList = playlists.filter(p => p.id !== plId);
    setPlaylists(nextList);
    try {
      localStorage.setItem(`ethos_playlists_${user?.id || 'default'}`, JSON.stringify(nextList));
      if (user?.id) {
        await fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlists: nextList })
        });
      }
      showToast?.('Playlist removida.');
    } catch (_e) {}
  };

  // -------------------------------------------------------------------------
  // 5. NOTAS EM POST-IT NO PERFIL DO USUÁRIO
  // -------------------------------------------------------------------------
  const [postIts, setPostIts] = useState(() => {
    try {
      const saved = localStorage.getItem(`ethos_postits_${user?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return [];
  });

  const [showPostItModal, setShowPostItModal] = useState(false);
  const [editingPostItId, setEditingPostItId] = useState(null);
  const [postItTitle, setPostItTitle] = useState('');
  const [postItContent, setPostItContent] = useState('');
  const [postItColorId, setPostItColorId] = useState('yellow');
  const [postItPinned, setPostItPinned] = useState(false);

  const persistPostIts = (nextNotes) => {
    setPostIts(nextNotes);
    try {
      localStorage.setItem(`ethos_postits_${user?.id || 'default'}`, JSON.stringify(nextNotes));
    } catch (_e) {}
  };

  const handleOpenNewPostIt = () => {
    setEditingPostItId(null);
    setPostItTitle('');
    setPostItContent('');
    setPostItColorId('yellow');
    setPostItPinned(false);
    setShowPostItModal(true);
  };

  const handleOpenEditPostIt = (note) => {
    setEditingPostItId(note.id);
    setPostItTitle(note.title || '');
    setPostItContent(note.content || '');
    setPostItColorId(note.colorId || 'yellow');
    setPostItPinned(Boolean(note.pinned));
    setShowPostItModal(true);
  };

  const handleSavePostIt = (e) => {
    e.preventDefault();
    if (!postItContent.trim()) return;

    if (editingPostItId) {
      const updated = postIts.map((item) =>
        item.id === editingPostItId
          ? {
              ...item,
              title: postItTitle.trim() || 'Nota Rápida',
              content: postItContent.trim().slice(0, 280),
              colorId: postItColorId,
              pinned: postItPinned
            }
          : item
      );
      persistPostIts(updated);
      showToast?.('Post-it atualizado!');
    } else {
      const newNote = {
        id: `pi_${Date.now()}`,
        title: postItTitle.trim() || 'Nota Rápida',
        content: postItContent.trim().slice(0, 280),
        colorId: postItColorId,
        pinned: postItPinned,
        createdAt: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      };
      persistPostIts([newNote, ...postIts]);
      showToast?.('Novo Post-it colado no mural! (+10 XP)');
    }
    setShowPostItModal(false);
  };

  const handleTogglePinPostIt = (id) => {
    const updated = postIts.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    persistPostIts(updated);
  };

  const handleDeletePostIt = (id) => {
    const updated = postIts.filter((n) => n.id !== id);
    persistPostIts(updated);
    showToast?.('Post-it removido do mural.');
  };

  const sortedPostIts = [...postIts].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // -------------------------------------------------------------------------
  // 6. SISTEMA DE NÍVEL DE XP DO USUÁRIO
  // -------------------------------------------------------------------------
  const [bonusXp, setBonusXp] = useState(() => {
    try {
      return Number(localStorage.getItem(`ethos_bonus_xp_${user?.id || 'default'}`)) || 0;
    } catch (_e) {
      return 0;
    }
  });
  const [dailyClaimed, setDailyClaimed] = useState(() => {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      return localStorage.getItem(`ethos_daily_xp_claimed_${user?.id || 'default'}`) === todayKey;
    } catch (_e) {
      return false;
    }
  });

  const completedHabitsCount = habits.filter(h => h.completed).length;
  const habitCompletionRate = habits.length > 0 ? Math.round((completedHabitsCount / habits.length) * 100) : 0;
  const userStreak = user?.streak_days || 0;

  // Cálculo transparente e acumulativo de XP
  const baseUserPoints = Number(user?.points) || 0;
  const habitsXp = completedHabitsCount * 25 + habits.length * 10;
  const streakXp = userStreak * 15;
  const workoutsXp = workouts.reduce((acc, w) => acc + (w.exercises?.length || 0) * 20, 0);
  const postItsXp = postIts.length * 10;
  const playlistsXp = playlists.length * 15;

  const totalXp = baseUserPoints + habitsXp + streakXp + workoutsXp + postItsXp + playlistsXp + bonusXp;
  const xpPerLevel = 300;
  const currentLevel = Math.max(1, Math.floor(totalXp / xpPerLevel) + 1);
  const currentLevelProgressXp = totalXp % xpPerLevel;
  const xpProgressPercent = Math.min(100, Math.round((currentLevelProgressXp / xpPerLevel) * 100));
  const levelTitle = getLevelTitle(currentLevel);

  const handleClaimDailyXp = () => {
    if (dailyClaimed) return;
    const nextBonus = bonusXp + 50;
    setBonusXp(nextBonus);
    setDailyClaimed(true);
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`ethos_bonus_xp_${user?.id || 'default'}`, String(nextBonus));
      localStorage.setItem(`ethos_daily_xp_claimed_${user?.id || 'default'}`, todayKey);
    } catch (_e) {}
    showToast?.('🎉 +50 XP de Check-in Diário resgatados!');
  };

  // -------------------------------------------------------------------------
  // 7. MÉTRICAS COMPARTILHADAS COM OS AMIGOS
  // -------------------------------------------------------------------------
  const [sharedConfig, setSharedConfig] = useState(() => {
    try {
      if (user?.sharedMetrics && Object.keys(user.sharedMetrics).length > 0) {
        return user.sharedMetrics;
      }
      const saved = localStorage.getItem(`ethos_shared_metrics_${user?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return {
      shareStreaks: false,
      shareWorkoutStreak: false,
      shareFocusHours: false,
      shareSobrietyDays: false,
      selectedHabitIds: []
    };
  });

  const [showMetricsConfigModal, setShowMetricsConfigModal] = useState(false);

  const handleToggleSharedMetric = async (key) => {
    const nextConfig = { ...sharedConfig, [key]: !sharedConfig[key] };
    setSharedConfig(nextConfig);
    try {
      localStorage.setItem(`ethos_shared_metrics_${user?.id || 'default'}`, JSON.stringify(nextConfig));
      if (user?.id) {
        await fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sharedMetrics: nextConfig })
        });
      }
      showToast?.('Configuração de compartilhamento atualizada!');
    } catch (_e) {}
  };

  const handleTogglePinnedHabit = (habitId) => {
    const currentIds = Array.isArray(sharedConfig.selectedHabitIds) ? sharedConfig.selectedHabitIds : [];
    const nextIds = currentIds.includes(habitId)
      ? currentIds.filter((id) => id !== habitId)
      : [...currentIds, habitId];
    const nextConfig = { ...sharedConfig, selectedHabitIds: nextIds };
    setSharedConfig(nextConfig);
    try {
      localStorage.setItem(`ethos_shared_metrics_${user?.id || 'default'}`, JSON.stringify(nextConfig));
    } catch (_e) {}
  };

  const pinnedHabitsList = habits.filter((h) =>
    Array.isArray(sharedConfig.selectedHabitIds) && sharedConfig.selectedHabitIds.length > 0
      ? sharedConfig.selectedHabitIds.includes(h.id)
      : true
  ).slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>

      {/* =====================================================================
          1. CARD HERO: IDENTIDADE, NÍVEL DE XP & BIO (LIMITE 150 CARACTERES)
         ===================================================================== */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.86) 0%, rgba(245, 247, 252, 0.92) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '30px',
          padding: '28px 24px',
          boxShadow: '0 12px 35px rgba(33, 31, 56, 0.08)',
          border: '1.5px solid rgba(255, 255, 255, 0.9)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Input Oculto de Foto de Perfil (Único campo de foto permitido no sistema) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarFileChange}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
          
          {/* Lado Esquerdo: Avatar + Dados Pessoais + Barra de XP */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap', flex: 1 }}>
            
            {/* Foto de Perfil com Botão de Alteração */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '26px',
                  backgroundColor: '#211F38',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '24px',
                  boxShadow: '0 10px 28px rgba(33, 31, 56, 0.28)',
                  overflow: 'hidden',
                  border: '3px solid #FFFFFF'
                }}
              >
                {user?.avatar && user.avatar.startsWith('data:') ? (
                  <img src={user.avatar} alt="Foto de Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{user?.avatar || (firstName ? firstName.slice(0, 2).toUpperCase() : 'US')}</span>
                )}
              </div>

              {/* Badge de Nível de XP no Avatar */}
              <div
                style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '-6px',
                  backgroundColor: '#F59E0B',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '2px 7px',
                  borderRadius: '999px',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 4px 10px rgba(245, 158, 11, 0.4)'
                }}
                title={`Nível ${currentLevel} • ${totalXp} XP Total`}
              >
                NV. {currentLevel}
              </div>

              {/* Botão de Câmera para Enviar Foto de Perfil */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Alterar Foto de Perfil (Único campo de foto permitido)"
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.45)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <Camera size={14} />
              </button>
            </div>

            {/* Informações de Nome, @Handle, XP e Bio */}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1B2F', margin: 0, letterSpacing: '-0.02em' }}>
                  {user?.name || firstName}
                </h2>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  <Zap size={11} fill="#FFFFFF" />
                  <span>Nível {currentLevel} • {levelTitle}</span>
                </span>
              </div>

              {/* @Handle com Cópia de 1 clique */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyHandle}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(203, 213, 225, 0.8)',
                    borderRadius: '999px',
                    padding: '3px 10px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#4F46E5',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                  title="Copiar @handle"
                >
                  <span>@{user?.username || 'usuario'}</span>
                  {copiedHandle ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                </button>

                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  • {friends?.length || 0} conexões na rede
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#D97706' }}>
                  • {totalXp.toLocaleString('pt-BR')} XP acumulados
                </span>
              </div>

              {/* DESCRIÇÃO / BIO (LIMITE DE 150 CARACTERES - IGUAL INSTAGRAM & TIKTOK) */}
              <div style={{ maxWidth: '520px' }}>
                {isEditingBio ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value.slice(0, 150))}
                        placeholder="Escreva sua descrição de perfil (limite de 150 caracteres igual ao Instagram/TikTok)..."
                        rows={2}
                        maxLength={150}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1.5px solid #6366F1',
                          fontSize: '13px',
                          color: '#1A1B2F',
                          outline: 'none',
                          boxSizing: 'border-box',
                          backgroundColor: '#FFFFFF',
                          lineHeight: 1.4,
                          resize: 'none'
                        }}
                      />
                    </div>

                    {/* Contador ao vivo de 150 caracteres */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: bioText.length >= 140 ? '#E11D48' : '#64748B', fontWeight: 700 }}>
                        {bioText.length} / 150 caracteres (limite Instagram & TikTok)
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setBioText(user?.bio || '');
                            setIsEditingBio(false);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: '#F1F5F9',
                            color: '#475569',
                            border: 'none',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBio}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '8px',
                            background: '#4F46E5',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Salvar Bio
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: bioText ? '#334155' : '#94A3B8', fontStyle: bioText ? 'normal' : 'italic', lineHeight: 1.45 }}>
                      {bioText || 'Adicione uma descrição curta sobre sua rotina e metas (máx. 150 caracteres)...'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(true)}
                      title="Editar Descrição (Bio)"
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#4F46E5',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}
                    >
                      <Edit3 size={12} />
                      <span>Editar Bio</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas & Suporte */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {onOpenSupport && (
                <button
                  type="button"
                  onClick={onOpenSupport}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#211F38',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(33, 31, 56, 0.2)'
                  }}
                >
                  <HelpCircle size={13} color="#38BDF8" />
                  <span>Abrir Ticket de Suporte</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    color: '#1E293B',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  <SlidersHorizontal size={13} />
                  <span>Preferências da Conta</span>
                </button>
              )}
            </div>

            <div
              style={{
                padding: '9px 13px',
                borderRadius: '14px',
                backgroundColor: 'rgba(79, 70, 229, 0.06)',
                border: '1px dashed rgba(79, 70, 229, 0.25)',
                fontSize: '11px',
                color: '#4338CA',
                maxWidth: '280px',
                lineHeight: 1.35
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, marginBottom: '2px' }}>
                <Sparkles size={12} />
                <span>Perfil Focado em Evolução</span>
              </div>
              <span>Sem grade de fotos: apenas sua foto de perfil, músicas, métricas e post-its ficam visíveis.</span>
            </div>
          </div>
        </div>

        {/* BARRA DE PROGRESSÃO DE NÍVEL DE XP INTEGRADA */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(203, 213, 225, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={14} color="#F59E0B" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#1A1B2F' }}>
                  Progresso de XP — Nível {currentLevel} para Nível {currentLevel + 1}
                </span>
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5' }}>
                {currentLevelProgressXp} / {xpPerLevel} XP ({xpProgressPercent}%)
              </span>
            </div>

            <div style={{ width: '100%', height: '9px', backgroundColor: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${xpProgressPercent}%`,
                  background: 'linear-gradient(90deg, #4F46E5 0%, #8B5CF6 50%, #EC4899 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px', fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
              <span>⚡ Hábito concluído: <strong>+25 XP</strong></span>
              <span>🔥 Dia de Streak: <strong>+15 XP</strong></span>
              <span>🏋️ Exercício na ficha: <strong>+20 XP</strong></span>
              <span>📌 Nota Post-it: <strong>+10 XP</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClaimDailyXp}
            disabled={dailyClaimed}
            style={{
              padding: '9px 16px',
              borderRadius: '14px',
              border: 'none',
              background: dailyClaimed ? '#E2E8F0' : 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
              color: dailyClaimed ? '#64748B' : '#FFFFFF',
              fontSize: '12px',
              fontWeight: 800,
              cursor: dailyClaimed ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: dailyClaimed ? 'none' : '0 6px 16px rgba(234, 88, 12, 0.3)'
            }}
          >
            <Zap size={14} fill={dailyClaimed ? 'none' : '#FFFFFF'} />
            <span>{dailyClaimed ? 'Check-in Diário Resgatado (+50 XP)' : 'Resgatar Check-in Diário (+50 XP)'}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. MURAL DE NOTAS EM POST-IT DO USUÁRIO
         ===================================================================== */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(18px)',
          borderRadius: '26px',
          padding: '22px 24px',
          boxShadow: '0 10px 30px rgba(33, 31, 56, 0.06)',
          border: '1.5px solid rgba(255, 255, 255, 0.9)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#FEF08A',
                border: '1.5px solid #FDE047',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#854D0E'
              }}
            >
              <StickyNote size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#1A1B2F' }}>
                Mural de Notas em Post-it
              </h3>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Cole lembretes rápidos, insights, metas curtas e pensamentos do dia
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNewPostIt}
            style={{
              backgroundColor: '#211F38',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '999px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(33, 31, 56, 0.2)'
            }}
          >
            <Plus size={14} />
            <span>Novo Post-it</span>
          </button>
        </div>

        {sortedPostIts.length === 0 ? (
          <div
            style={{
              padding: '28px',
              textAlign: 'center',
              backgroundColor: 'rgba(254, 240, 138, 0.25)',
              borderRadius: '18px',
              border: '1.5px dashed #FACC15',
              color: '#854D0E',
              fontSize: '13px'
            }}
          >
            Nenhum Post-it colado ainda. Clique em <strong>"Novo Post-it"</strong> para adicionar sua primeira nota!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '14px' }}>
            {sortedPostIts.map((note, idx) => {
              const palette = POSTIT_COLORS.find((c) => c.id === note.colorId) || POSTIT_COLORS[0];
              const tilt = idx % 2 === 0 ? '-0.6deg' : '0.6deg';
              return (
                <div
                  key={note.id}
                  style={{
                    backgroundColor: palette.bg,
                    border: `1.5px solid ${palette.border}`,
                    borderRadius: '18px',
                    padding: '16px',
                    color: palette.text,
                    position: 'relative',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.07)',
                    transform: `rotate(${tilt})`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '135px',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 800, lineHeight: 1.25 }}>
                        {note.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePinPostIt(note.id)}
                          title={note.pinned ? 'Desafixar Post-it' : 'Fixar Post-it no topo'}
                          style={{
                            background: note.pinned ? palette.pin : 'rgba(0,0,0,0.06)',
                            color: note.pinned ? '#FFFFFF' : palette.text,
                            border: 'none',
                            borderRadius: '6px',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Pin size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPostIt(note)}
                          title="Editar Post-it"
                          style={{
                            background: 'rgba(0,0,0,0.06)',
                            color: palette.text,
                            border: 'none',
                            borderRadius: '6px',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePostIt(note.id)}
                          title="Excluir Post-it"
                          style={{
                            background: 'rgba(0,0,0,0.06)',
                            color: palette.text,
                            border: 'none',
                            borderRadius: '6px',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {note.content}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.07)', fontSize: '10px', opacity: 0.8, fontWeight: 700 }}>
                    <span>{note.pinned ? '📌 Fixado' : 'Nota Post-it'}</span>
                    <span>{note.createdAt || 'Hoje'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          3. GRADE PRINCIPAL: MÚSICA & PLAYLISTS + MÉTRICAS COMPARTILHADAS
         ===================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* COLUNA ESQUERDA: MÚSICA & PLAYLISTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ITEM 1: ÚLTIMA MÚSICA ESCUTADA / QUAL ESTÁ ESCUTANDO */}
          <div
            style={{
              background: '#0D111E',
              borderRadius: '26px',
              padding: '22px',
              color: '#F8FAFC',
              boxShadow: '0 16px 36px rgba(10, 8, 24, 0.35)',
              border: '1.5px solid rgba(255, 255, 255, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Header do Widget */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  onClick={() => { if (activeTrack) setIsPlayingMusic((prev) => !prev); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    backgroundColor: activeTrack ? 'rgba(29, 185, 84, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    border: activeTrack ? '1px solid rgba(29, 185, 84, 0.35)' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: activeTrack ? '#1DB954' : '#94A3B8',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: activeTrack ? 'pointer' : 'default'
                  }}
                  title={activeTrack ? "Clique para alternar reprodução" : "Nenhuma música configurada"}
                >
                  {activeTrack && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '10px' }}>
                      <span style={{ width: '2.5px', height: isPlayingMusic ? '10px' : '4px', backgroundColor: '#1DB954', borderRadius: '1px', transition: 'height 0.2s ease' }} />
                      <span style={{ width: '2.5px', height: isPlayingMusic ? '6px' : '3px', backgroundColor: '#1DB954', borderRadius: '1px', transition: 'height 0.2s ease' }} />
                      <span style={{ width: '2.5px', height: isPlayingMusic ? '9px' : '5px', backgroundColor: '#1DB954', borderRadius: '1px', transition: 'height 0.2s ease' }} />
                    </span>
                  )}
                  <span>{activeTrack ? (isPlayingMusic ? 'Ouvindo Agora' : 'Última Escutada') : 'Música'}</span>
                </div>

                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Spotify / Streaming
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditTrackTitle(activeTrack?.title || '');
                  setEditTrackArtist(activeTrack?.artist || '');
                  setEditTrackAlbum(activeTrack?.album || '');
                  setShowEditTrackModal(true);
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  color: '#CBD5E1',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Edit3 size={11} />
                <span>{activeTrack ? 'Alterar Música' : 'Definir Música'}</span>
              </button>
            </div>

            {/* Corpo do Player ou Estado Limpo */}
            {activeTrack ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '16px',
                      background: activeTrack.gradient || 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #3B82F6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(139, 92, 246, 0.35)',
                      position: 'relative',
                      flexShrink: 0
                    }}
                  >
                    <Disc size={34} color="#FFFFFF" style={{ opacity: 0.9 }} />
                    <span
                      style={{
                        position: 'absolute',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#0D111E',
                        border: '2px solid #FFFFFF'
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeTrack.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsLikedSong(prev => !prev)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Heart size={15} fill={isLikedSong ? '#EF4444' : 'transparent'} color={isLikedSong ? '#EF4444' : '#64748B'} />
                      </button>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeTrack.artist} • {activeTrack.album}
                    </p>

                    <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '999px', overflow: 'hidden', marginBottom: '4px' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(musicProgress / musicDuration) * 100}%`,
                          backgroundColor: '#1DB954',
                          borderRadius: '999px',
                          transition: 'width 1s linear'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
                      <span>{formatSeconds(musicProgress)}</span>
                      <span>{formatSeconds(musicDuration)}</span>
                    </div>
                  </div>
                </div>

                {/* Controles do Player */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    type="button"
                    onClick={handlePrevTrack}
                    title="Música Anterior"
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}
                  >
                    <SkipBack size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlayingMusic(prev => !prev)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      color: '#0D111E',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(255,255,255,0.25)'
                    }}
                  >
                    {isPlayingMusic ? <Pause size={16} fill="#0D111E" /> : <Play size={16} fill="#0D111E" style={{ marginLeft: '2px' }} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextTrack}
                    title="Próxima Música"
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}
                  >
                    <SkipForward size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 8px', color: '#94A3B8' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '12.5px' }}>
                  Nenhuma música configurada para exibir no perfil.
                </p>
                <button
                  type="button"
                  onClick={() => setShowEditTrackModal(true)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '999px',
                    backgroundColor: '#1DB954',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Music size={13} />
                  <span>Definir Música do Perfil</span>
                </button>
              </div>
            )}
          </div>

          {/* ITEM 2: FEED COM O LINK DAS PLAYLISTS DO USUÁRIO */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.78)',
              backdropFilter: 'blur(16px)',
              borderRadius: '26px',
              padding: '22px',
              boxShadow: '0 10px 30px rgba(33, 31, 56, 0.06)',
              border: '1.5px solid rgba(255, 255, 255, 0.85)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={18} color="#4F46E5" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1A1B2F' }}>
                  Feed de Playlists do Usuário
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPlaylistModal(true)}
                style={{
                  backgroundColor: '#211F38',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(33, 31, 56, 0.2)'
                }}
              >
                <Plus size={13} />
                <span>Adicionar Playlist</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: pl.accentColor || '#1DB954',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Music size={18} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1B2F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pl.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pl.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <a
                      href={pl.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(79, 70, 229, 0.08)',
                        color: '#4338CA',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Abrir Link</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeletePlaylist(pl.id)}
                      title="Remover Playlist"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: MÉTRICAS COMPARTILHADAS COM AMIGOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.82)',
              backdropFilter: 'blur(20px)',
              borderRadius: '26px',
              padding: '24px',
              boxShadow: '0 12px 35px rgba(33, 31, 56, 0.08)',
              border: '1.5px solid rgba(255, 255, 255, 0.9)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1A1B2F' }}>
                  Métricas Compartilhadas com Amigos
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowMetricsConfigModal(true)}
                style={{
                  background: 'rgba(33, 31, 56, 0.06)',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <SlidersHorizontal size={12} />
                <span>Personalizar</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {sharedConfig.shareStreaks && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EA580C', marginBottom: '6px' }}>
                    <Flame size={16} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Conquista de Streak
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#1A1B2F' }}>
                    {userStreak} dias
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                    Constância diária ininterrupta
                  </span>
                </div>
              )}

              {sharedConfig.shareFocusHours && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4F46E5', marginBottom: '6px' }}>
                    <Timer size={16} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Nível & XP Social
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#1A1B2F' }}>
                    Nv. {currentLevel} ({totalXp} XP)
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                    {levelTitle}
                  </span>
                </div>
              )}

              {sharedConfig.shareWorkoutStreak && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706', marginBottom: '6px' }}>
                    <Dumbbell size={16} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Musculação
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#1A1B2F' }}>
                    {workouts.length} fichas
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                    Divisão de treinos ativa
                  </span>
                </div>
              )}

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', marginBottom: '6px' }}>
                  <CheckCircle2 size={16} />
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Taxa de Hábitos
                  </span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#1A1B2F' }}>
                  {habitCompletionRate}%
                </div>
                <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                  Consistência nos hábitos ativos
                </span>
              </div>
            </div>

            {/* EVOLUÇÃO EM HÁBITOS SELECIONADOS PELO USUÁRIO */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1A1B2F', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Evolução nos Hábitos Compartilhados
              </div>

              {pinnedHabitsList.length === 0 ? (
                <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', fontSize: '12px', color: '#64748B' }}>
                  Adicione hábitos na sua rotina para compartilhar sua evolução com seus amigos.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pinnedHabitsList.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                          {h.title}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: h.completed ? '#059669' : '#6366F1' }}>
                          {h.completed ? '100% Concluído (+25 XP)' : 'Em progresso'}
                        </span>
                      </div>

                      <div style={{ width: '100%', height: '5px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: h.completed ? '100%' : '55%',
                            backgroundColor: h.completed ? '#10B981' : '#6366F1',
                            borderRadius: '999px'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BADGES / DISTINTIVOS EM DESTAQUE */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1A1B2F', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Conquistas & Distintivos Visíveis
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(badges.length > 0 ? badges.slice(0, 4) : [
                  { id: 'b1', name: 'Início Implacável', icon: '🔥', desc: 'Sequência ativa' },
                  { id: 'b2', name: 'Mente Focada', icon: '⚡', desc: 'Foco profundo' },
                  { id: 'b3', name: 'Guerreiro de Ferro', icon: '🏋️', desc: 'Ficha executada' }
                ]).map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1E293B',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <span>{b.icon || '🏆'}</span>
                    <span>{b.name || b.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL: CRIAR / EDITAR NOTA EM POST-IT
         ===================================================================== */}
      {showPostItModal && (
        <div
          onClick={() => setShowPostItModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(9, 11, 20, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StickyNote size={20} color="#CA8A04" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1A1B2F' }}>
                  {editingPostItId ? 'Editar Post-it' : 'Novo Post-it no Perfil'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPostItModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePostIt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Título do Post-it
                </label>
                <input
                  type="text"
                  placeholder="Ex: Meta da Semana, Lembrete de Leitura..."
                  value={postItTitle}
                  onChange={(e) => setPostItTitle(e.target.value)}
                  maxLength={50}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Conteúdo da Nota (máx. 280 caracteres)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Escreva sua anotação rápida em formato post-it..."
                  value={postItContent}
                  onChange={(e) => setPostItContent(e.target.value.slice(0, 280))}
                  maxLength={280}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                  {postItContent.length} / 280
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Cor do Post-it
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {POSTIT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPostItColorId(c.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        backgroundColor: c.bg,
                        border: postItColorId === c.id ? '2.5px solid #1A1B2F' : `1.5px solid ${c.border}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={c.name}
                    >
                      {postItColorId === c.id && <Check size={14} color={c.text} />}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={postItPinned}
                  onChange={(e) => setPostItPinned(e.target.checked)}
                  style={{ accentColor: '#4F46E5' }}
                />
                <span>Fixar este Post-it no topo do mural</span>
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowPostItModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1.3,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#211F38',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  {editingPostItId ? 'Salvar Alterações' : 'Colar Post-it (+10 XP)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ALTERAR MÚSICA ATUAL / ÚLTIMA ESCUTADA
         ===================================================================== */}
      {showEditTrackModal && (
        <div
          onClick={() => setShowEditTrackModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(9, 11, 20, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Disc size={20} color="#1DB954" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1A1B2F' }}>
                  Qual música você está escutando?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditTrackModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomTrack} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Nome da Música
                </label>
                <input
                  type="text"
                  required
                  value={editTrackTitle}
                  onChange={(e) => setEditTrackTitle(e.target.value)}
                  placeholder="Ex: Starboy"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Artista / Banda
                </label>
                <input
                  type="text"
                  required
                  value={editTrackArtist}
                  onChange={(e) => setEditTrackArtist(e.target.value)}
                  placeholder="Ex: The Weeknd, Daft Punk"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Álbum (opcional)
                </label>
                <input
                  type="text"
                  value={editTrackAlbum}
                  onChange={(e) => setEditTrackAlbum(e.target.value)}
                  placeholder="Ex: Starboy"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditTrackModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1.3, padding: '10px', borderRadius: '10px', backgroundColor: '#1DB954', color: '#FFFFFF', border: 'none', fontWeight: 800, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Atualizar Status Musical
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADICIONAR PLAYLIST AO FEED
         ===================================================================== */}
      {showAddPlaylistModal && (
        <div
          onClick={() => setShowAddPlaylistModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(9, 11, 20, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={20} color="#4F46E5" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1A1B2F' }}>
                  Compartilhar Nova Playlist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPlaylistModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Título da Playlist
                </label>
                <input
                  type="text"
                  placeholder="Ex: Foco Cibersegurança & Synthwave"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Plataforma
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'spotify', label: 'Spotify' },
                    { id: 'youtube', label: 'YouTube Music' },
                    { id: 'apple', label: 'Apple Music' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPlaylistPlatform(p.id)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: newPlaylistPlatform === p.id ? '1.5px solid #4F46E5' : '1px solid #CBD5E1',
                        backgroundColor: newPlaylistPlatform === p.id ? 'rgba(79, 70, 229, 0.1)' : '#FFFFFF',
                        color: newPlaylistPlatform === p.id ? '#4338CA' : '#475569',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Link / URL da Playlist
                </label>
                <input
                  type="url"
                  placeholder="https://open.spotify.com/playlist/..."
                  value={newPlaylistUrl}
                  onChange={(e) => setNewPlaylistUrl(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Breve Descrição (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Para sessões noturnas de código sem distrações"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddPlaylistModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    flex: 1.3,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#211F38',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Adicionar ao Feed (+15 XP)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONFIGURAR QUAIS MÉTRICAS COMPARTILHAR COM OS AMIGOS
         ===================================================================== */}
      {showMetricsConfigModal && (
        <div
          onClick={() => setShowMetricsConfigModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(9, 11, 20, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1A1B2F' }}>
                  Visibilidade com os Amigos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMetricsConfigModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 14px 0', lineHeight: 1.45 }}>
              Escolha quais conquistas, streaks e evoluções de hábitos aparecem no seu perfil para seus amigos:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {[
                { key: 'shareStreaks', label: 'Sequência (Streaks) Geral de Hábitos', icon: Flame, color: '#EA580C' },
                { key: 'shareFocusHours', label: 'Nível de XP & Horas de Foco Pomodoro', icon: Timer, color: '#4F46E5' },
                { key: 'shareWorkoutStreak', label: 'Consistência em Musculação & Treinos', icon: Dumbbell, color: '#D97706' },
                { key: 'shareSobrietyDays', label: 'Marcos de Sobriedade & Superação', icon: Sparkles, color: '#10B981' }
              ].map((m) => {
                const IconComponent = m.icon;
                const isChecked = Boolean(sharedConfig[m.key]);
                return (
                  <div
                    key={m.key}
                    onClick={() => handleToggleSharedMetric(m.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: isChecked ? 'rgba(5, 150, 105, 0.05)' : '#F8FAFC',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconComponent size={16} color={m.color} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                        {m.label}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', accentColor: '#059669' }}
                    />
                  </div>
                );
              })}
            </div>

            {habits.length > 0 && (
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Hábitos exibidos na evolução ({habits.length} disponíveis):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {habits.map((h) => {
                    const isPinned = (sharedConfig.selectedHabitIds || []).includes(h.id);
                    return (
                      <div
                        key={h.id}
                        onClick={() => handleTogglePinnedHabit(h.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          backgroundColor: isPinned ? 'rgba(79, 70, 229, 0.06)' : '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '12.5px'
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#1E293B' }}>{h.title}</span>
                        <input type="checkbox" checked={isPinned} onChange={() => {}} style={{ accentColor: '#4F46E5' }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowMetricsConfigModal(false)}
              style={{
                width: '100%',
                marginTop: '18px',
                padding: '10px',
                borderRadius: '12px',
                backgroundColor: '#211F38',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Concluir Configuração
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
