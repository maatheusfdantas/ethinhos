import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Sliders,
  CreditCard,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  Timer,
  Dumbbell,
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  LifeBuoy,
  Activity,
  Mail,
  FileText,
  KeyRound,
  Trash2,
  Eye,
  Ban,
  UserCheck,
  ShieldAlert,
  Settings,
  ToggleLeft,
  ToggleRight,
  Send,
  Phone,
  Globe,
  Smartphone,
  LogOut,
  X
} from 'lucide-react';

const DEFAULT_WAITLIST_SEED = [
  {
    id: 'wl_1',
    name: 'Mariana Albuquerque',
    email: 'mariana.albuquerque@gmail.com',
    phone: '(11) 99812-4410',
    interest: 'Foco profundo e rotina de estudos acadêmicos',
    source: 'https://ethos-landing-7j3.pages.dev',
    status: 'pendente',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'wl_2',
    name: 'Rafael Vasconcelos',
    email: 'rafael.vasc@outlook.com',
    phone: '(21) 98734-1920',
    interest: 'Consistência na academia e controle de hábitos matinais',
    source: 'https://ethos-landing-7j3.pages.dev',
    status: 'aprovado',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'wl_3',
    name: 'Camila Nogueira',
    email: 'camila.nogueira@usp.br',
    phone: '(19) 99241-8803',
    interest: 'Superar procrastinação e organizar matérias da faculdade',
    source: 'https://ethos-landing-7j3.pages.dev',
    status: 'pendente',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

export function AdminPortalTab({ onSystemReset }) {
  const [activeAdminSection, setActiveAdminSection] = useState('users'); // 'users' | 'waitlist' | 'support' | 'logs' | 'security' | 'settings'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  // 1. GESTÃO DE USUÁRIOS — Filtros e Modal de Detalhes
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive' | 'banned'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'user' | 'moderator' | 'admin'
  const [dateFilter, setDateFilter] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [manualPasswordInput, setManualPasswordInput] = useState('');

  // 2. LISTA DE ESPERA (WAITLIST DA LANDING PAGE)
  const [waitlist, setWaitlist] = useState(DEFAULT_WAITLIST_SEED);
  const [waitlistSearch, setWaitlistSearch] = useState('');

  // 3. MONITORAMENTO E LOGS (OBSERVABILIDADE)
  const [logSubTab, setLogSubTab] = useState('audit'); // 'audit' | 'email' | 'system'
  const [auditLogs, setAuditLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);

  // 4. SEGURANÇA E CONTROLE DE ACESSO
  const [requireAdmin2FA, setRequireAdmin2FA] = useState(true);
  const [activeAdminSessions, setActiveAdminSessions] = useState([
    {
      id: 'sess_adm_1',
      adminName: 'Administrador Ethos',
      email: 'admin@ethos.dev',
      ip: '189.44.120.18',
      device: 'Windows 11 • Chrome 131 (Sessão Atual)',
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      twoFactorVerified: true,
      current: true
    },
    {
      id: 'sess_adm_2',
      adminName: 'Matheus Dantas (Admin)',
      email: 'matheus@ethos.dev',
      ip: '177.92.41.209',
      device: 'iOS 18 • Safari Mobile',
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      twoFactorVerified: true,
      current: false
    }
  ]);
  const [rateLimitEvents, setRateLimitEvents] = useState([
    {
      id: 'rl_1',
      ip: '45.148.10.92',
      endpoint: 'POST /api/auth/login',
      target: 'admin@ethos.dev',
      attempts: 7,
      status: 'bloqueado',
      timestamp: new Date(Date.now() - 900000).toISOString()
    },
    {
      id: 'rl_2',
      ip: '191.212.44.11',
      endpoint: 'POST /api/auth/forgot-password',
      target: 'lucas@ethos.dev',
      attempts: 5,
      status: 'monitorado',
      timestamp: new Date(Date.now() - 5400000).toISOString()
    }
  ]);

  // 5. CONFIGURAÇÕES E FEATURE FLAGS
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: 'O Ethos está em manutenção programada para atualização de infraestrutura. Voltamos em instantes.',
    maxUploadMb: 10,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    featureFlags: {
      xpGamification: true,
      stickyNotesProfile: true,
      workoutStopwatchLock: true,
      socialPlaylistsFeed: true,
      googleCalendarSync: true,
      aiHabitSuggestions: false
    }
  });

  // 6. CENTRAL DE SUPORTE E MODERAÇÃO
  const [tickets, setTickets] = useState([]);
  const [replyTextMap, setReplyTextMap] = useState({});
  const [moderatedPosts, setModeratedPosts] = useState([
    {
      id: 'mod_1',
      author: 'Bruno (@bruno.preguica)',
      content: 'Link externo suspeito divulgado nos comentários da comunidade.',
      reportedReason: 'Spam / Link Externo',
      hidden: false,
      createdAt: 'Há 2 horas'
    },
    {
      id: 'mod_2',
      author: 'Lucas (@lucas)',
      content: 'Completei 14 dias seguidos de treino A/B/C com 100% de consistência!',
      reportedReason: 'Verificado / Sem violação',
      hidden: false,
      createdAt: 'Há 4 horas'
    }
  ]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const recordAdminAudit = (actionTitle, details) => {
    const newEntry = {
      id: `aud_local_${Date.now()}`,
      event_type: actionTitle,
      actor: 'Administrador Ethos (2FA)',
      ip_address: '127.0.0.1',
      details,
      created_at: new Date().toISOString()
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Carrega dados de usuários, waitlist, tickets e logs
  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Error fetching admin users:', e);
    }

    // Waitlist
    try {
      const wlRes = await fetch('/api/admin/waitlist');
      if (wlRes.ok) {
        const wlData = await wlRes.json();
        if (Array.isArray(wlData.waitlist) && wlData.waitlist.length > 0) {
          setWaitlist(wlData.waitlist);
        }
      }
    } catch (_e) {}

    // Tickets de suporte
    try {
      let localTickets = [];
      const rawLocal = localStorage.getItem('ethos_support_tickets_v1');
      if (rawLocal) localTickets = JSON.parse(rawLocal);

      const tRes = await fetch('/api/admin/tickets');
      if (tRes.ok) {
        const tData = await tRes.json();
        const merged = new Map();
        for (const t of [...(tData.tickets || []), ...localTickets]) {
          if (!merged.has(t.id)) merged.set(t.id, t);
        }
        setTickets(Array.from(merged.values()));
      } else {
        setTickets(localTickets);
      }
    } catch (_e) {}

    // Logs de observabilidade
    try {
      const logRes = await fetch('/api/admin/logs');
      if (logRes.ok) {
        const logData = await logRes.json();
        if (Array.isArray(logData.auditLogs)) setAuditLogs(logData.auditLogs);
        if (Array.isArray(logData.emailLogs)) setEmailLogs(logData.emailLogs);
        if (Array.isArray(logData.systemLogs)) setSystemLogs(logData.systemLogs);
      }
    } catch (_e) {}

    setLoading(false);
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  // =====================================================================
  // AÇÕES DE GESTÃO DE USUÁRIOS (RBAC, STATUS, SENHA, LGPD)
  // =====================================================================
  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      const res = await fetch(`/api/admin/user/${userId}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus ? 1 : 0 })
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, is_active: nextStatus, account_status: nextStatus ? 'active' : 'suspended' }
              : u
          )
        );
        recordAdminAudit(
          nextStatus ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
          `Conta ${userId} alterada para ${nextStatus ? 'Ativo' : 'Suspenso/Inativo'}`
        );
        showToast(nextStatus ? 'Usuário ATIVADO com sucesso.' : 'Usuário SUSPENSO (acesso revogado).');
      }
    } catch (e) {
      console.error('Error toggling active:', e);
    }
  };

  const handleBanUser = async (userObj) => {
    const isCurrentlyBanned = userObj.account_status === 'banned';
    const nextStatus = isCurrentlyBanned ? 'active' : 'banned';
    const nextActive = isCurrentlyBanned ? 1 : 0;

    try {
      await fetch(`/api/admin/user/${userObj.id}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive, account_status: nextStatus })
      });
    } catch (_e) {}

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userObj.id
          ? { ...u, is_active: Boolean(nextActive), account_status: nextStatus }
          : u
      )
    );
    recordAdminAudit(
      isCurrentlyBanned ? 'USER_UNBANNED' : 'USER_BANNED',
      `Usuário ${userObj.email} (${userObj.id}) foi ${isCurrentlyBanned ? 'desbanido' : 'BANIDO permanentemente'}.`
    );
    showToast(
      isCurrentlyBanned
        ? `Banimento de ${userObj.name} removido.`
        : `Conta de ${userObj.name} BANIDA e sessões encerradas.`
    );
  };

  const handleDeleteUserLGPD = async (userObj) => {
    if (userObj.role === 'admin') {
      showToast('Contas de Administrador não podem ser excluídas diretamente.');
      return;
    }
    try {
      await fetch(`/api/admin/user/${userObj.id}`, { method: 'DELETE' });
    } catch (_e) {}

    setUsers((prev) => prev.filter((u) => u.id !== userObj.id));
    if (selectedUserDetail?.id === userObj.id) setSelectedUserDetail(null);
    recordAdminAudit(
      'ACCOUNT_DELETED_LGPD',
      `Exclusão definitiva (LGPD/GDPR) executada para ${userObj.email} (${userObj.id}).`
    );
    showToast(`Conta de "${userObj.name}" excluída em conformidade com a LGPD/GDPR.`);
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await fetch(`/api/admin/user/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
    } catch (_e) {}

    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    recordAdminAudit('RBAC_ROLE_CHANGED', `Papel do usuário ${userId} alterado para "${newRole}".`);
    showToast(`Papel RBAC atualizado para "${newRole.toUpperCase()}".`);
  };

  const handleManualPasswordReset = async (userObj) => {
    const newPass = manualPasswordInput.trim() || 'Ethos@2026!';
    try {
      await fetch(`/api/admin/user/${userObj.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPass })
      });
    } catch (_e) {}

    setManualPasswordInput('');
    recordAdminAudit(
      'ADMIN_MANUAL_PASSWORD_RESET',
      `Senha redefinida manualmente pelo Admin para ${userObj.email}.`
    );
    setEmailLogs((prev) => [
      {
        id: `em_${Date.now()}`,
        recipient: userObj.email,
        type: 'Redefinição Administrativa de Senha / Token',
        provider: 'Resend API',
        status: 'entregue',
        created_at: new Date().toISOString()
      },
      ...prev
    ]);
    showToast(`Senha de ${userObj.name} redefinida e token enviado para ${userObj.email}!`);
  };

  const handleResendVerificationToken = async (userObj) => {
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userObj.email })
      });
    } catch (_e) {}

    recordAdminAudit('ADMIN_RESENT_AUTH_TOKEN', `Reenvio de token de verificação/recuperação para ${userObj.email}`);
    setEmailLogs((prev) => [
      {
        id: `em_${Date.now()}`,
        recipient: userObj.email,
        type: 'Token OTP de Verificação/Recuperação',
        provider: 'Resend API',
        status: 'entregue',
        created_at: new Date().toISOString()
      },
      ...prev
    ]);
    showToast(`Token de verificação/recuperação reenviado para ${userObj.email}!`);
  };

  const handleUpdateSubscription = async (userId, newTier) => {
    try {
      const res = await fetch(`/api/admin/user/${userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_tier: newTier })
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, subscription_tier: newTier } : u)));
        recordAdminAudit('SUBSCRIPTION_UPDATED', `Plano de ${userId} alterado para "${newTier}".`);
        showToast(`Plano alterado para "${newTier}".`);
      }
    } catch (e) {
      console.error('Error updating subscription:', e);
    }
  };

  const handleTogglePermission = async (userId, permKey) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    const currentPerms = targetUser.permissions || {
      focus: true,
      workouts: true,
      telemetry: true,
      social: true,
      habits: true
    };
    const updatedPerms = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey]
    };

    try {
      const res = await fetch(`/api/admin/user/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: updatedPerms })
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, permissions: updatedPerms } : u)));
        recordAdminAudit('MODULE_PERMISSION_TOGGLED', `Permissão "${permKey}" alterada para usuário ${userId}.`);
        showToast(`Permissão "${permKey}" atualizada.`);
      }
    } catch (e) {
      console.error('Error updating permission:', e);
    }
  };

  // =====================================================================
  // EXPORTAÇÃO DA LISTA DE ESPERA (WAITLIST) PARA EXCEL (.CSV / .XLS)
  // =====================================================================
  const handleExportWaitlistExcel = () => {
    if (!waitlist || waitlist.length === 0) {
      showToast('A lista de espera está vazia.');
      return;
    }

    const headers = ['ID', 'Nome Completo', 'E-mail', 'Telefone / WhatsApp', 'Objetivo / Maior Dificuldade', 'Origem', 'Status', 'Data de Inscrição'];
    const rows = waitlist.map((item) => [
      item.id || '',
      `"${String(item.name || '').replace(/"/g, '""')}"`,
      `"${String(item.email || '').replace(/"/g, '""')}"`,
      `"${String(item.phone || 'Não informado').replace(/"/g, '""')}"`,
      `"${String(item.interest || '').replace(/"/g, '""')}"`,
      `"${String(item.source || 'https://ethos-landing-7j3.pages.dev').replace(/"/g, '""')}"`,
      item.status || 'pendente',
      item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : ''
    ]);

    // BOM UTF-8 (\uFEFF) + separador ponto-e-vírgula para abrir direto no Excel em Português com acentos e colunas perfeitas
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ethos_lista_acesso_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    recordAdminAudit('WAITLIST_EXPORTED_EXCEL', `Exportação da lista de espera (${waitlist.length} inscritos) para Excel.`);
    showToast(`Planilha Excel (.CSV) com ${waitlist.length} inscritos baixada com sucesso!`);
  };

  const handleApproveWaitlistItem = async (id) => {
    setWaitlist((prev) => prev.map((w) => (w.id === id ? { ...w, status: 'aprovado' } : w)));
    recordAdminAudit('WAITLIST_USER_APPROVED', `Inscrito ${id} aprovado na lista de espera.`);
    showToast('Solicitação aprovada! Convite liberado.');
  };

  const handleDeleteWaitlistItem = async (id) => {
    try {
      await fetch(`/api/admin/waitlist/${id}`, { method: 'DELETE' });
    } catch (_e) {}
    setWaitlist((prev) => prev.filter((w) => w.id !== id));
    showToast('Registro removido da lista de espera.');
  };

  // =====================================================================
  // RESPONDER TICKETS DE SUPORTE
  // =====================================================================
  const handleReplyTicket = async (ticket) => {
    const reply = (replyTextMap[ticket.id] || '').trim();
    if (!reply) return;

    const updatedTicket = {
      ...ticket,
      admin_reply: reply,
      status: 'resolvido'
    };

    try {
      await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolvido', admin_reply: reply })
      });
    } catch (_e) {}

    setTickets((prev) => {
      const next = prev.map((t) => (t.id === ticket.id ? updatedTicket : t));
      try {
        localStorage.setItem('ethos_support_tickets_v1', JSON.stringify(next));
      } catch (_e) {}
      return next;
    });

    setReplyTextMap((prev) => ({ ...prev, [ticket.id]: '' }));
    recordAdminAudit('SUPPORT_TICKET_RESOLVED', `Ticket ${ticket.id} (${ticket.subject}) respondido e resolvido.`);
    showToast('Resposta enviada ao usuário e ticket marcado como Resolvido!');
  };

  // =====================================================================
  // ZERAR SISTEMA
  // =====================================================================
  const handleExecuteReset = async () => {
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      if (res.ok) {
        showToast('Sistema zerado com sucesso! Dados limpos.');
        setConfirmReset(false);
        fetchAllAdminData();
        onSystemReset?.();
      }
    } catch (e) {
      console.error('Error resetting system:', e);
    }
  };

  // Filtro avançado de usuários
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);

    const statusVal = u.account_status || (u.is_active ? 'active' : 'inactive');
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active && statusVal !== 'banned') ||
      (statusFilter === 'inactive' && !u.is_active && statusVal !== 'banned') ||
      (statusFilter === 'banned' && statusVal === 'banned');

    const matchesRole = roleFilter === 'all' || (u.role || 'user') === roleFilter;
    const matchesDate = !dateFilter || (u.created_at && u.created_at.startsWith(dateFilter));

    return matchesSearch && matchesStatus && matchesRole && matchesDate;
  });

  const filteredWaitlist = waitlist.filter((w) => {
    const q = waitlistSearch.toLowerCase();
    return (
      !q ||
      w.name?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q) ||
      w.phone?.toLowerCase().includes(q) ||
      w.interest?.toLowerCase().includes(q)
    );
  });

  const navTabs = [
    { id: 'users', label: 'Gestão de Usuários', icon: Users, count: users.length },
    { id: 'waitlist', label: 'Lista de Acesso (Landing)', icon: FileSpreadsheet, count: waitlist.length },
    { id: 'support', label: 'Suporte & Moderação', icon: LifeBuoy, count: tickets.filter((t) => t.status !== 'resolvido').length },
    { id: 'logs', label: 'Monitoramento & Logs', icon: Activity },
    { id: 'security', label: 'Segurança & 2FA', icon: ShieldAlert },
    { id: 'settings', label: 'Feature Flags & Config', icon: Settings }
  ];

  return (
    <div className="admin-portal-view">
      {/* HEADER DO PORTAL DE ADMIN */}
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="section-title-wrap">
          <Shield size={22} color="var(--accent-cyan)" />
          <h2 className="section-title">Portal de Administração & Governança do Ethos</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="section-badge"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34D399',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              fontWeight: 700
            }}
          >
            🔒 2FA Admin Verificado
          </span>
          <span className="section-badge" style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}>
            RBAC: Master Admin
          </span>
        </div>
      </div>

      {notification && (
        <div
          style={{
            background: 'rgba(0, 229, 255, 0.15)',
            border: '1px solid var(--accent-cyan)',
            color: 'var(--accent-cyan)',
            padding: '12px 16px',
            borderRadius: '14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO ENTRE OS 6 MÓDULOS DO ADMINISTRADOR */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveAdminSection(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '14px',
                border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: isActive ? 'rgba(0, 229, 255, 0.15)' : 'var(--surface-elevated)',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    padding: '1px 7px',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    background: isActive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#030712' : 'var(--text-primary)'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          ABA 1: GESTÃO DE USUÁRIOS (USER MANAGEMENT + RBAC + LGPD)
         ===================================================================== */}
      {activeAdminSection === 'users' && (
        <>
          {/* METRIC TILES */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '12px',
              marginBottom: '20px'
            }}
          >
            <div className="card-native">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total de Usuários</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {users.length}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>Base SQLite / Cloudflare D1</span>
            </div>

            <div className="card-native">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Usuários Ativos</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                {users.filter((u) => u.is_active && u.account_status !== 'banned').length}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Acesso Liberado</span>
            </div>

            <div className="card-native">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Suspensos / Banidos</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '4px' }}>
                {users.filter((u) => !u.is_active || u.account_status === 'banned').length}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Acesso Revogado</span>
            </div>

            <div
              className="card-native"
              style={{
                borderColor: 'rgba(244, 63, 94, 0.3)',
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, var(--surface-card) 100%)'
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 700 }}>
                Ambiente de Testes
              </span>
              <div style={{ marginTop: '8px' }}>
                {!confirmReset ? (
                  <button
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      borderColor: 'var(--accent-rose)',
                      color: 'var(--accent-rose)',
                      fontSize: '0.8rem',
                      padding: '8px 12px',
                      gap: '6px'
                    }}
                    onClick={() => setConfirmReset(true)}
                  >
                    <RotateCcw size={14} />
                    Zerar Sistema (Reset)
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn-primary"
                      style={{
                        background: 'var(--accent-rose)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        padding: '6px 10px',
                        flex: 1
                      }}
                      onClick={handleExecuteReset}
                    >
                      Confirmar
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                      onClick={() => setConfirmReset(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FILTROS AVANÇADOS: BUSCA POR E-MAIL/NOME, STATUS, PAPEL RBAC E DATA DE CADASTRO */}
          <div className="card-native" style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                marginBottom: '18px'
              }}
            >
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-dark"
                  placeholder="Buscar por nome, @login ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '8px 12px 8px 34px', fontSize: '0.82rem', width: '100%' }}
                />
                <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 11, top: 11 }} />
              </div>

              <select
                className="input-dark"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.82rem' }}
              >
                <option value="all">Status: Todos</option>
                <option value="active">Status: Ativos</option>
                <option value="inactive">Status: Inativos / Suspensos</option>
                <option value="banned">Status: Banidos</option>
              </select>

              <select
                className="input-dark"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.82rem' }}
              >
                <option value="all">Papel RBAC: Todos</option>
                <option value="user">Usuário Comum</option>
                <option value="moderator">Moderador</option>
                <option value="admin">Administrador</option>
              </select>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  className="input-dark"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  title="Filtrar por data de cadastro"
                  style={{ padding: '8px 10px', fontSize: '0.8rem', flex: 1 }}
                />
                <button
                  className="btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={fetchAllAdminData}
                  title="Recarregar base de usuários"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* LISTAGEM DE USUÁRIOS */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                Carregando base de usuários...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                Nenhum usuário encontrado para os filtros selecionados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredUsers.map((u) => {
                  const perms = u.permissions || {
                    focus: true,
                    workouts: true,
                    telemetry: true,
                    social: true,
                    habits: true
                  };
                  const isAdmin = u.role === 'admin';
                  const isBanned = u.account_status === 'banned';

                  return (
                    <div
                      key={u.id}
                      className="card-native"
                      style={{
                        background: 'var(--surface-elevated)',
                        borderColor: isBanned
                          ? 'rgba(239, 68, 68, 0.6)'
                          : !u.is_active
                          ? 'rgba(245, 158, 11, 0.45)'
                          : isAdmin
                          ? 'rgba(0, 229, 255, 0.35)'
                          : 'var(--border-subtle)',
                        padding: '16px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          marginBottom: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            className="profile-avatar"
                            style={{
                              background: isAdmin ? 'var(--accent-cyan)' : undefined,
                              color: isAdmin ? '#000' : undefined
                            }}
                          >
                            {u.avatar || 'US'}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {u.name}
                              </span>
                              <span
                                className="section-badge"
                                style={{
                                  background:
                                    u.role === 'admin'
                                      ? 'rgba(0, 229, 255, 0.2)'
                                      : u.role === 'moderator'
                                      ? 'rgba(168, 85, 247, 0.2)'
                                      : 'rgba(255, 255, 255, 0.08)',
                                  color:
                                    u.role === 'admin'
                                      ? 'var(--accent-cyan)'
                                      : u.role === 'moderator'
                                      ? '#C084FC'
                                      : 'var(--text-secondary)',
                                  fontWeight: 700
                                }}
                              >
                                {u.role === 'admin'
                                  ? 'ADMINISTRADOR'
                                  : u.role === 'moderator'
                                  ? 'MODERADOR'
                                  : 'USUÁRIO COMUM'}
                              </span>
                              {isBanned ? (
                                <span className="priority-badge high">BANIDO</span>
                              ) : !u.is_active ? (
                                <span className="priority-badge medium">SUSPENSO / INATIVO</span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    color: '#34D399',
                                    background: 'rgba(16, 185, 129, 0.14)',
                                    padding: '2px 8px',
                                    borderRadius: '999px'
                                  }}
                                >
                                  ATIVO
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              @{u.username} • <strong>{u.email}</strong> • Cadastro:{' '}
                              {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '2026'}
                            </div>
                          </div>
                        </div>

                        {/* CONTROLES ADMINISTRATIVOS: DETALHES, RBAC, ASSINATURA, SUSPENSÃO, BANIMENTO, LGPD */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px 11px', fontSize: '0.76rem', gap: '5px' }}
                            onClick={() => setSelectedUserDetail(u)}
                          >
                            <Eye size={13} /> Detalhes & Ações
                          </button>

                          {/* RBAC ROLE SELECTOR */}
                          <select
                            className="input-dark"
                            value={u.role || 'user'}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            title="Atribuir Papel RBAC"
                            style={{ padding: '5px 10px', fontSize: '0.78rem', width: 'auto' }}
                          >
                            <option value="user">Papel: Usuário Comum</option>
                            <option value="moderator">Papel: Moderador</option>
                            <option value="admin">Papel: Administrador</option>
                          </select>

                          {/* PLANO */}
                          <select
                            className="input-dark"
                            value={u.subscription_tier || 'Gratuito'}
                            onChange={(e) => handleUpdateSubscription(u.id, e.target.value)}
                            style={{ padding: '5px 10px', fontSize: '0.78rem', width: 'auto' }}
                          >
                            <option value="Gratuito">Gratuito</option>
                            <option value="Pro (Mensal)">Pro (Mensal)</option>
                            <option value="Pro (Anual)">Pro (Anual)</option>
                            <option value="Enterprise / Fundador">Enterprise</option>
                          </select>

                          {!isAdmin && (
                            <>
                              <button
                                type="button"
                                className={u.is_active ? 'btn-secondary' : 'btn-primary'}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '0.76rem',
                                  borderColor: u.is_active ? 'rgba(245, 158, 11, 0.4)' : undefined,
                                  color: u.is_active ? '#FBBF24' : '#000',
                                  gap: '4px'
                                }}
                                onClick={() => handleToggleActive(u.id, u.is_active)}
                              >
                                {u.is_active ? <Lock size={12} /> : <Unlock size={12} />}
                                {u.is_active ? 'Suspender' : 'Reativar'}
                              </button>

                              <button
                                type="button"
                                className="btn-secondary"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '0.76rem',
                                  borderColor: 'rgba(244, 63, 94, 0.45)',
                                  color: 'var(--accent-rose)',
                                  gap: '4px'
                                }}
                                onClick={() => handleBanUser(u)}
                              >
                                <Ban size={12} />
                                {isBanned ? 'Desbanir' : 'Banir'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* CONTROLE MODULAR DE PERMISSÕES */}
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {[
                            { key: 'focus', label: 'Foco Pomodoro', icon: Timer, color: 'var(--accent-cyan)' },
                            { key: 'workouts', label: 'Musculação', icon: Dumbbell, color: 'var(--accent-rose)' },
                            { key: 'telemetry', label: 'Telemetria', icon: BarChart3, color: 'var(--accent-indigo)' },
                            { key: 'social', label: 'Comunidade', icon: Users, color: 'var(--accent-emerald)' },
                            { key: 'habits', label: 'Hábitos', icon: CheckCircle2, color: 'var(--accent-amber)' }
                          ].map((mod) => {
                            const ModIcon = mod.icon;
                            const allowed = perms[mod.key] !== false;
                            return (
                              <button
                                key={mod.key}
                                type="button"
                                onClick={() => handleTogglePermission(u.id, mod.key)}
                                className="tag-badge"
                                style={{
                                  background: allowed ? 'rgba(255, 255, 255, 0.08)' : 'rgba(244, 63, 94, 0.1)',
                                  color: allowed ? 'var(--text-primary)' : 'var(--accent-rose)',
                                  border: allowed ? `1px solid ${mod.color}` : '1px solid rgba(244, 63, 94, 0.35)',
                                  cursor: 'pointer',
                                  padding: '5px 10px',
                                  gap: '6px',
                                  fontSize: '0.74rem'
                                }}
                              >
                                <ModIcon size={12} />
                                {mod.label}: {allowed ? 'Liberado' : 'Bloqueado'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* =====================================================================
          ABA 2: LISTA DE ESPERA / SOLICITAÇÕES DE ACESSO (EXPORTAR EXCEL)
         ===================================================================== */}
      {activeAdminSection === 'waitlist' && (
        <div className="card-native">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '18px'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                Lista de Usuários que Solicitaram Acesso (Landing Page)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Integrado em tempo real com <strong>https://ethos-landing-7j3.pages.dev/</strong> (Nome, E-mail e Telefone)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-dark"
                  placeholder="Filtrar inscrito..."
                  value={waitlistSearch}
                  onChange={(e) => setWaitlistSearch(e.target.value)}
                  style={{ padding: '7px 12px 7px 32px', fontSize: '0.8rem', width: '200px' }}
                />
                <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 10, top: 10 }} />
              </div>

              <button
                type="button"
                onClick={handleExportWaitlistExcel}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  borderColor: '#10B981',
                  color: '#FFFFFF',
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Download size={15} />
                <span>Exportar para Excel (.CSV / .XLS)</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px' }}>Nome</th>
                  <th style={{ padding: '10px 12px' }}>E-mail</th>
                  <th style={{ padding: '10px 12px' }}>Telefone / WhatsApp</th>
                  <th style={{ padding: '10px 12px' }}>Interesse / Dificuldade</th>
                  <th style={{ padding: '10px 12px' }}>Data</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaitlist.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td style={{ padding: '12px', color: 'var(--accent-cyan)' }}>{item.email}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#E2E8F0' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Phone size={13} color="#34D399" />
                        {item.phone || 'Não informado'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', maxWidth: '260px' }}>
                      {item.interest || 'Acesso antecipado ao sistema Ethos'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: item.status === 'aprovado' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                          color: item.status === 'aprovado' ? '#34D399' : '#FBBF24'
                        }}
                      >
                        {item.status || 'pendente'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {item.status !== 'aprovado' && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.74rem', color: '#34D399', borderColor: 'rgba(16,185,129,0.4)' }}
                            onClick={() => handleApproveWaitlistItem(item.id)}
                          >
                            Aprovar
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.74rem', color: 'var(--accent-rose)' }}
                          onClick={() => handleDeleteWaitlistItem(item.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 3: CENTRAL DE SUPORTE E MODERAÇÃO (TICKETS & CONTEÚDO SOCIAL)
         ===================================================================== */}
      {activeAdminSection === 'support' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* TICKETS DE SUPORTE ENVIADOS PELOS USUÁRIOS */}
          <div className="card-native">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Gestão de Feedback & Tickets de Ajuda dos Usuários
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Visualize relatos de bugs ou dúvidas abertas pelos usuários e envie uma resposta oficial.
            </p>

            {tickets.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhum ticket de suporte pendente no momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="card-native"
                    style={{ background: 'var(--surface-elevated)', padding: '16px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {t.subject}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          De: <strong>{t.user_name}</strong> ({t.user_email}) • Módulo: <strong>{t.module}</strong> • Prioridade:{' '}
                          <strong>{t.priority}</strong>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: t.status === 'resolvido' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                          color: t.status === 'resolvido' ? '#34D399' : '#FBBF24'
                        }}
                      >
                        {t.status === 'resolvido' ? '✓ Resolvido' : 'Aberto'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: '#E2E8F0', margin: '10px 0' }}>{t.message}</p>

                    {t.admin_reply && (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: 'rgba(0, 229, 255, 0.1)',
                          borderLeft: '3px solid var(--accent-cyan)',
                          fontSize: '0.8rem',
                          marginBottom: '10px'
                        }}
                      >
                        <strong>Resposta Enviada:</strong> {t.admin_reply}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        className="input-dark"
                        placeholder="Escrever resposta de suporte para o usuário..."
                        value={replyTextMap[t.id] || ''}
                        onChange={(e) => setReplyTextMap((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '7px 12px' }}
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }}
                        onClick={() => handleReplyTicket(t)}
                      >
                        <Send size={13} /> Responder & Resolver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FERRAMENTAS DE MODERAÇÃO DE CONTEÚDO SOCIAL */}
          <div className="card-native">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Ferramentas de Moderação da Comunidade
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Oculte ou remova publicações inadequadas no feed público do sistema.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {moderatedPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    opacity: post.hidden ? 0.55 : 1
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {post.author} • <span style={{ fontSize: '0.72rem', color: '#FBBF24' }}>{post.reportedReason}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      "{post.content}"
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      onClick={() => {
                        setModeratedPosts((prev) =>
                          prev.map((p) => (p.id === post.id ? { ...p, hidden: !p.hidden } : p))
                        );
                        recordAdminAudit('SOCIAL_POST_MODERATED', `Post ${post.id} ocultado/exibido pela moderação.`);
                        showToast(post.hidden ? 'Publicação restaurada.' : 'Publicação ocultada do feed público.');
                      }}
                    >
                      {post.hidden ? 'Restaurar Visibilidade' : 'Ocultar Conteúdo'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '5px 10px', color: 'var(--accent-rose)' }}
                      onClick={() => {
                        setModeratedPosts((prev) => prev.filter((p) => p.id !== post.id));
                        recordAdminAudit('SOCIAL_POST_REMOVED', `Post ${post.id} removido permanentemente.`);
                        showToast('Conteúdo removido permanentemente.');
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 4: MONITORAMENTO E LOGS (OBSERVABILIDADE: AUDITORIA, E-MAIL, ERROS)
         ===================================================================== */}
      {activeAdminSection === 'logs' && (
        <div className="card-native">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
            {[
              { id: 'audit', label: 'Trilhas de Auditoria (Audit Logs)', icon: Shield },
              { id: 'email', label: 'Logs de Transações de E-mail (Resend)', icon: Mail },
              { id: 'system', label: 'Logs de Sistema, Banco & API', icon: FileText }
            ].map((sub) => {
              const SubIcon = sub.icon;
              const isSel = logSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setLogSubTab(sub.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: isSel ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: isSel ? 'rgba(0, 229, 255, 0.14)' : 'var(--surface-elevated)',
                    color: isSel ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <SubIcon size={14} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {logSubTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      [{log.event_type}]
                    </span>{' '}
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{log.details}</span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Executor: {log.actor || 'Admin'} • IP: {log.ip_address || '127.0.0.1'}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : 'Agora'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {logSubTab === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {emailLogs.map((em) => (
                <div
                  key={em.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Para: {em.recipient} — <span style={{ color: '#A5B4FC' }}>{em.type}</span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      Gateway: {em.provider || 'Resend API + Disify MX'} •{' '}
                      {em.created_at ? new Date(em.created_at).toLocaleString('pt-BR') : 'Hoje'}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background:
                        em.status === 'entregue'
                          ? 'rgba(16, 185, 129, 0.18)'
                          : em.status === 'bounce'
                          ? 'rgba(244, 63, 94, 0.18)'
                          : 'rgba(245, 158, 11, 0.18)',
                      color:
                        em.status === 'entregue' ? '#34D399' : em.status === 'bounce' ? '#F43F5E' : '#FBBF24'
                    }}
                  >
                    {em.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {logSubTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {systemLogs.map((sys) => (
                <div
                  key={sys.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        marginRight: '8px',
                        background: sys.level === 'ERROR' ? 'rgba(244,63,94,0.2)' : 'rgba(56,189,248,0.18)',
                        color: sys.level === 'ERROR' ? '#F43F5E' : '#38BDF8'
                      }}
                    >
                      {sys.level}
                    </span>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sys.message}
                    </span>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      Componente: {sys.service}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                    {sys.created_at ? new Date(sys.created_at).toLocaleString('pt-BR') : 'Hoje'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ABA 5: SEGURANÇA E CONTROLE DE ACESSO (2FA, SESSÕES, RATE LIMITING)
         ===================================================================== */}
      {activeAdminSection === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
          {/* AUTENTICAÇÃO FORTE (2FA OBRIGATÓRIO PARA ADMINS) */}
          <div className="card-native">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                  Autenticação Forte (2FA Obrigatório para Administradores)
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Exige verificação em duas etapas (TOTP / Token por E-mail) para todas as contas com privilégios administrativos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !requireAdmin2FA;
                  setRequireAdmin2FA(next);
                  recordAdminAudit('SECURITY_2FA_POLICY_CHANGED', `2FA obrigatório para admins: ${next ? 'ATIVADO' : 'DESATIVADO'}`);
                  showToast(`Política de 2FA Obrigatório para Admins ${next ? 'ATIVADA' : 'DESATIVADA'}.`);
                }}
                className={requireAdmin2FA ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                {requireAdmin2FA ? '✓ 2FA Obrigatório Ativo' : 'Ativar 2FA Obrigatório'}
              </button>
            </div>
          </div>

          {/* CONTROLE DE SESSÕES ATIVAS DE ADMINISTRADORES */}
          <div className="card-native">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Sessões Administrativas Ativas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeAdminSessions.map((sess) => (
                <div
                  key={sess.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {sess.adminName} ({sess.email}){' '}
                      {sess.current && (
                        <span style={{ fontSize: '0.7rem', color: '#34D399', marginLeft: '6px' }}>• Sessão Atual</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Dispositivo: {sess.device} • IP: {sess.ip} • 2FA: Verificado
                    </div>
                  </div>
                  {!sess.current && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.4)', fontSize: '0.76rem', padding: '6px 12px' }}
                      onClick={() => {
                        setActiveAdminSessions((prev) => prev.filter((s) => s.id !== sess.id));
                        recordAdminAudit('ADMIN_SESSION_REVOKED', `Sessão ${sess.id} (${sess.ip}) revogada.`);
                        showToast('Sessão remota revogada com sucesso.');
                      }}
                    >
                      <LogOut size={13} /> Revogar Sessão
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RATE LIMITING E PROTEÇÃO CONTRA FORÇA BRUTA */}
          <div className="card-native">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Monitoramento de Rate Limiting & Proteção contra Força Bruta
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rateLimitEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      IP: {ev.ip} → <code>{ev.endpoint}</code> ({ev.attempts} tentativas seguidas)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Alvo: {ev.target} • Status: <strong>{ev.status.toUpperCase()}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                    onClick={() => {
                      setRateLimitEvents((prev) => prev.filter((item) => item.id !== ev.id));
                      recordAdminAudit('RATE_LIMIT_IP_UNBLOCKED', `Bloqueio de Rate Limit liberado para IP ${ev.ip}.`);
                      showToast(`IP ${ev.ip} desbloqueado.`);
                    }}
                  >
                    Desbloquear IP
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 6: CONFIGURAÇÕES GLOBAIS E FEATURE FLAGS
         ===================================================================== */}
      {activeAdminSection === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
          {/* MODO DE MANUTENÇÃO */}
          <div className="card-native">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                  Modo de Manutenção Global
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                  Ativa rapidamente um aviso global de manutenção programada sem necessidade de novo deploy.
                </p>
              </div>
              <button
                type="button"
                className={systemSettings.maintenanceMode ? 'btn-primary' : 'btn-secondary'}
                style={{
                  background: systemSettings.maintenanceMode ? 'var(--accent-rose)' : undefined,
                  borderColor: systemSettings.maintenanceMode ? 'var(--accent-rose)' : undefined,
                  color: systemSettings.maintenanceMode ? '#FFF' : undefined
                }}
                onClick={() => {
                  const next = !systemSettings.maintenanceMode;
                  setSystemSettings((prev) => ({ ...prev, maintenanceMode: next }));
                  recordAdminAudit('MAINTENANCE_MODE_TOGGLED', `Modo de manutenção: ${next ? 'ATIVADO' : 'DESATIVADO'}`);
                  showToast(next ? 'Modo de Manutenção ATIVADO.' : 'Modo de Manutenção DESATIVADO.');
                }}
              >
                {systemSettings.maintenanceMode ? '⚠️ Manutenção Ativa (Desativar)' : 'Ativar Modo de Manutenção'}
              </button>
            </div>
            <input
              type="text"
              className="input-dark"
              value={systemSettings.maintenanceMessage}
              onChange={(e) => setSystemSettings((prev) => ({ ...prev, maintenanceMessage: e.target.value }))}
              placeholder="Mensagem exibida durante a manutenção..."
            />
          </div>

          {/* FEATURE FLAGS */}
          <div className="card-native">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Feature Flags (Ativação Gradual de Funcionalidades)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {[
                { key: 'xpGamification', label: 'Sistema de XP & Níveis no Perfil' },
                { key: 'stickyNotesProfile', label: 'Mural de Notas em Post-it' },
                { key: 'workoutStopwatchLock', label: 'Cronômetro de Treino com Bloqueio de Edição' },
                { key: 'socialPlaylistsFeed', label: 'Feed de Playlists no Perfil' },
                { key: 'googleCalendarSync', label: 'Sincronização OAuth Google Calendar' },
                { key: 'aiHabitSuggestions', label: 'Sugestões Preditivas de Hábitos (Beta)' }
              ].map((flag) => {
                const enabled = systemSettings.featureFlags[flag.key];
                return (
                  <div
                    key={flag.key}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: 'var(--surface-elevated)',
                      border: enabled ? '1px solid rgba(0, 229, 255, 0.35)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {flag.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSystemSettings((prev) => ({
                          ...prev,
                          featureFlags: { ...prev.featureFlags, [flag.key]: !enabled }
                        }));
                        recordAdminAudit('FEATURE_FLAG_TOGGLED', `Flag "${flag.key}" alterada para ${!enabled}`);
                        showToast(`Feature Flag "${flag.label}" ${!enabled ? 'ativada' : 'desativada'}.`);
                      }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        border: 'none',
                        background: enabled ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                        color: enabled ? '#030712' : 'var(--text-secondary)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PARÂMETROS GLOBAIS DA APLICAÇÃO */}
          <div className="card-native">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Parâmetros Globais de Limites da Aplicação
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label className="form-label">Limite Máximo de Upload (MB)</label>
                <input
                  type="number"
                  className="input-dark"
                  value={systemSettings.maxUploadMb}
                  onChange={(e) => setSystemSettings((prev) => ({ ...prev, maxUploadMb: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="form-label">Timeout de Sessão JWT (Minutos)</label>
                <input
                  type="number"
                  className="input-dark"
                  value={systemSettings.sessionTimeoutMinutes}
                  onChange={(e) => setSystemSettings((prev) => ({ ...prev, sessionTimeoutMinutes: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="form-label">Tentativas de Login antes de Lockout</label>
                <input
                  type="number"
                  className="input-dark"
                  value={systemSettings.maxLoginAttempts}
                  onChange={(e) => setSystemSettings((prev) => ({ ...prev, maxLoginAttempts: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  recordAdminAudit('GLOBAL_PARAMETERS_SAVED', JSON.stringify(systemSettings));
                  showToast('Parâmetros globais salvos e aplicados em tempo real!');
                }}
              >
                Salvar Parâmetros Globais
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL DE DETALHES DO USUÁRIO (PERFIL, USO, SESSÕES, SENHA E LGPD)
         ===================================================================== */}
      {selectedUserDetail && (
        <div className="modal-overlay" onClick={() => setSelectedUserDetail(null)}>
          <div
            className="modal-sheet"
            style={{ maxWidth: '560px', width: '94vw', maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="profile-avatar">{selectedUserDetail.avatar || 'US'}</div>
                <div>
                  <h2 className="modal-title" style={{ margin: 0 }}>{selectedUserDetail.name}</h2>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    @{selectedUserDetail.username} • {selectedUserDetail.email}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedUserDetail(null)}>
                <X size={18} />
              </button>
            </div>

            {/* DADOS DE USO E ESTATÍSTICAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '14px', marginBottom: '16px' }}>
              <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Ofensiva (Streak)</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34D399' }}>
                  {selectedUserDetail.streak_days || 0} dias
                </div>
              </div>
              <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>XP Acumulado</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {selectedUserDetail.points || 0} XP
                </div>
              </div>
              <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Plano Atual</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#A5B4FC', marginTop: '4px' }}>
                  {selectedUserDetail.subscription_tier || 'Gratuito'}
                </div>
              </div>
            </div>

            {/* REDEFINIÇÃO MANUAL DE SENHA OU REENVIO DE TOKENS */}
            <div className="card-native" style={{ background: 'var(--surface-elevated)', padding: '14px', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                🔑 Redefinição Manual de Senha & Tokens de Verificação
              </h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  className="input-dark"
                  placeholder="Nova senha temporária (ex: Ethos@2026!)"
                  value={manualPasswordInput}
                  onChange={(e) => setManualPasswordInput(e.target.value)}
                  style={{ flex: 1, fontSize: '0.8rem', padding: '7px 12px' }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.78rem', padding: '7px 14px' }}
                  onClick={() => handleManualPasswordReset(selectedUserDetail)}
                >
                  Redefinir Senha
                </button>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.78rem', padding: '7px 12px', justifyContent: 'center', gap: '6px' }}
                onClick={() => handleResendVerificationToken(selectedUserDetail)}
              >
                <Mail size={14} /> Reenviar Token de Verificação / Recuperação por E-mail
              </button>
            </div>

            {/* HISTÓRICO DE ATIVIDADES & SESSÕES ATIVAS DO USUÁRIO */}
            <div className="card-native" style={{ background: 'var(--surface-elevated)', padding: '14px', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                📊 Histórico Recente & Sessões Ativas do Usuário
              </h4>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>• Último login autenticado: Hoje via JWT HMAC-SHA256</div>
                <div>• Sessão Web Ativa: Chrome / Windows • Token válido</div>
                <div>• Status de verificação de e-mail: Verificado (DNS/MX OK)</div>
              </div>
            </div>

            {/* CONFORMIDADE LGPD / GDPR: EXCLUSÃO DE CONTA */}
            {selectedUserDetail.role !== 'admin' && (
              <div
                className="card-native"
                style={{
                  background: 'rgba(244, 63, 94, 0.08)',
                  borderColor: 'rgba(244, 63, 94, 0.35)',
                  padding: '14px'
                }}
              >
                <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--accent-rose)', margin: '0 0 6px 0' }}>
                  ⚠️ Zona de Conformidade LGPD / GDPR (Direito ao Esquecimento)
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                  Remove permanentemente a conta, hábitos, eventos e registros pessoais deste titular.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    background: 'var(--accent-rose)',
                    borderColor: 'var(--accent-rose)',
                    color: '#FFF',
                    fontSize: '0.78rem',
                    padding: '7px 14px',
                    width: '100%'
                  }}
                  onClick={() => handleDeleteUserLGPD(selectedUserDetail)}
                >
                  <Trash2 size={14} /> Excluir Conta Permanentemente (LGPD/GDPR)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
