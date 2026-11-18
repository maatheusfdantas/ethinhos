import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Users,
  KeyRound,
  Inbox,
  LifeBuoy,
  Activity,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Send,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  AlertTriangle,
  Sliders,
  UserCheck,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { AdminSupportGrant } from './support/AdminSupportGrant';
import { AdminProfissionais } from './espacos/AdminProfissionais';

/**
 * Floating Ambient Dust Particles
 * Efeito visual idêntico à landing page (https://ethos-landing-7j3.pages.dev/)
 */
function AmbientDust({ count = 28 }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: 20 + Math.random() * 80,
        size: 1.5 + Math.random() * 2.5,
        dur: 16 + Math.random() * 20,
        delay: -Math.random() * 30,
        dx: (Math.random() - 0.5) * 80,
        opacity: 0.12 + Math.random() * 0.28
      }))
    );
  }, [count]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      <style>{`
        @keyframes adminDustFloat {
          0% { transform: translate3d(0, 0, 0); opacity: 0; }
          15% { opacity: var(--dust-op, 0.3); }
          85% { opacity: var(--dust-op, 0.3); }
          100% { transform: translate3d(var(--dust-dx, 20px), -90vh, 0); opacity: 0; }
        }
      `}</style>
      {particles.map((p, idx) => (
        <span
          key={idx}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '9999px',
            backgroundColor: '#A78BFA',
            filter: 'blur(0.5px)',
            animation: `adminDustFloat ${p.dur}s linear infinite`,
            animationDelay: `${p.delay}s`,
            '--dust-dx': `${p.dx}px`,
            '--dust-op': p.opacity
          }}
        />
      ))}
    </div>
  );
}

/**
 * AdminPortalTab (Refatorado 100% no padrão https://ethos-landing-7j3.pages.dev/)
 * Focado exclusivamente em:
 * 1. Controle de Acesso & Gestão de Usuários
 * 2. Geração Individual de Tokens (48h)
 * 3. Lista de Espera (Waitlist)
 * 4. Tickets de Suporte
 * 5. Logs & Auditoria de Segurança
 */
