import React, { useState, useEffect } from 'react';
import { SupportAccessPanel } from './support/SupportAccessPanel';
import {
  LifeBuoy,
  Send,
  X,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Bug
} from 'lucide-react';

const TICKET_CATEGORIES = [
  { id: 'bug', label: 'Bug / Erro no Sistema', icon: Bug, color: '#F43F5E' },
  { id: 'duvida', label: 'Dúvida sobre Funcionalidade', icon: HelpCircle, color: '#38BDF8' },
  { id: 'conta', label: 'Minha Conta & Acesso', icon: AlertCircle, color: '#F59E0B' },
  { id: 'sugestao', label: 'Sugestão de Melhoria', icon: Sparkles, color: '#10B981' }
];

const SYSTEM_MODULES = [
  'Geral / Todo o Sistema',
  'Painel Principal & Categorias',
  'Hábitos & Rotinas',
  'Maus Hábitos & Vícios',
  'Agenda Semanal',
  'Musculação & Treino',
  'Foco Pomodoro',
  'Perfil do Usuário & XP',
  'Comunidade & Conexões'
];

export function SupportModal({ isOpen, onClose, user, showToast }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('duvida');
  const [moduleName, setModuleName] = useState(SYSTEM_MODULES[0]);
  const [priority, setPriority] = useState('Média');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState([]);

  const loadTickets = async () => {
    let localTickets = [];
    try {
      const raw = localStorage.getItem('ethos_support_tickets_v1');
      if (raw) localTickets = JSON.parse(raw);
    } catch (_e) {}

    try {
      const userIdParam = user?.id ? `?userId=${encodeURIComponent(user.id)}` : '';
      const res = await fetch(`/api/support/tickets${userIdParam}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tickets)) {
          const mergedMap = new Map();
          for (const t of [...data.tickets, ...localTickets]) {
            if (!mergedMap.has(t.id)) mergedMap.set(t.id, t);
          }
          const allList = Array.from(mergedMap.values());
          localStorage.setItem('ethos_support_tickets_v1', JSON.stringify(allList));
          setMyTickets(
            user?.id
              ? allList.filter((t) => t.user_id === user.id || t.user_email === user.email)
              : allList
          );
          return;
        }
      }
    } catch (_e) {}

    setMyTickets(
      user?.id
        ? localTickets.filter((t) => t.user_id === user.id || t.user_email === user.email)
        : localTickets
    );
  };

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    const newTicket = {
      id: `tkt_${Date.now()}`,
      user_id: user?.id || 'usr_guest',
      user_name: user?.name || 'Usuário Ethos',
      user_email: user?.email || 'usuario@ethos.dev',
      subject: subject.trim(),
      category,
      module: moduleName,
      priority,
      message: message.trim(),
      status: 'aberto',
      admin_reply: '',
      created_at: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem('ethos_support_tickets_v1');
      const prev = raw ? JSON.parse(raw) : [];
      localStorage.setItem('ethos_support_tickets_v1', JSON.stringify([newTicket, ...prev]));
    } catch (_e) {}

    try {
      await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket)
      });
    } catch (_e) {}

    setMyTickets((prev) => [newTicket, ...prev]);
    setSubject('');
    setMessage('');
    setSubmitting(false);
    setActiveTab('history');
    showToast?.('Ticket de suporte enviado com sucesso! Nossa equipe responderá em breve.');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '580px', width: '94vw', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.16)',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LifeBuoy size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ margin: 0 }}>Central de Ajuda & Suporte</h2>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Abra um chamado técnico ou acompanhe respostas da administração
              </span>
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '12px',
              border: activeTab === 'new' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              background: activeTab === 'new' ? 'rgba(0, 229, 255, 0.14)' : 'var(--surface-elevated)',
              color: activeTab === 'new' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + Abrir Novo Ticket
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '12px',
              border: activeTab === 'history' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              background: activeTab === 'history' ? 'rgba(0, 229, 255, 0.14)' : 'var(--surface-elevated)',
              color: activeTab === 'history' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Meus Chamados ({myTickets.length})
          </button>
        </div>

        {activeTab === 'new' ? (
          <form onSubmit={handleSubmitTicket}>
            <div className="form-group">
              <label className="form-label">Tipo de Solicitação</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '6px' }}>
                {TICKET_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: isSelected ? `1.5px solid ${cat.color}` : '1px solid var(--border-subtle)',
                        background: isSelected ? `${cat.color}1F` : 'var(--surface-elevated)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Icon size={15} color={cat.color} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Módulo do Sistema</label>
                <select
                  className="input-dark"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                >
                  {SYSTEM_MODULES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Prioridade</label>
                <select
                  className="input-dark"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assunto Resumido</label>
              <input
                type="text"
                className="input-dark"
                placeholder="Ex: Dúvida ao configurar meta no Pomodoro ou erro ao salvar hábito"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descrição Detalhada</label>
              <textarea
                className="input-dark"
                rows={4}
                placeholder="Descreva como podemos ajudar ou os passos para reproduzir o problema..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ flex: 1.6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Send size={15} />
                <span>{submitting ? 'Enviando Ticket...' : 'Enviar Ticket para o Suporte'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>
                  Você ainda não abriu nenhum chamado de suporte.
                </p>
              </div>
            ) : (
              myTickets.map((t) => {
                const isResolved = t.status === 'resolvido';
                return (
                  <div
                    key={t.id}
                    className="card-native"
                    style={{
                      background: 'var(--surface-elevated)',
                      border: isResolved ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                      padding: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {t.subject}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: isResolved ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                          color: isResolved ? '#34D399' : '#FBBF24'
                        }}
                      >
                        {isResolved ? '✓ Resolvido' : t.status === 'em_andamento' ? '⏳ Em Análise' : '📩 Aberto'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Módulo: <strong>{t.module || 'Geral'}</strong> • Prioridade: <strong>{t.priority}</strong> •{' '}
                      {t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : 'Hoje'}
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.45 }}>
                      {t.message}
                    </p>

                    {t.admin_reply && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: 'rgba(0, 229, 255, 0.1)',
                          borderLeft: '3px solid var(--accent-cyan)',
                          fontSize: '0.8rem',
                          color: '#E2E8F0'
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '3px', textTransform: 'uppercase' }}>
                          Resposta da Equipe Ethos:
                        </div>
                        {t.admin_reply}
                      </div>
                    )}

                    {/* Acesso de suporte consentido: o cliente libera, acompanha e revoga */}
                    <SupportAccessPanel ticketId={t.id} resolved={isResolved} />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

