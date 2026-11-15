import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Flame, 
  Droplets, 
  Zap, 
  Shield, 
  GraduationCap, 
  Trophy, 
  ThumbsUp, 
  UserPlus, 
  UserCheck, 
  Search, 
  Check, 
  X, 
  Sparkles,
  Lock,
  AtSign,
  Copy,
  Clock,
  UserX
} from 'lucide-react';

const BADGE_ICONS = {
  Flame,
  Droplets,
  Zap,
  Shield,
  GraduationCap,
  Trophy
};

export function SocialTab({
  user,
  badges = [],
  friends = [],
  setFriends,
  feed = [],
  setFeed
}) {
  // Sub-tabs: 'connections' (Minhas Conexões), 'search' (Buscar Amigos), 'feed' (Feed Social), 'badges' (Conquistas)
  const [subTab, setSubTab] = useState('connections');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const currentUserHandle = (user?.username || 'usuario').replace(/^@/, '');

  // 1. Carregar conexões reais do usuário ao montar
  const loadConnections = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user/${user.id}/connections`);
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
    } catch (_e) {
      console.warn('Backend connections offline, using local states.');
    }
  };

  // 2. Carregar feed social ao montar
  const loadFeed = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user/${user.id}/feed`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.feed)) {
          setFeed(data.feed);
        }
      }
    } catch (_e) {
      console.warn('Backend feed offline, using local states.');
    }
  };

  useEffect(() => {
    loadConnections();
    loadFeed();
  }, [user?.id]);

  // 3. Buscar usuários da rede pelo @username ou nome
  useEffect(() => {
    const fetchUsers = async () => {
      setIsSearching(true);
      try {
        const token = localStorage.getItem('ethos_access_token') || sessionStorage.getItem('ethos_access_token');
        const res = await fetch(`/api/community/users?q=${encodeURIComponent(searchQuery)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
        } else {
          // Fallback local caso não autenticado na API
          const cleanQ = searchQuery.toLowerCase().replace(/^@/, '');
          const localFiltered = friends.filter(f => 
            (f.username || '').toLowerCase().includes(cleanQ) ||
            (f.name || '').toLowerCase().includes(cleanQ)
          );
          setSearchResults(localFiltered);
        }
      } catch (_e) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, friends]);

  const handleCopyMyHandle = () => {
    navigator.clipboard?.writeText(`@${currentUserHandle}`);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  // Enviar solicitação de conexão via @username ou ID
  const handleSendRequest = async (targetUserId, targetUsername) => {
    if (!user?.id) return;
    setActionLoading(targetUserId);

    try {
      const res = await fetch(`/api/user/${user.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, targetUsername })
      });

      if (res.ok) {
        setSearchResults(prev => prev.map(u => u.id === targetUserId ? { ...u, status: 'pending_sent' } : u));
        await loadConnections();
      }
    } catch (_e) {
      // Fallback local
      setFriends(prev => {
        const exists = prev.find(f => f.id === targetUserId);
        if (exists) {
          return prev.map(f => f.id === targetUserId ? { ...f, status: 'pending_sent' } : f);
        }
        return [...prev, { id: targetUserId, username: targetUsername, name: targetUsername, status: 'pending_sent' }];
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Aceitar solicitação de conexão
  const handleAcceptRequest = async (friendId) => {
    if (!user?.id) return;
    setActionLoading(friendId);

    try {
      const res = await fetch(`/api/user/${user.id}/connect/${friendId}/accept`, {
        method: 'PUT'
      });
      if (res.ok) {
        await loadConnections();
        await loadFeed();
      }
    } catch (_e) {
      setFriends(prev => prev.map(f => f.id === friendId ? { ...f, status: 'approved' } : f));
    } finally {
      setActionLoading(null);
    }
  };

  // Recusar / Desconectar amigo
  const handleRemoveConnection = async (friendId) => {
    if (!user?.id) return;
    setActionLoading(friendId);

    try {
      const res = await fetch(`/api/user/${user.id}/connect/${friendId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadConnections();
      }
    } catch (_e) {
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } finally {
      setActionLoading(null);
    }
  };

  // Reagir no feed
  const handleReaction = (feedId, reactionType) => {
    setFeed(prev => prev.map(item => {
      if (item.id === feedId) {
        const isCurrent = item.userReacted === reactionType;
        const currentCount = item.reactions[reactionType] || 0;
        const newCount = isCurrent ? Math.max(0, currentCount - 1) : currentCount + 1;

        const newReactions = { ...item.reactions, [reactionType]: newCount };
        if (item.userReacted && item.userReacted !== reactionType) {
          newReactions[item.userReacted] = Math.max(0, (newReactions[item.userReacted] || 1) - 1);
        }

        return {
          ...item,
          reactions: newReactions,
          userReacted: isCurrent ? null : reactionType
        };
      }
      return item;
    }));
  };

  const approvedFriends = friends.filter(f => f.status === 'approved');
  const pendingReceived = friends.filter(f => f.status === 'pending_received');
  const pendingSent = friends.filter(f => f.status === 'pending_sent');

  return (
    <div className="space-y-6">
      {/* 1. HERO IDENTITY CARD COM @USERNAME DO USUÁRIO */}
      <div className="glass-card p-6 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/30 border border-indigo-400/30 flex items-center justify-center text-xl font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.25)] flex-shrink-0">
            {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'EU')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">{user?.name || 'Seu Perfil'}</h2>
              {/* @Handle Badge */}
              <button
                type="button"
                onClick={handleCopyMyHandle}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/25 transition-all shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                title="Clique para copiar seu @"
              >
                <AtSign size={13} className="text-indigo-400" />
                <span>{currentUserHandle}</span>
                {copiedHandle ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} className="text-slate-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Compartilhe seu <strong>@{currentUserHandle}</strong> para amigos localizarem e conectarem com você na rede Ethos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Conexões</span>
            <span className="text-lg font-bold text-white">{approvedFriends.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Ofensiva</span>
            <span className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1">
              <Flame size={14} />
              {user?.streak_days || 0}d
            </span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE BUSCA RÁPIDA POR @USERNAME */}
      <div className="relative">
        <input 
          type="text" 
          className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-400/50 rounded-2xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-400 outline-none transition-all shadow-inner" 
          placeholder="Localizar amigos na rede por @username ou nome (ex: @matheus, @admin)..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (subTab !== 'search' && e.target.value.trim()) {
              setSubTab('search');
            }
          }}
        />
        <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-3.5 text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 3. NAVEGAÇÃO DE SUB-ABAS */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto">
        <button
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'connections'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
              : 'text-slate-400 hover:text-white bg-white/[0.02]'
          }`}
          onClick={() => setSubTab('connections')}
        >
          <Users size={14} />
          <span>Minhas Conexões ({approvedFriends.length})</span>
        </button>

        <button
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'search'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
              : 'text-slate-400 hover:text-white bg-white/[0.02]'
          }`}
          onClick={() => setSubTab('search')}
        >
          <Search size={14} />
          <span>Explorar Rede</span>
        </button>

        <button
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap relative ${
            subTab === 'requests'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
              : 'text-slate-400 hover:text-white bg-white/[0.02]'
          }`}
          onClick={() => setSubTab('requests')}
        >
          <Clock size={14} />
          <span>Solicitações ({pendingReceived.length + pendingSent.length})</span>
          {pendingReceived.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'feed'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
              : 'text-slate-400 hover:text-white bg-white/[0.02]'
          }`}
          onClick={() => setSubTab('feed')}
        >
          <Sparkles size={14} />
          <span>Feed de Atividades</span>
        </button>

        <button
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'badges'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
              : 'text-slate-400 hover:text-white bg-white/[0.02]'
          }`}
          onClick={() => setSubTab('badges')}
        >
          <Trophy size={14} />
          <span>Conquistas</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO 1: MINHAS CONEXÕES (AMIGOS ATIVOS)                               */}
      {/* ========================================================================= */}
      {subTab === 'connections' && (
        <div className="space-y-4">
          {approvedFriends.length === 0 ? (
            <div className="glass-card p-10 rounded-3xl text-center border border-white/[0.06]">
              <Users size={36} className="text-indigo-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-white mb-1">Nenhuma Conexão Ativa Ainda</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                Você ainda não adicionou nenhum amigo. Busque por outros usuários pelo <strong>@username</strong> para formarem conexões e acompanharem a evolução juntos!
              </p>
              <button
                type="button"
                onClick={() => setSubTab('search')}
                className="glass-pill-btn !py-2.5 !px-5 text-xs font-semibold !bg-indigo-500/20 !border-indigo-400/40 text-indigo-200 hover:text-white inline-flex items-center gap-2"
              >
                <Search size={14} />
                <span>Localizar Amigos na Rede</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {approvedFriends.map((f) => (
                <div key={f.id} className="glass-card p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {f.avatar || (f.name ? f.name.slice(0, 2).toUpperCase() : 'AM')}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{f.name}</h4>
                      <span className="text-xs font-medium text-indigo-300 flex items-center gap-0.5">
                        <AtSign size={11} />
                        {f.username || f.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                      <UserCheck size={12} />
                      Conectado
                    </span>
                    <button
                      type="button"
                      onClick={() => setConnectionToRemove(f)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Desconectar"
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO 2: BUSCAR E LOCALIZAR AMIGOS (@USERNAME)                        */}
      {/* ========================================================================= */}
      {subTab === 'search' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Usuários na Rede Ethos'}
            </span>
            {isSearching && (
              <span className="text-xs text-indigo-300 animate-pulse">Buscando na rede...</span>
            )}
          </div>

          {searchResults.length === 0 ? (
            <div className="glass-card p-8 rounded-3xl text-center border border-white/[0.06]">
              <Search size={32} className="text-slate-500 mx-auto mb-2 opacity-60" />
              <h4 className="text-sm font-semibold text-white mb-1">Nenhum Usuário Encontrado</h4>
              <p className="text-xs text-slate-400">
                Verifique se o @username ou nome foi digitado corretamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((target) => {
                const isApproved = target.status === 'approved';
                const isPendingSent = target.status === 'pending_sent';
                const isPendingReceived = target.status === 'pending_received';
                const targetHandle = (target.username || target.name.toLowerCase().replace(/\s+/g, '')).replace(/^@/, '');

                return (
                  <div key={target.id} className="glass-card p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {target.avatar || target.name?.slice(0, 2).toUpperCase() || 'US'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{target.name}</h4>
                        <span className="text-xs font-semibold text-indigo-300 flex items-center gap-0.5">
                          <AtSign size={11} />
                          {targetHandle}
                        </span>
                        {target.streak_days !== undefined && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Flame size={10} className="text-orange-400" />
                            {target.streak_days} dias de ofensiva
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isApproved ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                          <UserCheck size={13} />
                          Conectado
                        </span>
                      ) : isPendingSent ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold flex items-center gap-1">
                          <Clock size={13} />
                          Enviado
                        </span>
                      ) : isPendingReceived ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAcceptRequest(target.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/30"
                          >
                            Aceitar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConnectionToRemove(target)}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 text-xs hover:text-white"
                          >
                            Recusar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading === target.id}
                          onClick={() => handleSendRequest(target.id, targetHandle)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                        >
                          <UserPlus size={13} />
                          <span>Conectar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO 3: SOLICITAÇÕES RECEBIDAS E ENVIADAS                             */}
      {/* ========================================================================= */}
      {subTab === 'requests' && (
        <div className="space-y-6">
          {/* Recebidas */}
          <div>
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider block mb-3">
              Solicitações Recebidas ({pendingReceived.length})
            </span>
            {pendingReceived.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhuma solicitação pendente para você no momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingReceived.map((f) => (
                  <div key={f.id} className="glass-card p-4 rounded-2xl border border-amber-400/20 flex items-center justify-between gap-3 bg-amber-500/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {f.avatar || (f.name ? f.name.slice(0, 2).toUpperCase() : 'US')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{f.name}</h4>
                        <span className="text-xs font-medium text-amber-300 flex items-center gap-0.5">
                          <AtSign size={11} />
                          {f.username || f.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(f.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-1"
                      >
                        <Check size={13} />
                        Aceitar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConnectionToRemove(f)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 text-xs"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enviadas */}
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
              Solicitações Enviadas por Você ({pendingSent.length})
            </span>
            {pendingSent.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Você não possui solicitações pendentes enviadas.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingSent.map((f) => (
                  <div key={f.id} className="glass-card p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {f.avatar || (f.name ? f.name.slice(0, 2).toUpperCase() : 'US')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{f.name}</h4>
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-0.5">
                          <AtSign size={11} />
                          {f.username || f.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 italic">Aguardando resposta</span>
                      <button
                        type="button"
                        onClick={() => setConnectionToRemove(f)}
                        className="text-xs text-slate-500 hover:text-rose-400"
                        title="Cancelar solicitação"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO 4: FEED DE ATIVIDADES DOS AMIGOS                                  */}
      {/* ========================================================================= */}
      {subTab === 'feed' && (
        <div className="space-y-4">
          {feed.length === 0 ? (
            <div className="glass-card p-10 rounded-3xl text-center border border-white/[0.06]">
              <Sparkles size={36} className="text-indigo-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-white mb-1">Nenhuma Atividade Recente</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Quando você e suas conexões concluírem sessões de foco, treinos de musculação ou novos hábitos, eles aparecerão aqui para celebração mútua!
              </p>
            </div>
          ) : (
            feed.map((item) => (
              <div key={item.id} className="glass-card p-5 rounded-2xl border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {item.userAvatar || item.userName?.slice(0, 2).toUpperCase() || 'US'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.userName}</h4>
                      <span className="text-[11px] text-slate-400">{item.timestamp}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-[11px] font-semibold">
                    {item.type === 'focus_completed' ? 'Foco Concluído' : item.type === 'workout_completed' ? 'Treino Feito' : 'Conexão'}
                  </span>
                </div>

                <div className="pl-13">
                  <h5 className="text-sm font-semibold text-slate-200">{item.title}</h5>
                  <p className="text-xs text-slate-400 mt-1">{item.details}</p>
                </div>

                {/* Reações Vetorizadas */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'like')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      item.userReacted === 'like'
                        ? 'bg-indigo-500/30 border border-indigo-400/50 text-indigo-200'
                        : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ThumbsUp size={13} />
                    <span>{item.reactions?.like || 0}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'fire')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      item.userReacted === 'fire'
                        ? 'bg-orange-500/30 border border-orange-400/50 text-orange-200'
                        : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame size={13} />
                    <span>{item.reactions?.fire || 0}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReaction(item.id, 'trophy')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      item.userReacted === 'trophy'
                        ? 'bg-amber-500/30 border border-amber-400/50 text-amber-200'
                        : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Trophy size={13} />
                    <span>{item.reactions?.trophy || 0}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO 5: CONQUISTAS DO USUÁRIO                                         */}
      {/* ========================================================================= */}
      {subTab === 'badges' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {badges.map((b) => {
            const Icon = BADGE_ICONS[b.iconName] || Trophy;
            return (
              <div 
                key={b.id} 
                className={`glass-card p-5 rounded-2xl border transition-all ${
                  b.unlocked 
                    ? 'border-indigo-400/30 bg-indigo-500/[0.03] shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                    : 'border-white/[0.06] opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    b.unlocked ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.04] text-slate-500'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{b.title}</h4>
                    <span className="text-[10.5px] text-slate-400">
                      {b.unlocked ? `Desbloqueado (${b.unlockedAt || 'Conquistado'})` : 'Bloqueado'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{b.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
