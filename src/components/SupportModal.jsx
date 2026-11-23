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
  Bug,
  BookOpen,
  Droplets,
  Timer,
  ShieldCheck
} from 'lucide-react';

const TICKET_CATEGORIES = [
  { id: 'bug', label: 'Bug / Erro no Sistema', icon: Bug, color: 'var(--rx-bad)' },
  { id: 'duvida', label: 'Dúvida sobre Funcionalidade', icon: HelpCircle, color: 'var(--rx-blue)' },
  { id: 'conta', label: 'Minha Conta & Acesso', icon: AlertCircle, color: 'var(--rx-amber)' },
  { id: 'sugestao', label: 'Sugestão de Melhoria', icon: Sparkles, color: 'var(--rx-violet)' }
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

const GUIDE_TOPICS = [
  {
    id: 'hidratacao',
    icon: Droplets,
    color: 'var(--rx-m-agua)',
    title: 'Saúde e Hidratação Diária',
    badge: '35 ml / kg',
    summary: 'Como funcionam o cálculo de água, peso, altura e tamanho dos copos.',
    bullets: [
      { highlight: 'Saúde', text: 'Preencha seu Peso (kg) e sua Altura (cm) na seção Saúde dentro de Configurações.' },
      { highlight: 'Água', text: 'A sugestão diária usa a fórmula padrão de 35 ml por kg de peso corporal e converte automaticamente para copos.' },
      { highlight: 'Copos personalizados', text: 'Na seção de Água você define a capacidade do seu copo ou garrafa em ml (ex.: 200 ml, 250 ml, 350 ml, 500 ml ou valor editável).' }
    ]
  },
  {
    id: 'foco',
    icon: Timer,
    color: 'var(--rx-m-foco)',
    title: 'Foco, Cultivo e Evolução',
    badge: '5 a 120 min',
    summary: 'Personalize a intensidade do timer e acompanhe seus cultivos ao longo do tempo.',
    bullets: [
      { highlight: 'Seletor recolhível', text: 'Toque no cartão acima do anel de foco para escolher entre Plantas, Mundos, Elementos, Mascotes, Naves, ETs, Foguetes, Livros e Poções.' },
      { highlight: 'Intensidade e barra', text: 'Escolha um nível de intensidade ou deslize a barra de 5 a 120 minutos para definir a duração exata da sessão.' },
      { highlight: 'Evolução Semanal e Mensal', text: 'Acompanhe todas as espécies e elementos produzidos nas suas sessões reais nos últimos 7 ou 30 dias.' }
    ]
  },
  {
    id: 'privacidade',
    icon: ShieldCheck,
    color: 'var(--rx-violet)',
    title: 'Privacidade, Conta e Suporte',
    badge: 'Protegido',
    summary: 'Seus registros são privados e qualquer suporte técnico exige autorização explícita.',
    bullets: [
      { highlight: 'Acesso consentido', text: 'Em cada chamado aberto você decide quais categorias liberar temporariamente e pode revogar o acesso a qualquer instante.' },
      { highlight: 'Exportação completa', text: 'Em Configurações você pode baixar uma cópia integral dos seus dados em formato JSON.' }
    ]
  }
];

export function SupportModal({ isOpen, onClose, user, showToast }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history' | 'guide'
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
    <div className="rx-overlay" onClick={onClose}>
      <div
        className="rx-dialog hlp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hlpModalTitle"
        data-testid="support-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <header className="hlp-head">
          <div className="hlp-head-main">
            <span className="rx-tile solid" style={{ '--c': 'var(--rx-violet)' }}>
              <LifeBuoy size={20} />
            </span>
            <div>
              <h2 id="hlpModalTitle">Central de Ajuda & Suporte</h2>
              <p>Guias rápidos do Ethos, abertura de chamados e respostas da administração</p>
            </div>
          </div>

          <button type="button" className="rx-icon-btn" onClick={onClose} aria-label="Fechar central de ajuda">
            <X size={18} />
          </button>
        </header>

        {/* TABS */}
        <div className="tl-seg" role="tablist" aria-label="Seções da central de ajuda">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'new'}
            aria-pressed={activeTab === 'new'}
            onClick={() => setActiveTab('new')}
          >
            <Send size={14} /> + Abrir Novo Ticket
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            aria-pressed={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          >
            <MessageSquare size={14} /> Meus Chamados ({myTickets.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'guide'}
            aria-pressed={activeTab === 'guide'}
            onClick={() => setActiveTab('guide')}
          >
            <BookOpen size={14} /> Guia Rápido
          </button>
        </div>

        {/* GUIA RÁPIDO COM DESTAQUES FORMATADOS */}
        {activeTab === 'guide' && (
          <div className="es-stack" data-testid="support-guide-section">
            {GUIDE_TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <article key={topic.id} className="hlp-box">
                  <div className="hlp-ticket-head">
                    <h3>
                      <span className="rx-tile sm" style={{ '--c': topic.color }}>
                        <Icon size={16} />
                      </span>
                      {topic.title}
                    </h3>
                    <span className="hlp-highlight">{topic.badge}</span>
                  </div>
                  <p>{topic.summary}</p>
                  <ul>
                    {topic.bullets.map((b, idx) => (
                      <li key={idx}>
                        <strong>{b.highlight}:</strong> {b.text}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        {/* ABRIR NOVO TICKET */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmitTicket} className="es-stack" data-testid="support-new-form">
            <div className="hlp-box">
              <h3>
                <BookOpen size={16} /> Como podemos ajudar você?
              </h3>
              <p>
                Escolha o tipo de solicitação, o módulo relacionado e descreva sua dúvida. Termos em destaque como{' '}
                <span className="hlp-highlight">Hidratação</span>,{' '}
                <span className="hlp-highlight">Foco</span> e{' '}
                <span className="hlp-highlight">Sincronização</span> agilizam a análise técnica.
              </p>
            </div>

            <div className="rx-field">
              <span>Tipo de Solicitação</span>
              <div className="hlp-grid" role="group" aria-label="Tipo de Solicitação">
                {TICKET_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className="hlp-cat"
                      aria-pressed={isSelected}
                      onClick={() => setCategory(cat.id)}
                    >
                      <Icon size={15} style={{ color: cat.color, flexShrink: 0 }} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ps-row">
              <label className="rx-field">
                <span>Módulo do Sistema</span>
                <select
                  className="es-input"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                >
                  {SYSTEM_MODULES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>

              <label className="rx-field">
                <span>Prioridade</span>
                <select
                  className="es-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </label>
            </div>

            <label className="rx-field">
              <span>Assunto Resumido</span>
              <input
                type="text"
                className="es-input"
                placeholder="Ex: Dúvida ao configurar meta no Pomodoro ou erro ao salvar hábito"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </label>

            <label className="rx-field">
              <span>Descrição Detalhada</span>
              <textarea
                className="es-input"
                rows={4}
                placeholder="Descreva como podemos ajudar ou os passos para reproduzir o problema..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ resize: 'vertical' }}
                required
              />
            </label>

            <div className="rx-form-acts">
              <button
                type="button"
                className="rx-btn ghost"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rx-btn"
              >
                <Send size={15} />
                <span>{submitting ? 'Enviando Ticket...' : 'Enviar Ticket para o Suporte'}</span>
              </button>
            </div>
          </form>
        )}

        {/* MEUS CHAMADOS */}
        {activeTab === 'history' && (
          <div className="es-stack" data-testid="support-history-section">
            {myTickets.length === 0 ? (
              <div className="hlp-box" style={{ textAlign: 'center', padding: '32px 16px', alignItems: 'center' }}>
                <MessageSquare size={32} style={{ opacity: 0.6 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>
                  Você ainda não abriu nenhum chamado de suporte.
                </p>
              </div>
            ) : (
              myTickets.map((t) => {
                const isResolved = t.status === 'resolvido' || t.status === 'resolved';
                return (
                  <article key={t.id} className="hlp-ticket">
                    <div className="hlp-ticket-head">
                      <strong style={{ fontSize: '15px', color: 'var(--rx-ink)' }}>
                        {t.subject}
                      </strong>
                      <span className="hlp-highlight">
                        {isResolved ? (
                          <><CheckCircle2 size={13} style={{ marginRight: 4 }} /> Resolvido</>
                        ) : t.status === 'em_andamento' ? (
                          <><Clock size={13} style={{ marginRight: 4 }} /> Em Análise</>
                        ) : (
                          <><Clock size={13} style={{ marginRight: 4 }} /> Aberto</>
                        )}
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', color: 'var(--rx-ink-2)' }}>
                      Módulo: <strong>{t.module || 'Geral'}</strong> • Prioridade: <strong>{t.priority || 'Média'}</strong> •{' '}
                      {t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : 'Hoje'}
                    </div>

                    <div className="hlp-ticket-msg">
                      {t.message}
                    </div>

                    {t.admin_reply && (
                      <div className="hlp-reply">
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--rx-lavender)', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Resposta da Equipe Ethos:
                        </div>
                        {t.admin_reply}
                      </div>
                    )}

                    {/* Acesso de suporte consentido: o cliente libera, acompanha e revoga */}
                    <SupportAccessPanel ticketId={t.id} resolved={isResolved} />
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
