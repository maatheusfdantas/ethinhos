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
  Calendar
} from 'lucide-react';

export function AdminPortalTab({ onSystemReset }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  // Fetch users from SQLite DB
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Error fetching admin users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Toggle user active status (Ativar / Desativar usuário)
  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      const res = await fetch(`/api/admin/user/${userId}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus ? 1 : 0 })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: nextStatus } : u));
        showToast(nextStatus ? 'Usuário ATIVADO com sucesso.' : 'Usuário DESATIVADO (acesso revogado).');
      }
    } catch (e) {
      console.error('Error toggling active:', e);
    }
  };

  // Update Subscription Tier
  const handleUpdateSubscription = async (userId, newTier) => {
    try {
      const res = await fetch(`/api/admin/user/${userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_tier: newTier })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_tier: newTier } : u));
        showToast(`Plano alterado para "${newTier}".`);
      }
    } catch (e) {
      console.error('Error updating subscription:', e);
    }
  };

  // Toggle modular permission
  const handleTogglePermission = async (userId, permKey) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const currentPerms = targetUser.permissions || { focus: true, workouts: true, telemetry: true, social: true, habits: true };
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
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: updatedPerms } : u));
        showToast(`Permissão "${permKey}" atualizada.`);
      }
    } catch (e) {
      console.error('Error updating permission:', e);
    }
  };

  // Wipe / Zerar sistema completamente (Requisito 5)
  const handleExecuteReset = async () => {
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      if (res.ok) {
        showToast('Sistema zerado com sucesso! Dados limpos.');
        setConfirmReset(false);
        fetchUsers();
        onSystemReset?.();
      }
    } catch (e) {
      console.error('Error resetting system:', e);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-portal-view">
      {/* HEADER DO PORTAL DE ADMIN */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Shield size={22} color="var(--accent-cyan)" />
          <h2 className="section-title">Portal de Administração do Ethos</h2>
        </div>
        <span className="section-badge" style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}>
          Acesso Master (Admin)
        </span>
      </div>

      {notification && (
        <div style={{ background: 'rgba(0, 229, 255, 0.15)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '12px 16px', borderRadius: '14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', fontWeight: 600 }}>
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* METRIC TILES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        <div className="card-native">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total de Usuários</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {users.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>Cadastrados no SQLite</span>
        </div>

        <div className="card-native">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Usuários Ativos</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {users.filter(u => u.is_active).length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Acesso Liberado</span>
        </div>

        <div className="card-native">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Desativados / Bloqueados</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '4px' }}>
            {users.filter(u => !u.is_active).length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Acesso Revogado</span>
        </div>

        {/* ZERAR SISTEMA CARD (Requisito 5) */}
        <div className="card-native" style={{ borderColor: 'rgba(244, 63, 94, 0.3)', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, var(--surface-card) 100%)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 700 }}>Ambiente de Testes</span>
          <div style={{ marginTop: '8px' }}>
            {!confirmReset ? (
              <button 
                className="btn-secondary" 
                style={{ width: '100%', borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)', fontSize: '0.8rem', padding: '8px 12px', gap: '6px' }}
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw size={14} />
                Zerar Sistema (Reset Limpo)
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="btn-primary"
                  style={{ background: 'var(--accent-rose)', color: '#fff', fontSize: '0.75rem', padding: '6px 10px', flex: 1 }}
                  onClick={handleExecuteReset}
                >
                  Confirmar Zerar
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
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
            Limpa tarefas e dados para teste do zero.
          </span>
        </div>
      </div>

      {/* GESTÃO DE USUÁRIOS, ASSINATURAS E PERMISSÕES */}
      <div className="card-native" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Controle de Assinaturas & Permissões por Usuário
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="Filtrar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '6px 12px 6px 32px', fontSize: '0.82rem', width: '190px' }}
              />
              <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 10, top: 10 }} />
            </div>

            <button 
              className="btn-secondary" 
              style={{ padding: '6px 10px' }}
              onClick={fetchUsers}
              title="Recarregar do banco"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* LISTA DE USUÁRIOS */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            Carregando usuários do banco de dados SQLite...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredUsers.map((u) => {
              const perms = u.permissions || { focus: true, workouts: true, telemetry: true, social: true, habits: true };
              const isAdmin = u.role === 'admin';

              return (
                <div 
                  key={u.id} 
                  className="card-native" 
                  style={{ 
                    background: 'var(--surface-elevated)', 
                    borderColor: !u.is_active ? 'rgba(244, 63, 94, 0.4)' : isAdmin ? 'rgba(0, 229, 255, 0.3)' : 'var(--border-subtle)',
                    padding: '16px' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    {/* INFO DO USUÁRIO */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="profile-avatar" style={{ background: isAdmin ? 'var(--accent-cyan)' : undefined, color: isAdmin ? '#000' : undefined }}>
                        {u.avatar || 'US'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {u.name}
                          </span>
                          {isAdmin && (
                            <span className="section-badge" style={{ background: 'rgba(0, 229, 255, 0.2)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                              ADMIN
                            </span>
                          )}
                          {!u.is_active && (
                            <span className="priority-badge high">
                              DESATIVADO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          login: <strong>{u.username}</strong> | {u.email}
                        </div>
                      </div>
                    </div>

                    {/* AÇÕES DE ASSINATURA E STATUS */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* CONTROLE DE ASSINATURA */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={14} color="var(--accent-indigo)" />
                        <select 
                          className="input-dark" 
                          value={u.subscription_tier}
                          onChange={(e) => handleUpdateSubscription(u.id, e.target.value)}
                          style={{ padding: '4px 10px', fontSize: '0.8rem', width: 'auto' }}
                        >
                          <option value="Gratuito">Gratuito</option>
                          <option value="Pro (Mensal)">Pro (Mensal)</option>
                          <option value="Pro (Anual)">Pro (Anual)</option>
                          <option value="Enterprise / Fundador">Enterprise</option>
                        </select>
                      </div>

                      {/* ATIVAR / DESATIVAR BOTÃO */}
                      {!isAdmin && (
                        <button 
                          className={u.is_active ? 'btn-secondary' : 'btn-primary'}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            borderColor: u.is_active ? 'rgba(244, 63, 94, 0.4)' : undefined,
                            color: u.is_active ? 'var(--accent-rose)' : '#000',
                            gap: '4px'
                          }}
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                        >
                          {u.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                          {u.is_active ? 'Desativar Conta' : 'Ativar Conta'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CONTROLE MODULAR DE PERMISSÕES (O que cada um tem acesso) */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                      Permissões de Acesso aos Módulos do Sistema:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {/* FOCUS */}
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(u.id, 'focus')}
                        className="tag-badge"
                        style={{
                          background: perms.focus ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: perms.focus ? 'var(--accent-cyan)' : 'var(--text-muted)',
                          border: perms.focus ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          gap: '6px'
                        }}
                      >
                        <Timer size={13} />
                        Foco Pomodoro: {perms.focus ? 'Liberado' : 'Bloqueado'}
                      </button>

                      {/* WORKOUTS */}
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(u.id, 'workouts')}
                        className="tag-badge"
                        style={{
                          background: perms.workouts ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: perms.workouts ? 'var(--accent-rose)' : 'var(--text-muted)',
                          border: perms.workouts ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          gap: '6px'
                        }}
                      >
                        <Dumbbell size={13} />
                        Musculação: {perms.workouts ? 'Liberado' : 'Bloqueado'}
                      </button>

                      {/* TELEMETRY */}
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(u.id, 'telemetry')}
                        className="tag-badge"
                        style={{
                          background: perms.telemetry ? 'rgba(129, 140, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: perms.telemetry ? 'var(--accent-indigo)' : 'var(--text-muted)',
                          border: perms.telemetry ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          gap: '6px'
                        }}
                      >
                        <BarChart3 size={13} />
                        Telemetria: {perms.telemetry ? 'Liberado' : 'Bloqueado'}
                      </button>

                      {/* SOCIAL */}
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(u.id, 'social')}
                        className="tag-badge"
                        style={{
                          background: perms.social ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: perms.social ? 'var(--accent-emerald)' : 'var(--text-muted)',
                          border: perms.social ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          gap: '6px'
                        }}
                      >
                        <Users size={13} />
                        Social & Feed: {perms.social ? 'Liberado' : 'Bloqueado'}
                      </button>

                      {/* HABITS */}
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(u.id, 'habits')}
                        className="tag-badge"
                        style={{
                          background: perms.habits ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: perms.habits ? 'var(--accent-amber)' : 'var(--text-muted)',
                          border: perms.habits ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Hábitos Ilimitados: {perms.habits ? 'Liberado' : 'Bloqueado'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
