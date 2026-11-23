import React, { useState, useEffect } from 'react';
import { SupportAccessPanel } from './support/SupportAccessPanel';
import {
  LifeBuoy,
  Send,
  X,
  MessageSquare,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Bug,
  CheckCircle2,
  Clock
} from 'lucide-react';

const TICKET_CATEGORIES = [
  { id: 'bug', label: 'Bug / Erro no Sistema', desc: 'Falhas de interface ou sincronização', icon: Bug, color: '#F43F5E' },
  { id: 'duvida', label: 'Dúvida sobre Funcionalidade', desc: 'Como utilizar recursos e módulos', icon: HelpCircle, color: '#38BDF8' },
  { id: 'conta', label: 'Minha Conta & Acesso', desc: 'Dados, login, senha e permissões', icon: AlertCircle, color: '#F59E0B' },
  { id: 'sugestao', label: 'Sugestão de Melhoria', desc: 'Ideias de funções ou melhorias visuais', icon: Sparkles, color: '#10B981' }
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
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="sp-modal-title">
      <div
        className="modal-sheet"
        style={{
          maxWidth: '680px',
          width: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
          border: '1px solid var(--rx-line-2, rgba(255, 255, 255, 0.12))',
          background: 'var(--rx-card, #121829)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER AREJADO E BEM SINTETIZADO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--rx-line, rgba(255, 255, 255, 0.08))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(56, 189, 248, 0.18)',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <LifeBuoy size={24} />
            </div>
            <div>
              <h2 id="sp-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--rx-ink, #FFFFFF)' }}>
                Central de Ajuda & Suporte
              </h2>
              <span style={{ fontSize: '0.84rem', color: 'var(--rx-ink-3, #94A3B8)', display: 'block', marginTop: '2px' }}>
                Abra um chamado técnico detalhado ou acompanhe respostas da administração
              </span>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar suporte"
            style={{
              background: 'var(--rx-wash, rgba(255, 255, 255, 0.06))',
              border: '1px solid var(--rx-line, rgba(255, 255, 255, 0.1))',
              color: 'var(--rx-ink-2, #CBD5E1)',
              borderRadius: '12px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* TABS ESPAÇOSAS */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '14px',
              border: activeTab === 'new' ? '1.5px solid var(--rx-lavender, #818CF8)' : '1px solid var(--rx-line, rgba(255, 255, 255, 0.1))',
              background: activeTab === 'new' ? 'rgba(129, 140, 248, 0.18)' : 'var(--rx-card, rgba(255, 255, 255, 0.03))',
              color: activeTab === 'new' ? 'var(--rx-lavender, #A5B4FC)' : 'var(--rx-ink-2, #94A3B8)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>+ Abrir Novo Chamado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '14px',
              border: activeTab === 'history' ? '1.5px solid var(--rx-lavender, #818CF8)' : '1px solid var(--rx-line, rgba(255, 255, 255, 0.1))',
              background: activeTab === 'history' ? 'rgba(129, 140, 248, 0.18)' : 'var(--rx-card, rgba(255, 255, 255, 0.03))',
              color: activeTab === 'history' ? 'var(--rx-lavender, #A5B4FC)' : 'var(--rx-ink-2, #94A3B8)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Clock size={16} />
            <span>Meus Chamados ({myTickets.length})</span>
          </button>
        </div>

        {activeTab === 'new' ? (
          <form onSubmit={handleSubmitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* SELEÇÃO DE CATEGORIAS: BEM DIMENSIONADA, CARTÕES AMPLOS COM ÍCONES NÍTIDOS */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--rx-ink, #FFFFFF)', marginBottom: '8px' }}>
                Tipo de Solicitação
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
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
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--rx-line, rgba(255, 255, 255, 0.1))',
                        background: isSelected ? `${cat.color}22` : 'var(--rx-wash, rgba(255, 255, 255, 0.03))',
                        color: 'var(--rx-ink, #FFFFFF)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: `${cat.color}26`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Icon size={20} color={cat.color} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: isSelected ? '#FFFFFF' : 'var(--rx-ink, #FFFFFF)' }}>
                          {cat.label}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--rx-ink-3, #94A3B8)', marginTop: '2px' }}>
                          {cat.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MÓDULO E PRIORIDADE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label htmlFor="sp-module-select" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--rx-ink, #FFFFFF)', marginBottom: '6px' }}>
                  Módulo do Sistema
                </label>
                <select
                  id="sp-module-select"
                  className="input-dark"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--rx-line, rgba(255, 255, 255, 0.12))',
                    background: 'var(--rx-input, #0B1020)',
                    color: 'var(--rx-ink, #FFFFFF)',
                    fontSize: '0.86rem'
                  }}
                >
                  {SYSTEM_MODULES.map((m) => (
                    <option key={m} value={m} style={{ background: '#0F172A', color: '#FFFFFF' }}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sp-priority-select" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--rx-ink, #FFFFFF)', marginBottom: '6px' }}>
                  Prioridade
                </label>
                <select
                  id="sp-priority-select"
                  className="input-dark"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--rx-line, rgba(255, 255, 255, 0.12))',
                    background: 'var(--rx-input, #0B1020)',
                    color: 'var(--rx-ink, #FFFFFF)',
                    fontSize: '0.86rem'
                  }}
                >
                  <option value="Baixa" style={{ background: '#0F172A', color: '#FFFFFF' }}>Baixa (Não impede o uso)</option>
                  <option value="Média" style={{ background: '#0F172A', color: '#FFFFFF' }}>Média (Dúvida ou pequeno bug)</option>
                  <option value="Alta" style={{ background: '#0F172A', color: '#FFFFFF' }}>Alta (Funcionalidade travada)</option>
                  <option value="Urgente" style={{ background: '#0F172A', color: '#FFFFFF' }}>Urgente (Bloqueio total de acesso)</option>
                </select>
              </div>
            </div>

            {/* ASSUNTO */}
            <div>
              <label htmlFor="sp-subject-input" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--rx-ink, #FFFFFF)', marginBottom: '6px' }}>
                Assunto Resumido
              </label>
              <input
                id="sp-subject-input"
                type="text"
                className="input-dark"
                placeholder="Ex: Dúvida ao configurar meta de água ou erro ao registrar foco"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--rx-line, rgba(255, 255, 255, 0.12))',
                  background: 'var(--rx-input, #0B1020)',
                  color: 'var(--rx-ink, #FFFFFF)',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* DESCRIÇÃO DETALHADA */}
            <div>
              <label htmlFor="sp-message-textarea" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--rx-ink, #FFFFFF)', marginBottom: '6px' }}>
                Descrição Detalhada
              </label>
              <textarea
                id="sp-message-textarea"
                className="input-dark"
                rows={5}
                placeholder="Descreva com detalhes como podemos ajudar, passos para reproduzir ou o que esperava ver..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--rx-line, rgba(255, 255, 255, 0.12))',
                  background: 'var(--rx-input, #0B1020)',
                  color: 'var(--rx-ink, #FFFFFF)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  minHeight: '110px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  flex: '1 1 140px',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  border: '1px solid var(--rx-line, rgba(255, 255, 255, 0.12))',
                  background: 'var(--rx-wash, rgba(255, 255, 255, 0.05))',
                  color: 'var(--rx-ink-2, #E2E8F0)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{
                  flex: '2 1 240px',
                  padding: '12px 24px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8B6CFF 0%, #5B8CFF 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(139, 108, 255, 0.35)'
                }}
              >
                <Send size={16} />
                <span>{submitting ? 'Enviando Chamado...' : 'Enviar Chamado ao Suporte'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {myTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--rx-ink-3, #94A3B8)' }}>
                <MessageSquare size={38} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.94rem', fontWeight: 600 }}>
                  Você ainda não abriu nenhum chamado de suporte.
                </p>
                <span style={{ fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
                  Quando precisar de ajuda, abra um chamado pela aba ao lado.
                </span>
              </div>
            ) : (
              myTickets.map((t) => {
                const isResolved = t.status === 'resolvido';
                return (
                  <div
                    key={t.id}
                    className="card-native"
                    style={{
                      background: 'var(--rx-wash, rgba(255, 255, 255, 0.03))',
                      border: isResolved ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--rx-line, rgba(255, 255, 255, 0.1))',
                      borderRadius: '18px',
                      padding: '18px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rx-ink, #FFFFFF)' }}>
                        {t.subject}
                      </span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: isResolved ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                          color: isResolved ? '#34D399' : '#FBBF24',
                          border: isResolved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        {isResolved ? '✓ Resolvido' : t.status === 'em_andamento' ? '⏳ Em Análise' : '📩 Aberto'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--rx-ink-3, #94A3B8)', marginBottom: '10px' }}>
                      Módulo: <strong>{t.module || 'Geral'}</strong> • Prioridade: <strong>{t.priority}</strong> •{' '}
                      {t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : 'Hoje'}
                    </div>

                    <p style={{ fontSize: '0.88rem', color: 'var(--rx-ink-2, #E2E8F0)', margin: 0, lineHeight: 1.55 }}>
                      {t.message}
                    </p>

                    {t.admin_reply && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          borderLeft: '4px solid #38BDF8',
                          fontSize: '0.84rem',
                          color: '#F1F5F9'
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38BDF8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Resposta da Equipe Ethos:
                        </div>
                        {t.admin_reply}
                      </div>
                    )}

                    {/* Acesso de suporte consentido: o cliente libera, acompanha e revoga */}
                    <div style={{ marginTop: '12px' }}>
                      <SupportAccessPanel ticketId={t.id} resolved={isResolved} />
                    </div>
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
