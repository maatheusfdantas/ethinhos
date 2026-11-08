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
  Volume2, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Flame, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  Edit3, 
  SlidersHorizontal,
  X,
  Disc,
  Radio,
  Dumbbell,
  Timer
} from 'lucide-react';

/**
 * Aba do Perfil do Usuário
 * 
 * Requisitos implementados:
 * 1. Player demonstrativo de música ("Ouvindo agora" / "Última música escutada").
 * 2. Feed com os links das playlists do usuário (Spotify, YouTube Music, Apple Music).
 * 3. Métricas e streaks que o usuário deseja compartilhar com os amigos.
 * 4. Descrição (Bio) com limite de 150 caracteres (padrão Instagram & TikTok) e contador ao vivo.
 * 5. Restrição de fotos: Zero grade/galeria de fotos; apenas o campo de foto de perfil pode ser enviado.
 */
export function ProfileTab({ 
  user, 
  setUser, 
  habits = [], 
  workouts = [], 
  badges = [], 
  friends = [], 
  showToast,
  onOpenSettings
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
    }
  }, [user?.bio]);

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

  // Copiar @username
  const handleCopyHandle = () => {
    const handle = `@${user?.username || 'usuario'}`;
    navigator.clipboard?.writeText?.(handle);
    setCopiedHandle(true);
    showToast?.(`Handle ${handle} copiado para a área de transferência!`);
    setTimeout(() => setCopiedHandle(false), 2200);
  };

  // -------------------------------------------------------------------------
  // 3. WIDGET DE MÚSICA (DEMONSTRAÇÃO FALSA / MOCKUP DE PLAYER)
  // -------------------------------------------------------------------------
  const [isPlayingMusic, setIsPlayingMusic] = useState(true);
  const [isLikedSong, setIsLikedSong] = useState(true);
  const [musicProgress, setMusicProgress] = useState(134); // segundos (2:14)
  const musicDuration = 230; // 3:50

  useEffect(() => {
    let timer;
    if (isPlayingMusic) {
      timer = setInterval(() => {
        setMusicProgress(prev => (prev >= musicDuration ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingMusic, musicDuration]);

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // -------------------------------------------------------------------------
  // 4. FEED DE PLAYLISTS DO USUÁRIO
  // -------------------------------------------------------------------------
  const defaultPlaylists = [
    {
      id: 'pl_1',
      title: 'Foco Profundo & Código',
      platform: 'spotify',
      url: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM',
      description: 'Lofi beats, ambient e synthwave para sessões de trabalho intenso',
      accentColor: '#1DB954'
    },
    {
      id: 'pl_2',
      title: 'Treino Hipertrofia Pesado',
      platform: 'spotify',
      url: 'https://open.spotify.com/playlist/37i9dQZF1DX76t638V64Cr',
      description: 'Phonk, hip-hop e rock energético para os dias de musculação',
      accentColor: '#F43F5E'
    },
    {
      id: 'pl_3',
      title: 'Vibes Noturnas & Relax',
      platform: 'youtube',
      url: 'https://music.youtube.com',
      description: 'Trilha sonora calmante para desacelerar a mente após a rotina',
      accentColor: '#FF0000'
    }
  ];

  const [playlists, setPlaylists] = useState(() => {
    try {
      if (Array.isArray(user?.playlists) && user.playlists.length > 0) {
        return user.playlists;
      }
      const saved = localStorage.getItem(`ethos_playlists_${user?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return defaultPlaylists;
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
      showToast?.('Playlist adicionada ao seu perfil!');
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
  // 5. MÉTRICAS COMPARTILHADAS COM OS AMIGOS
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
      shareStreaks: true,
      shareWorkoutStreak: true,
      shareFocusHours: true,
      shareSobrietyDays: true,
      selectedHabitIds: habits.slice(0, 2).map(h => h.id)
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

  // Métricas calculadas
  const completedHabitsCount = habits.filter(h => h.completed).length;
  const habitCompletionRate = habits.length > 0 ? Math.round((completedHabitsCount / habits.length) * 100) : 85;
  const userStreak = user?.streak_days || 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>

      {/* =====================================================================
          1. CARD HERO: IDENTIDADE DO USUÁRIO & BIO (LIMITADA A 150 CARACTERES)
         ===================================================================== */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(245, 247, 252, 0.88) 100%)',
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
          
          {/* Lado Esquerdo: Avatar + Dados Pessoais */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap' }}>
            
            {/* Foto de Perfil com Botão de Alteração */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
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

              {/* Botão de Câmera para Enviar Foto de Perfil */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Alterar Foto de Perfil (Único campo permitido)"
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

            {/* Informações de Nome, @Handle e Contadores */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1B2F', margin: 0, letterSpacing: '-0.02em' }}>
                  {user?.name || firstName}
                </h2>
                <span
                  style={{
                    backgroundColor: 'rgba(79, 70, 229, 0.12)',
                    color: '#4338CA',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}
                >
                  Membro Ethos
                </span>
              </div>

              {/* @Handle com Cópia de 1 clique */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
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
              </div>

              {/* DESCRIÇÃO / BIO (LIMITE DE 150 CARACTERES) */}
              <div style={{ maxWidth: '480px' }}>
                {isEditingBio ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value.slice(0, 150))}
                        placeholder="Escreva sua bio (máx 150 caracteres)..."
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
                      <span style={{ color: bioText.length >= 140 ? '#E11D48' : '#64748B', fontWeight: 600 }}>
                        {bioText.length} / 150 caracteres (padrão Instagram & TikTok)
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
                      {bioText || 'Adicione uma breve bio sobre sua rotina, metas e mentalidade (máx. 150 caracteres)...'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(true)}
                      title="Editar Bio"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366F1',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        flexShrink: 0
                      }}
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: Ações de Configuração e Privacidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
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

            <div
              style={{
                padding: '10px 14px',
                borderRadius: '16px',
                backgroundColor: 'rgba(79, 70, 229, 0.06)',
                border: '1px dashed rgba(79, 70, 229, 0.25)',
                fontSize: '11px',
                color: '#4338CA',
                maxWidth: '260px',
                lineHeight: 1.4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, marginBottom: '2px' }}>
                <Sparkles size={12} />
                <span>Privacidade Visual</span>
              </div>
              <span>Grade de fotos desabilitada. Apenas sua foto de perfil oficial pode ser personalizada.</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. GRADE PRINCIPAL: MÚSICA & PLAYLISTS + MÉTRICAS COMPARTILHADAS
         ===================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* ===================================================================
            COLUNA ESQUERDA: MÚSICA & PLAYLISTS
           =================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ITEM 1: ÚLTIMA MÚSICA ESCUTADA / QUAL ESTÁ ESCUTANDO (DEMONSTRAÇÃO FALSA) */}
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(29, 185, 84, 0.15)',
                    border: '1px solid rgba(29, 185, 84, 0.35)',
                    color: '#1DB954',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase'
                  }}
                >
                  {/* Equalizador animado CSS */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '10px' }}>
                    <span style={{ width: '2.5px', height: isPlayingMusic ? '10px' : '4px', backgroundColor: '#1DB954', borderRadius: '1px', transition: 'height 0.2s ease' }} />
                    <span style={{ width: '2.5px', height: isPlayingMusic ? '6px' : '3px', backgroundColor: '#1DB954', borderRadius: '1px', transition: 'height 0.2s ease' }} />
                    <span style={{ width: '2.5px', height: isPlayingMusic ? '9px' : '5px', backgroundColor: '#1DB954', borderRadius: '1px', transition: 'height 0.2s ease' }} />
                  </span>
                  <span>{isPlayingMusic ? 'Ouvindo Agora' : 'Última Escutada'}</span>
                </div>

                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  via Spotify
                </span>
              </div>

              <span style={{ fontSize: '9.5px', color: '#64748B', fontStyle: 'italic' }}>
                * Modo Demonstrativo
              </span>
            </div>

            {/* Corpo do Player */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              
              {/* Capa do Álbum Estilosa (Vinil com Glow) */}
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #3B82F6 100%)',
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

              {/* Informações da Faixa */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Starboy
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
                  The Weeknd, Daft Punk • Starboy
                </p>

                {/* Barra de Progresso da Música */}
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

            {/* Controles Simulados do Player */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                type="button"
                onClick={() => setMusicProgress(0)}
                title="Recomeçar"
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
                onClick={() => setMusicProgress(prev => Math.min(musicDuration, prev + 30))}
                title="Avançar 30s"
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}
              >
                <SkipForward size={16} />
              </button>
            </div>
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
            {/* Header da Seção de Playlists */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={18} color="#4F46E5" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1A1B2F' }}>
                  Minhas Playlists de Rotina
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

            {/* Lista / Feed de Playlists */}
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
                      <span>Abrir</span>
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

        {/* ===================================================================
            COLUNA DIREITA: MÉTRICAS COMPARTILHADAS COM AMIGOS
           =================================================================== */}
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
            {/* Header da Seção de Métricas */}
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
                <span>Configurar</span>
              </button>
            </div>

            {/* Cards de Métricas em Destaque */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              
              {/* Métrica 1: Streak Global de Consistência */}
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
                      Sequência Ativa
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

              {/* Métrica 2: Foco Pomodoro Total */}
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
                      Foco Acumulado
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#1A1B2F' }}>
                    38 horas
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                    Sessões completadas no mês
                  </span>
                </div>
              )}

              {/* Métrica 3: Frequência em Treinos */}
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
                    4 semanas
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                    Sem falhar a divisão de treinos
                  </span>
                </div>
              )}

              {/* Métrica 4: Taxa de Conclusão de Hábitos */}
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
                  Sucesso na rotina desta semana
                </span>
              </div>
            </div>

            {/* EVOLUÇÃO EM HÁBITOS SELECIONADOS PELO USUÁRIO */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1A1B2F', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Evolução nos Hábitos Fixados
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {habits.slice(0, 3).map((h) => (
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
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669' }}>
                        {h.completed ? '100% Hoje' : 'Em andamento'}
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
            </div>

            {/* BADGES / DISTINTIVOS EM DESTAQUE */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1A1B2F', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Distintivos Visíveis na Rede
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(badges.length > 0 ? badges.slice(0, 4) : [
                  { id: 'b1', name: 'Início Implacável', icon: '🔥', desc: '14 dias seguidos' },
                  { id: 'b2', name: 'Mente Focada', icon: '⚡', desc: '25h de foco' },
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
                    <span>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

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
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              animation: 'ethosModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both'
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
                  Adicionar ao Feed
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
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              animation: 'ethosModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both'
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

            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              Escolha quais conquistas e evoluções aparecem no seu perfil social para amigos e conexões:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'shareStreaks', label: 'Sequência (Streaks) Geral de Hábitos', icon: Flame, color: '#EA580C' },
                { key: 'shareFocusHours', label: 'Horas de Foco Pomodoro Acumuladas', icon: Timer, color: '#4F46E5' },
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
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
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
