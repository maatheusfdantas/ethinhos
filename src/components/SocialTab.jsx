import React, { useState } from 'react';
import { 
  Users, 
  Flame, 
  Droplets, 
  Zap, 
  Shield, 
  GraduationCap, 
  Trophy, 
  Heart, 
  ThumbsUp, 
  UserPlus, 
  UserCheck, 
  Search, 
  Check, 
  X, 
  Share2, 
  Sparkles,
  Lock,
  Globe
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
  badges,
  friends,
  setFriends,
  feed,
  setFeed
}) {
  // Sub-tabs: 'feed' (Feed Social), 'friends' (Amizades N:N), 'badges' (Conquistas)
  const [subTab, setSubTab] = useState('feed');
  const [searchQuery, setSearchQuery] = useState('');

  // US32: Search & Filter friends
  const approvedFriends = friends.filter(f => f.status === 'approved');
  const pendingReceived = friends.filter(f => f.status === 'pending_received');
  const searchResults = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // US32: Send friend request
  const handleSendRequest = (friendId) => {
    setFriends(prev => prev.map(f => {
      if (f.id === friendId) {
        return { ...f, status: 'pending_sent' };
      }
      return f;
    }));
  };

  // US32: Accept friend request
  const handleAcceptRequest = (friendId) => {
    setFriends(prev => prev.map(f => {
      if (f.id === friendId) {
        return { ...f, status: 'approved', isFriend: true };
      }
      return f;
    }));

    // Add friend celebration to feed
    const target = friends.find(f => f.id === friendId);
    if (target) {
      setFeed(prev => [
        {
          id: `feed_${Date.now()}`,
          userId: target.id,
          userName: target.name,
          userAvatar: target.avatar,
          type: 'friendship',
          title: 'Nova Conexão no Ethos',
          details: `Agora é amigo de ${user.name}!`,
          timestamp: 'Agora mesmo',
          reactions: { like: 1, fire: 2, trophy: 1 },
          userReacted: null
        },
        ...prev
      ]);
    }
  };

  // US32: Decline / Remove friend
  const handleDeclineRequest = (friendId) => {
    setFriends(prev => prev.map(f => {
      if (f.id === friendId) {
        return { ...f, status: 'none', isFriend: false };
      }
      return f;
    }));
  };

  // US15: Botão de curtir/reagir nas atividades dos amigos no feed (ZERO EMOJIS - VETORIZADO)
  const handleReaction = (feedId, reactionType) => {
    setFeed(prev => prev.map(item => {
      if (item.id === feedId) {
        const isCurrent = item.userReacted === reactionType;
        const currentCount = item.reactions[reactionType] || 0;
        const newCount = isCurrent ? Math.max(0, currentCount - 1) : currentCount + 1;

        // If had another reaction, decrement it
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

  // US14: Filter feed to only show approved friends (and user's own if public)
  const visibleFeed = feed.filter(item => {
    if (item.userId === user.id) {
      return user.isPublic; // only show own if public
    }
    const friend = friends.find(f => f.id === item.userId);
    return friend && friend.status === 'approved';
  });

  return (
    <div className="social-view">
      <div className="section-header">
        <div className="section-title-wrap">
          <Users size={20} color="var(--accent-cyan)" />
          <h2 className="section-title">Comunidade & Gamificação</h2>
        </div>
        <span className="section-badge">{approvedFriends.length} Amigos Ativos</span>
      </div>

      {/* SUB-TABS: FEED SOCIAL, AMIZADES N:N, CONQUISTAS */}
      <div className="segmented-control" style={{ marginBottom: '20px' }}>
        <button
          className={`segmented-btn ${subTab === 'feed' ? 'active' : ''}`}
          onClick={() => setSubTab('feed')}
        >
          Feed Social
        </button>
        <button
          className={`segmented-btn ${subTab === 'friends' ? 'active' : ''}`}
          onClick={() => setSubTab('friends')}
        >
          Amizades N:N ({approvedFriends.length})
        </button>
        <button
          className={`segmented-btn ${subTab === 'badges' ? 'active' : ''}`}
          onClick={() => setSubTab('badges')}
        >
          Conquistas ({badges.filter(b => b.unlocked).length}/{badges.length})
        </button>
      </div>

      {/* SUB-TAB 1: FEED SOCIAL DE EVENTOS DE CONCLUSÃO (US14, US15) */}
      {subTab === 'feed' && (
        <div>
          {!user.isPublic && (
            <div className="card-native" style={{ marginBottom: '14px', background: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
                <Lock size={16} />
                <span>Seu perfil está configurado como <strong>Privado</strong>. Suas conclusões não aparecem no feed social de amigos.</span>
              </div>
            </div>
          )}

          {visibleFeed.length === 0 ? (
            <div className="card-native" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
              <Users size={36} color="var(--accent-indigo)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Nenhum Evento Recente</h3>
              <p style={{ fontSize: '0.82rem' }}>Adicione mais amigos para ver seus eventos de conclusão de foco, treino e hábitos!</p>
            </div>
          ) : (
            visibleFeed.map((item) => (
              <div key={item.id} className="feed-item-card">
                <div className="feed-user-row">
                  <div className="feed-user-info">
                    <div className="profile-avatar">
                      {item.userAvatar}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.userName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {item.timestamp}
                      </div>
                    </div>
                  </div>

                  <span className="section-badge" style={{ color: 'var(--accent-cyan)' }}>
                    {item.type === 'focus_completed' ? 'Foco Concluído' : item.type === 'workout_completed' ? 'Treino Feito' : 'Conquista'}
                  </span>
                </div>

                <div style={{ marginTop: '8px', paddingLeft: '38px' }}>
                  <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {item.details}
                  </p>
                </div>

                {/* US15: BOTÕES DE CURTIR E REAGIR VETORIZADOS (ZERO EMOJIS!) */}
                <div className="feed-action-row" style={{ paddingLeft: '38px' }}>
                  <button 
                    className={`reaction-btn ${item.userReacted === 'like' ? 'active' : ''}`}
                    onClick={() => handleReaction(item.id, 'like')}
                    title="Apoiar com Curtir"
                  >
                    <ThumbsUp size={14} />
                    <span>{item.reactions.like || 0}</span>
                  </button>

                  <button 
                    className={`reaction-btn ${item.userReacted === 'fire' ? 'active' : ''}`}
                    onClick={() => handleReaction(item.id, 'fire')}
                    title="Reagir com Fogo"
                  >
                    <Flame size={14} />
                    <span>{item.reactions.fire || 0}</span>
                  </button>

                  <button 
                    className={`reaction-btn ${item.userReacted === 'trophy' ? 'active' : ''}`}
                    onClick={() => handleReaction(item.id, 'trophy')}
                    title="Reagir com Troféu de Vitória"
                  >
                    <Trophy size={14} />
                    <span>{item.reactions.trophy || 0}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-TAB 2: SISTEMA DE AMIZADES N:N (US32) */}
      {subTab === 'friends' && (
        <div>
          {/* SEARCH BOX */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="Buscar usuário por nome ou bio (ex: Lucas, Dev, Corrida)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 14 }} />
            </div>
          </div>

          {/* PENDING RECEIVED REQUESTS */}
          {pendingReceived.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <span className="form-label" style={{ color: 'var(--accent-amber)' }}>
                Solicitações Pendentes Recebidas ({pendingReceived.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingReceived.map((f) => (
                  <div key={f.id} className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="profile-avatar">{f.avatar}</div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{f.bio}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => handleAcceptRequest(f.id)}
                      >
                        <Check size={14} />
                        Aceitar
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => handleDeclineRequest(f.id)}
                      >
                        <X size={14} />
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALL SEARCH / DISCOVERY LIST */}
          <span className="form-label">Usuários na Rede ({searchResults.length})</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {searchResults.map((f) => {
              const isApproved = f.status === 'approved';
              const isPendingSent = f.status === 'pending_sent';

              return (
                <div key={f.id} className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="profile-avatar">{f.avatar}</div>
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        {f.bio}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isApproved ? (
                      <span className="tag-badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--accent-emerald)', padding: '6px 12px' }}>
                        <UserCheck size={14} />
                        Amigo Conectado
                      </span>
                    ) : isPendingSent ? (
                      <span className="tag-badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--accent-amber)', padding: '6px 12px' }}>
                        Solicitação Enviada
                      </span>
                    ) : (
                      <button 
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        onClick={() => handleSendRequest(f.id)}
                      >
                        <UserPlus size={14} />
                        Adicionar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DESBLOQUEIO DE CONQUISTAS / BADGES (US16) */}
      {subTab === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.iconName] || Trophy;
            return (
              <div 
                key={badge.id} 
                className={`badge-card ${badge.unlocked ? 'unlocked' : ''}`}
                style={{ opacity: badge.unlocked ? 1 : 0.6 }}
              >
                <div className="badge-icon-wrap" style={{ color: badge.unlocked ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  <Icon size={24} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {badge.title}
                    </h4>
                    <span 
                      className={`priority-badge ${badge.unlocked ? 'low' : 'medium'}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {badge.unlocked ? `Desbloqueado (${badge.unlockedAt})` : 'Em Progresso'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {badge.description}
                  </p>

                  {!badge.unlocked && badge.progress && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600 }}>
                      Progresso: {badge.progress}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