export function AdminPortalTab({ onSwitchToApp, onSystemReset, showToast: globalToast }) {
  // Seções da Governança Administrativa
  const [activeSection, setActiveSection] = useState('users'); // 'users' | 'tokens' | 'waitlist' | 'support' | 'security'

  // Estados principais
  const [users, setUsers] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 1. Gestão de Usuários
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'user'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);
  const [modalType, setModalType] = useState(null); // 'permissions' | 'reset-password'
  const [tempPassword, setTempPassword] = useState('');

  // 2. Geração de Tokens (48h)
  const [tokenSelectedUserId, setTokenSelectedUserId] = useState('');
  const [generatedTokensHistory, setGeneratedTokensHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('ethos_admin_recent_tokens');
      return saved ? JSON.parse(saved) : [];
    } catch (_e) {
      return [];
    }
  });
  const [lastGeneratedToken, setLastGeneratedToken] = useState(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // 3. Suporte
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all'); // 'all' | 'open' | 'resolved'
  const [replyTextMap, setReplyTextMap] = useState({});

  // 4. Feedback e Notificações
  const showLocalToast = (msg) => {
    setToastMessage(msg);
    if (globalToast) globalToast(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Carrega todos os dados administrativos autorizados
  const fetchAdminData = async () => {
    setRefreshing(true);
    try {
      const [usersRes, waitlistRes, ticketsRes, logsRes] = await Promise.all([
        apiFetch('/api/admin/users').catch(() => null),
        apiFetch('/api/admin/waitlist').catch(() => null),
        apiFetch('/api/admin/tickets').catch(() => null),
        apiFetch('/api/admin/logs').catch(() => null)
      ]);

      if (usersRes?.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
      if (waitlistRes?.ok) {
        const data = await waitlistRes.json();
        setWaitlist(Array.isArray(data.waitlist) ? data.waitlist : []);
      }
      if (ticketsRes?.ok) {
        const data = await ticketsRes.json();
        setTickets(Array.isArray(data.tickets) ? data.tickets : []);
      }
      if (logsRes?.ok) {
        const data = await logsRes.json();
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      }
    } catch (err) {
      console.error('[Admin Console] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Handlers: Usuários
  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      const res = await apiFetch(`/api/admin/user/${userId}/toggle-active`, {
        method: 'POST'
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: currentStatus ? 0 : 1 } : u))
        );
        showLocalToast(currentStatus ? 'Usuário desativado com sucesso.' : 'Usuário ativado com sucesso.');
      }
    } catch (_err) {
      showLocalToast('Erro ao alternar status do usuário.');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const res = await apiFetch(`/api/admin/user/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        showLocalToast(`Papel alterado para: ${newRole === 'admin' ? 'Administrador' : 'Usuário'}.`);
      }
    } catch (_err) {
      showLocalToast('Erro ao alterar papel.');
    }
  };

  const handleUpdateSubscription = async (userId, tier) => {
    try {
      const res = await apiFetch(`/api/admin/user/${userId}/subscription`, {
        method: 'POST',
        body: JSON.stringify({ tier })
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, subscription_tier: tier } : u)));
        showLocalToast(`Plano atualizado para ${tier}.`);
      }
    } catch (_err) {
      showLocalToast('Erro ao atualizar plano.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForModal || !tempPassword.trim()) return;

    try {
      const res = await apiFetch(`/api/admin/user/${selectedUserForModal.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: tempPassword.trim() })
      });
      if (res.ok) {
        showLocalToast(`Senha de ${selectedUserForModal.name || selectedUserForModal.username} redefinida!`);
        setModalType(null);
        setSelectedUserForModal(null);
        setTempPassword('');
      }
    } catch (_err) {
      showLocalToast('Erro ao redefinir senha.');
    }
  };

  const handleUpdatePermissionsSubmit = async (newPermissions) => {
    if (!selectedUserForModal) return;
    try {
      const res = await apiFetch(`/api/admin/user/${selectedUserForModal.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissions: newPermissions })
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUserForModal.id ? { ...u, permissions: newPermissions } : u
          )
        );
        showLocalToast('Permissões de módulos salvas!');
        setModalType(null);
        setSelectedUserForModal(null);
      }
    } catch (_err) {
      showLocalToast('Erro ao salvar permissões.');
    }
  };

  const handleDeleteUser = async (userObj) => {
    if (
      !window.confirm(
        `Tem certeza que deseja remover o usuário ${userObj.name || userObj.username} (${userObj.email})? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/user/${userObj.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userObj.id));
        showLocalToast('Usuário removido do sistema.');
      }
    } catch (_err) {
      showLocalToast('Erro ao excluir usuário.');
    }
  };

  // Handlers: Geração de Token Individual (48h)
  const handleGenerateIndividualToken = async (targetId) => {
    const targetUserId = targetId || tokenSelectedUserId;
    if (!targetUserId) {
      showLocalToast('Selecione um usuário específico para gerar o token de 48h.');
      return;
    }

    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      showLocalToast('Usuário não localizado na base.');
      return;
    }

    setIsGeneratingToken(true);
    try {
      const res = await apiFetch(`/api/admin/user/${targetUserId}/generate-token-48h`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        const tokenItem = {
          id: `tok_${Date.now()}`,
          userId: targetUser.id,
          userName: targetUser.name || targetUser.username,
          userEmail: targetUser.email,
          token: data.token,
          expiresAt: data.expiresAt || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        };

        setLastGeneratedToken(tokenItem);
        const updated = [tokenItem, ...generatedTokensHistory.slice(0, 19)];
        setGeneratedTokensHistory(updated);
        try {
          localStorage.setItem('ethos_admin_recent_tokens', JSON.stringify(updated));
        } catch (_e) {}

        showLocalToast(
          `Token de 48h gerado com sucesso para ${targetUser.name || targetUser.email}!`
        );
      } else {
        showLocalToast('Falha ao gerar token de 48h no backend.');
      }
    } catch (e) {
      showLocalToast('Erro de conexão ao gerar token.');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Handlers: Waitlist
  const handleDeleteWaitlist = async (waitlistId) => {
    try {
      const res = await apiFetch(`/api/admin/waitlist/${waitlistId}`, { method: 'DELETE' });
      if (res.ok) {
        setWaitlist((prev) => prev.filter((w) => w.id !== waitlistId));
        showLocalToast('Entrada removida da lista de espera.');
      }
    } catch (_e) {
      showLocalToast('Erro ao remover da lista de espera.');
    }
  };

  // Handlers: Suporte
  const handleSendTicketReply = async (ticketId, andResolve = false) => {
    const reply = replyTextMap[ticketId];
    if (!reply || !reply.trim()) {
      showLocalToast('Digite uma resposta antes de enviar.');
      return;
    }

    const currentTicket = tickets.find((t) => t.id === ticketId);
    const targetStatus = andResolve ? 'resolved' : (currentTicket?.status || 'open');

    try {
      const res = await apiFetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: targetStatus,
          adminReply: reply.trim()
        })
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, status: targetStatus, admin_reply: reply.trim(), updated_at: new Date().toISOString() }
              : t
          )
        );
        setReplyTextMap((prev) => ({ ...prev, [ticketId]: '' }));
        showLocalToast(andResolve ? 'Resposta enviada e ticket finalizado como resolvido!' : 'Resposta enviada com sucesso!');
      }
    } catch (_e) {
      showLocalToast('Erro ao responder ticket de suporte.');
    }
  };

  const handleUpdateTicketStatus = async (ticketId, nextStatus) => {
    try {
      const res = await apiFetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: nextStatus
        })
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, status: nextStatus, updated_at: new Date().toISOString() }
              : t
          )
        );
        showLocalToast(nextStatus === 'resolved' ? 'Ticket finalizado como resolvido!' : 'Ticket reaberto em aberto!');
      }
    } catch (_e) {
      showLocalToast('Erro ao atualizar status do ticket.');
    }
  };

  // Handlers: Backup
  const handleDownloadBackup = async () => {
    try {
      const res = await apiFetch('/api/security/backup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ethos_backup_aes256gcm_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showLocalToast('Backup criptografado exportado com sucesso!');
      }
    } catch (_e) {
      showLocalToast('Erro ao gerar backup de segurança.');
    }
  };

  // Usuários filtrados
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !userSearch ||
        (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase()));

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.is_active !== 0) ||
        (statusFilter === 'inactive' && u.is_active === 0);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  // Tickets filtrados
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (ticketStatusFilter === 'open') return t.status === 'open';
      if (ticketStatusFilter === 'resolved') return t.status === 'resolved';
      return true;
    });
  }, [tickets, ticketStatusFilter]);

  // Métricas do Topo
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.is_active !== 0).length;
    const proUsers = users.filter((u) => u.subscription_tier && u.subscription_tier !== 'Gratuito').length;
    const pendingTickets = tickets.filter((t) => t.status === 'open').length;
    const waitlistCount = waitlist.length;

    return { totalUsers, activeUsers, proUsers, pendingTickets, waitlistCount };
  }, [users, tickets, waitlist]);

  return (
    <div
      style={{
        backgroundColor: '#0A0A0C',
        color: '#F3F4F6',
        minHeight: '100vh',
        width: '100%',
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflowX: 'hidden',
        paddingBottom: '80px',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      {/* 0. Partículas Ambientais Ethereal idênticas à Landing Page */}
      <AmbientDust count={30} />

      {/* 1. Barra de Navegação Flutuante de Alto Padrão (Glassmorphism Minimalista) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: 'rgba(10, 10, 12, 0.82)',
          backdropFilter: 'blur(20px) saturate(160%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '14px 28px'
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          {/* Logo & Identidade do Console */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px -6px rgba(139, 92, 246, 0.5)',
                color: '#FFFFFF'
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                  Ethos
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(139, 92, 246, 0.16)',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    color: '#C4B5FD'
                  }}
                >
                  Admin Console
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                Governança, Controle de Acesso & Infraestrutura
              </span>
            </div>
          </div>

          {/* Abas de Navegação (Pills Minimalistas) */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(22, 22, 26, 0.8)',
              padding: '4px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {[
              { id: 'users', label: 'Usuários & Acesso', icon: Users, badge: stats.totalUsers },
              { id: 'tokens', label: 'Tokens (48h)', icon: KeyRound },
              { id: 'waitlist', label: 'Waitlist', icon: Inbox, badge: stats.waitlistCount },
              { id: 'support', label: 'Suporte', icon: LifeBuoy, badge: stats.pendingTickets > 0 ? stats.pendingTickets : null },
              { id: 'security', label: 'Auditoria & Logs', icon: Activity },
              { id: 'profissionais', label: 'Profissionais', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    backgroundColor: isActive ? '#8B5CF6' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#9CA3AF',
                    boxShadow: isActive ? '0 4px 14px rgba(139, 92, 246, 0.35)' : 'none'
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== null && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                        color: isActive ? '#FFFFFF' : '#D1D5DB'
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Ações Rápidas: Atualizar & Voltar ao App */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={refreshing}
              title="Recarregar dados do servidor"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#D1D5DB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: refreshing ? 'wait' : 'pointer'
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {onSwitchToApp && (
              <button
                type="button"
                onClick={onSwitchToApp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <span>Ir para o App</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification Flutuante */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 60,
            backgroundColor: '#16161A',
            border: '1px solid rgba(139, 92, 246, 0.45)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(139, 92, 246, 0.25)',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#F3F4F6',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'fadeInUp 0.3s ease'
          }}
        >
          <Sparkles size={16} color="#A78BFA" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Conteúdo Central */}
      <main style={{ maxWidth: '1240px', margin: '28px auto 0', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Banner de Estatísticas Executivas (Bento Grid) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}
        >
          {[
            {
              label: 'Total de Contas',
              value: stats.totalUsers,
              subtext: `${stats.activeUsers} contas ativas`,
              icon: Users,
              accent: '#8B5CF6'
            },
            {
              label: 'Usuários Ativos',
              value: stats.activeUsers,
              subtext: `${Math.round((stats.activeUsers / Math.max(1, stats.totalUsers)) * 100)}% de retenção`,
              icon: UserCheck,
              accent: '#10B981'
            },
            {
              label: 'Assinaturas Premium',
              value: stats.proUsers,
              subtext: 'Pro & Enterprise',
              icon: Sparkles,
              accent: '#F59E0B'
            },
            {
              label: 'Pessoas na Waitlist',
              value: stats.waitlistCount,
              subtext: 'Cadastros da landing page',
              icon: Inbox,
              accent: '#EC4899'
            },
            {
              label: 'Chamados Pendentes',
              value: stats.pendingTickets,
              subtext: 'Suporte & Dúvidas',
              icon: LifeBuoy,
              accent: stats.pendingTickets > 0 ? '#F87171' : '#38BDF8'
            }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'rgba(22, 22, 26, 0.7)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {stat.label}
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      backgroundColor: `${stat.accent}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: stat.accent
                    }}
                  >
                    <Icon size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </div>
                <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                  {stat.subtext}
                </span>
              </div>
            );
          })}
        </div>

        {/* =================================================================== */}
        {/* SEÇÃO 1: USUÁRIOS & CONTROLE DE ACESSO                              */}
        {/* =================================================================== */}
        {activeSection === 'users' && (
          <section>
            {/* Header da Seção + Busca e Filtros */}
            <div
              style={{
                backgroundColor: 'rgba(22, 22, 26, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '22px 24px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Diretório de Usuários & Controle de Acesso
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9CA3AF' }}>
                    Gerencie contas ativas, permissões de módulos, papéis e gere tokens específicos.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Busca */}
                  <div style={{ position: 'relative', minWidth: '240px' }}>
                    <Search
                      size={15}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }}
                    />
                    <input
                      type="text"
                      placeholder="Buscar por nome, email ou @"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        backgroundColor: 'rgba(10, 10, 12, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '12.5px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Filtro de Role */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                      padding: '9px 14px',
                      backgroundColor: 'rgba(10, 10, 12, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Todos os Papéis</option>
                    <option value="admin">Administrador</option>
                    <option value="user">Usuário Comum</option>
                  </select>

                  {/* Filtro de Status */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '9px 14px',
                      backgroundColor: 'rgba(10, 10, 12, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Apenas Ativos</option>
                    <option value="inactive">Apenas Inativos</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Usuários */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9CA3AF' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Usuário</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Papel (Role)</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Plano</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#6B7280' }}>
                          Nenhum usuário encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isActive = u.is_active !== 0;
                        const isAdmin = u.role === 'admin';
                        return (
                          <tr
                            key={u.id}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              transition: 'background-color 0.15s'
                            }}
                          >
                            {/* Nome & Avatar */}
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    backgroundColor: isAdmin ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                                    color: isAdmin ? '#C4B5FD' : '#FFFFFF',
                                    border: isAdmin ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '12.5px'
                                  }}
                                >
                                  {u.avatar && !u.avatar.startsWith('data:')
                                    ? u.avatar
                                    : (u.name || u.username || 'US').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{u.name || u.username}</div>
                                  <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                                    @{u.username} • {u.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td style={{ padding: '14px' }}>
                              <select
                                value={u.role || 'user'}
                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: isAdmin ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                                  color: isAdmin ? '#C4B5FD' : '#D1D5DB',
                                  border: isAdmin ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="user">Usuário Comum</option>
                                <option value="admin">Administrador</option>
                              </select>
                            </td>

                            {/* Assinatura */}
                            <td style={{ padding: '14px' }}>
                              <select
                                value={u.subscription_tier || 'Gratuito'}
                                onChange={(e) => handleUpdateSubscription(u.id, e.target.value)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                  color: u.subscription_tier === 'Enterprise' ? '#F59E0B' : u.subscription_tier === 'Pro' ? '#38BDF8' : '#D1D5DB',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="Gratuito">Gratuito</option>
                                <option value="Pro">Pro (Mensal/Anual)</option>
                                <option value="Enterprise">Enterprise</option>
                              </select>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '14px' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleUserActive(u.id, isActive)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  color: isActive ? '#34D399' : '#F87171',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isActive ? '#34D399' : '#F87171' }} />
                                <span>{isActive ? 'Ativo' : 'Bloqueado'}</span>
                              </button>
                            </td>

                            {/* Ações */}
                            <td style={{ padding: '14px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {/* Botão Gerar Token 48h */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTokenSelectedUserId(u.id);
                                    setActiveSection('tokens');
                                    handleGenerateIndividualToken(u.id);
                                  }}
                                  title="Gerar Token de 48 horas para este usuário"
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    color: '#C4B5FD',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <KeyRound size={12} />
                                  <span>Gerar Token</span>
                                </button>

                                {/* Permissões */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserForModal(u);
                                    setModalType('permissions');
                                  }}
                                  title="Permissões de Módulos"
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#D1D5DB',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Sliders size={12} />
                                </button>

                                {/* Redefinir Senha */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserForModal(u);
                                    setModalType('reset-password');
                                  }}
                                  title="Redefinir Senha Segura"
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#D1D5DB',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Lock size={12} />
                                </button>

                                {/* Excluir */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  title="Remover Usuário Definitivamente"
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: '#F87171',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* SEÇÃO 2: GERAÇÃO INDIVIDUAL DE TOKENS (48 HORAS)                    */}
        {/* =================================================================== */}
        {activeSection === 'tokens' && (
          <section>
            <div
              style={{
                backgroundColor: 'rgba(22, 22, 26, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '28px',
                marginBottom: '24px'
              }}
            >
              <div style={{ maxWidth: '640px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C4B5FD'
                    }}
                  >
                    <KeyRound size={17} />
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Emissor Oficial de Tokens de Validação (48 Horas)
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#9CA3AF', lineHeight: 1.5 }}>
                  Gere tokens de ativação e acesso de 48h para usuários individuais específicos. O token gerado pode ser copiado em 1 clique ou enviado automaticamente por e-mail com o template oficial.
                </p>
              </div>

              {/* Formulário de Seleção do Usuário Alvo */}
              <div
                style={{
                  marginTop: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                  alignItems: 'end',
                  backgroundColor: 'rgba(10, 10, 12, 0.5)',
                  padding: '20px',
                  borderRadius: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div>
                  <label
                    htmlFor="select-token-user"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#C4B5FD', marginBottom: '8px' }}
                  >
                    Selecione o Usuário Cadastrado:
                  </label>
                  <select
                    id="select-token-user"
                    value={tokenSelectedUserId}
                    onChange={(e) => setTokenSelectedUserId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      backgroundColor: '#16161A',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Escolha um usuário para gerar token --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleGenerateIndividualToken()}
                    disabled={!tokenSelectedUserId || isGeneratingToken}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: !tokenSelectedUserId || isGeneratingToken ? 'not-allowed' : 'pointer',
                      opacity: !tokenSelectedUserId || isGeneratingToken ? 0.5 : 1,
                      boxShadow: '0 6px 20px rgba(139, 92, 246, 0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <KeyRound size={16} />
                    <span>{isGeneratingToken ? 'Gerando Token...' : 'Gerar Token Válido por 48h'}</span>
                  </button>
                </div>
              </div>

              {/* Card de Destaque do Token Gerado */}
              {lastGeneratedToken && (
                <div
                  style={{
                    marginTop: '24px',
                    backgroundColor: 'rgba(139, 92, 246, 0.08)',
                    border: '1.5px solid rgba(139, 92, 246, 0.45)',
                    borderRadius: '20px',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF'
                        }}
                      >
                        ✓ TOKEN ATIVO (48 HORAS)
                      </span>
                      <span style={{ fontSize: '12.5px', color: '#9CA3AF' }}>
                        Destinatário: <strong>{lastGeneratedToken.userName}</strong> ({lastGeneratedToken.userEmail})
                      </span>
                    </div>

                    <div style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '4px', color: '#FFFFFF', margin: '8px 0' }}>
                      {lastGeneratedToken.token}
                    </div>

                    <span style={{ fontSize: '12px', color: '#A78BFA' }}>
                      Expira em: {new Date(lastGeneratedToken.expiresAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(String(lastGeneratedToken.token));
                        showLocalToast('Token copiado para a área de transferência!');
                      }}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '12px',
                        backgroundColor: '#8B5CF6',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
                      }}
                    >
                      <Copy size={14} />
                      <span>Copiar Token</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Histórico dos Tokens Gerados Recentemente */}
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px' }}>
                  Histórico Recente de Tokens Emitidos
                </h3>
                {generatedTokensHistory.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#6B7280' }}>Nenhum token gerado recentemente.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {generatedTokensHistory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: 'rgba(10, 10, 12, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          fontSize: '12.5px'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 800, color: '#C4B5FD', letterSpacing: '1px', marginRight: '10px' }}>
                            {item.token}
                          </span>
                          <span style={{ color: '#D1D5DB' }}>{item.userName}</span>
                          <span style={{ color: '#6B7280', marginLeft: '6px' }}>({item.userEmail})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                            Válido até: {new Date(item.expiresAt).toLocaleDateString('pt-BR')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(String(item.token));
                              showLocalToast('Token copiado!');
                            }}
                            title="Copiar token"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#A78BFA',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* SEÇÃO 3: LISTA DE ESPERA / WAITLIST                                 */}
        {/* =================================================================== */}
        {activeSection === 'waitlist' && (
          <section>
            <div
              style={{
                backgroundColor: 'rgba(22, 22, 26, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '24px',
                marginBottom: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Inscritos na Lista de Espera (Landing Page)
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9CA3AF' }}>
                    Pessoas que solicitaram acesso antecipado ao Ethos.
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    color: '#F472B6',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '999px'
                  }}
                >
                  {waitlist.length} inscrições aguardando
                </div>
              </div>

              {waitlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6B7280' }}>
                  <Inbox size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>Nenhum lead pendente na lista de espera no momento.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {waitlist.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        backgroundColor: 'rgba(10, 10, 12, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '16px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '13.5px' }}>
                          {w.name || w.email?.split('@')[0] || 'Interessado'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                          {w.email} • Inscrito em: {new Date(w.created_at || Date.now()).toLocaleDateString('pt-BR')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            showLocalToast(`Convite preparado para ${w.email}!`);
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid rgba(139, 92, 246, 0.35)',
                            color: '#C4B5FD',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Convidar / Liberar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteWaitlist(w.id)}
                          title="Remover da lista"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#F87171',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* SEÇÃO 4: TICKETS DE SUPORTE                                         */}
        {/* =================================================================== */}
        {activeSection === 'support' && (
          <section>
            <div
              style={{
                backgroundColor: 'rgba(22, 22, 26, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '24px',
                marginBottom: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Central de Chamados & Atendimento aos Usuários
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9CA3AF' }}>
                    Responda dúvidas e feedbacks enviados pelos usuários no aplicativo.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {['all', 'open', 'resolved'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTicketStatusFilter(st)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: ticketStatusFilter === st ? 700 : 500,
                        backgroundColor: ticketStatusFilter === st ? '#8B5CF6' : 'rgba(255, 255, 255, 0.05)',
                        color: ticketStatusFilter === st ? '#FFFFFF' : '#9CA3AF',
                        cursor: 'pointer'
                      }}
                    >
                      {st === 'all' ? 'Todos' : st === 'open' ? 'Em Aberto' : 'Resolvidos'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6B7280' }}>
                  <LifeBuoy size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>Nenhum ticket encontrado nesta categoria.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filteredTickets.map((t) => {
                    const isResolved = t.status === 'resolved';
                    return (
                      <div
                        key={t.id}
                        style={{
                          backgroundColor: 'rgba(10, 10, 12, 0.6)',
                          border: `1px solid ${isResolved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(139, 92, 246, 0.3)'}`,
                          borderRadius: '18px',
                          padding: '18px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                backgroundColor: isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: isResolved ? '#34D399' : '#FBBF24',
                                border: `1px solid ${isResolved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                              }}
                            >
                              {isResolved ? 'RESOLVIDO' : 'EM ABERTO'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#C4B5FD', fontWeight: 600 }}>
                              Assunto: {t.subject || 'Dúvida Geral'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateTicketStatus(t.id, isResolved ? 'open' : 'resolved')}
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: '8px',
                                backgroundColor: isResolved ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: isResolved ? '#FBBF24' : '#34D399',
                                border: `1px solid ${isResolved ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isResolved ? <RefreshCw size={11} /> : <CheckCircle2 size={11} />}
                              <span>{isResolved ? 'Reabrir Chamado' : 'Finalizar como Resolvido'}</span>
                            </button>
                            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
                              {new Date(t.created_at || Date.now()).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: '13.5px', color: '#F3F4F6', lineHeight: 1.5, margin: '10px 0' }}>
                          {t.message || t.description}
                        </div>

                        <div style={{ fontSize: '11.5px', color: '#9CA3AF', marginBottom: '12px' }}>
                          Autor: <strong>{t.user_name || 'Usuário'}</strong> • {t.user_email}
                        </div>

                        {/* Dados da conta só com acesso liberado pelo cliente neste chamado */}
                        <AdminSupportGrant ticketId={t.id} />

                        {/* Resposta do Admin */}
                        {t.admin_reply && (
                          <div
                            style={{
                              backgroundColor: 'rgba(139, 92, 246, 0.08)',
                              borderLeft: '3px solid #8B5CF6',
                              padding: '10px 14px',
                              borderRadius: '0 10px 10px 0',
                              fontSize: '12.5px',
                              color: '#E2E8F0',
                              marginBottom: '10px'
                            }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#C4B5FD', display: 'block', marginBottom: '3px' }}>
                              Resposta da Equipe Ethos:
                            </span>
                            {t.admin_reply}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            placeholder={t.admin_reply ? 'Enviar atualização de resposta...' : 'Digite uma resposta ao usuário...'}
                            value={replyTextMap[t.id] || ''}
                            onChange={(e) => setReplyTextMap({ ...replyTextMap, [t.id]: e.target.value })}
                            style={{
                              flex: '1 1 200px',
                              padding: '9px 12px',
                              backgroundColor: 'rgba(22, 22, 26, 0.8)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '10px',
                              color: '#FFFFFF',
                              fontSize: '12.5px',
                              outline: 'none'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSendTicketReply(t.id, false)}
                            title="Envia a resposta mantendo o status atual do chamado"
                            style={{
                              padding: '9px 14px',
                              borderRadius: '10px',
                              backgroundColor: '#8B5CF6',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Send size={13} />
                            <span>Responder</span>
                          </button>
                          {!isResolved && (
                            <button
                              type="button"
                              onClick={() => handleSendTicketReply(t.id, true)}
                              title="Envia a resposta e finaliza o chamado como resolvido"
                              style={{
                                padding: '9px 14px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                color: '#34D399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Responder e Finalizar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* SEÇÃO 5: LOGS, AUDITORIA & SEGURANÇA                                */}
        {/* =================================================================== */}
        {activeSection === 'profissionais' && (
          <div className="rx-body" style={{ borderRadius: 22, padding: '8px 4px', background: 'var(--rx-bg)' }}>
            <AdminProfissionais showToast={globalToast} />
          </div>
        )}

        {activeSection === 'security' && (
          <section>
            <div
              style={{
                backgroundColor: 'rgba(22, 22, 26, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '24px',
                marginBottom: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Trilha de Auditoria & Segurança de Infraestrutura
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9CA3AF' }}>
                    Monitoramento cronológico de acessos, eventos Anti-IDOR, tentativas de força bruta e backups.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      color: '#C4B5FD',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Download size={14} />
                    <span>Backup AES-256-GCM</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Logs */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9CA3AF' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Evento</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Usuário / IP</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Detalhes</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Horário (ISO)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: '#6B7280' }}>
                          Nenhum log registrado até o momento.
                        </td>
                      </tr>
                    ) : (
                      logs.slice(0, 50).map((l, idx) => {
                        const isSuccess = l.event_type?.includes('SUCCESS') || l.event_type?.includes('LOGIN_SUCCESS');
                        const isWarning = l.event_type?.includes('FAILED') || l.event_type?.includes('BLOCKED');
                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              fontFamily: 'monospace'
                            }}
                          >
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  backgroundColor: isSuccess
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : isWarning
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(139, 92, 246, 0.15)',
                                  color: isSuccess ? '#34D399' : isWarning ? '#F87171' : '#C4B5FD'
                                }}
                              >
                                {l.event_type || 'SYSTEM_EVENT'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#D1D5DB' }}>
                              {l.user_id || l.actor || 'Anônimo'} • {l.ip_address || '127.0.0.1'}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#9CA3AF' }}>
                              {typeof l.metadata === 'object'
                                ? JSON.stringify(l.metadata)
                                : l.details || '—'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6B7280' }}>
                              {new Date(l.created_at || Date.now()).toLocaleTimeString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ===================================================================== */}
      {/* MODAL 1: PERMISSÕES GRANULARES DE MÓDULOS                             */}
      {/* =================================================================== */}
      {modalType === 'permissions' && selectedUserForModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#16161A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Permissões de Módulos
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 20px', lineHeight: 1.45 }}>
              Controle quais abas e funcionalidades o usuário <strong>{selectedUserForModal.name}</strong> pode visualizar:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const nextPerms = {
                  focus: fd.get('focus') === 'on',
                  workouts: fd.get('workouts') === 'on',
                  telemetry: fd.get('telemetry') === 'on',
                  social: fd.get('social') === 'on',
                  habits: fd.get('habits') === 'on'
                };
                handleUpdatePermissionsSubmit(nextPerms);
              }}
            >
              {[
                { id: 'focus', label: 'Modo Foco & Pomodoro' },
                { id: 'workouts', label: 'Módulo de Musculação & Treinos' },
                { id: 'telemetry', label: 'Telemetria & Gráficos DataViz' },
                { id: 'social', label: 'Rede Social & Playlists' },
                { id: 'habits', label: 'Hábitos & Calendário' }
              ].map((item) => {
                const currentPerms = selectedUserForModal.permissions || {
                  focus: true,
                  workouts: true,
                  telemetry: true,
                  social: true,
                  habits: true
                };
                return (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#E2E8F0', fontWeight: 600 }}>{item.label}</span>
                    <input
                      type="checkbox"
                      name={item.id}
                      defaultChecked={currentPerms[item.id] !== false}
                      style={{ width: '16px', height: '16px', accentColor: '#8B5CF6' }}
                    />
                  </label>
                );
              })}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#D1D5DB',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '12px',
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: REDEFINIÇÃO DE SENHA                                        */}
      {/* =================================================================== */}
      {modalType === 'reset-password' && selectedUserForModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#16161A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Redefinir Senha do Usuário
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 16px' }}>
              Informe a nova senha temporária para <strong>{selectedUserForModal.name || selectedUserForModal.username}</strong>:
            </p>

            <form onSubmit={handleResetPasswordSubmit}>
              <input
                type="password"
                placeholder="Nova senha (mínimo 6 caracteres)"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '16px'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#D1D5DB',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={tempPassword.trim().length < 6}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '12px',
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: tempPassword.trim().length < 6 ? 'not-allowed' : 'pointer',
                    opacity: tempPassword.trim().length < 6 ? 0.5 : 1
                  }}
                >
                  Confirmar Redefinição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPortalTab;
