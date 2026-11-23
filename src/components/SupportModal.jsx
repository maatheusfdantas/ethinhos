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
  Clock,
  BookOpen,
  Droplets,
  Timer,
  ShieldCheck
} from 'lucide-react';

const TICKET_CATEGORIES = [
  { id: 'bug', label: 'Bug / Erro no Sistema', desc: 'Falhas de interface ou sincronização', icon: Bug, color: 'var(--rx-bad)' },
  { id: 'duvida', label: 'Dúvida sobre Funcionalidade', desc: 'Como utilizar recursos e módulos', icon: HelpCircle, color: 'var(--rx-blue)' },
  { id: 'conta', label: 'Minha Conta & Acesso', desc: 'Dados, login, senha e permissões', icon: AlertCircle, color: 'var(--rx-amber)' },
  { id: 'sugestao', label: 'Sugestão de Melhoria', desc: 'Ideias de funções ou melhorias visuais', icon: Sparkles, color: 'var(--rx-violet)' }
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
    <div className="rx-overlay hlp-overlay" data-testid="support-overlay" onClick={onClose}>
      <div
        className="rx-dialog hlp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-modal-title"
        data-testid="support-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER AREJADO E BEM SINTETIZADO */}
        <header className="hlp-head">
          <div className="hlp-head-main">
            <span className="rx-tile solid" style={{ '--c': 'var(--rx-violet)' }}>
              <LifeBuoy size={22} />
            </span>
            <div>
              <h2 id="sp-modal-title">
                Central de Ajuda & Suporte
              </h2>
              <p>
                Guias rápidos do Ethos, abertura de chamados e respostas da administração
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rx-icon-btn"
            onClick={onClose}
            aria-label="Fechar central de ajuda"
          >
            <X size={18} />
          </button>
        </header>

        {/* TABS */}
        <div className="tl-seg hlp-tabs" role="group" aria-label="Seções da central de ajuda">
          <button
            type="button"
            aria-pressed={activeTab === 'new'}
            onClick={() => setActiveTab('new')}
          >
            <Send size={15} />
            <span>+ Abrir Novo Chamado</span>
          </button>

          <button
            type="button"
            aria-pressed={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={15} />
            <span>Meus Chamados ({myTickets.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'guide'}
            aria-pressed={activeTab === 'guide'}
            onClick={() => setActiveTab('guide')}
          >
            <BookOpen size={15} />
            <span>Guia Rápido</span>
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

            {/* SELEÇÃO DE CATEGORIAS: BEM DIMENSIONADA, CARTÕES AMPLOS COM ÍCONES NÍTIDOS */}
            <div className="rx-field">
              <span>
                Tipo de Solicitação
              </span>
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
                      <Icon size={18} style={{ color: cat.color, flexShrink: 0, marginTop: 2 }} />
                      <div style={{ minWidth: 0 }}>
                        <span>
                          {cat.label}
                        </span>
                        <small>
                          {cat.desc}
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MÓDULO E PRIORIDADE */}
            <div className="ps-row">
              <div className="rx-field">
                <label htmlFor="sp-module-select">
                  Módulo do Sistema
                </label>
                <select
                  id="sp-module-select"
                  className="es-input"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                >
                  {SYSTEM_MODULES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="rx-field">
                <label htmlFor="sp-priority-select">
                  Prioridade
                </label>
                <select
                  id="sp-priority-select"
                  className="es-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Baixa">Baixa (Não impede o uso)</option>
                  <option value="Média">Média (Dúvida ou pequeno bug)</option>
                  <option value="Alta">Alta (Funcionalidade travada)</option>
                  <option value="Urgente">Urgente (Bloqueio total de acesso)</option>
                </select>
              </div>
            </div>

            {/* ASSUNTO */}
            <div className="rx-field">
              <label htmlFor="sp-subject-input">
                Assunto Resumido
              </label>
              <input
                id="sp-subject-input"
                type="text"
                className="es-input"
                placeholder="Ex: Dúvida ao configurar meta de água ou erro ao registrar foco"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            {/* DESCRIÇÃO DETALHADA */}
            <div className="rx-field">
              <label htmlFor="sp-message-textarea">
                Descrição Detalhada
              </label>
              <textarea
                id="sp-message-textarea"
                className="es-input"
                rows={5}
                placeholder="Descreva com detalhes como podemos ajudar, passos para reproduzir ou o que esperava ver..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {/* BOTÕES DE AÇÃO */}
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
                <Send size={16} />
                <span>{submitting ? 'Enviando Chamado...' : 'Enviar Chamado ao Suporte'}</span>
              </button>
            </div>
          </form>
        )}

        {/* MEUS CHAMADOS */}
        {activeTab === 'history' && (
          <div className="hlp-tickets" data-testid="support-history-section">
            {myTickets.length === 0 ? (
              <div className="hlp-box" style={{ textAlign: 'center', padding: '40px 20px', alignItems: 'center' }}>
                <MessageSquare size={36} style={{ opacity: 0.65, color: 'var(--rx-lavender)' }} />
                <p style={{ margin: 0, fontWeight: 650, color: 'var(--rx-ink)' }}>
                  Você ainda não abriu nenhum chamado de suporte.
                </p>
                <span style={{ fontSize: '13.5px', color: 'var(--rx-ink-2)', display: 'block' }}>
                  Quando precisar de ajuda, abra um chamado para acompanhar tudo por aqui.
                </span>
                <button
                  type="button"
                  className="rx-btn tiny"
                  style={{ marginTop: 8 }}
                  onClick={() => setActiveTab('new')}
                >
                  <Send size={14} /> Abrir primeiro chamado
                </button>
              </div>
            ) : (
              myTickets.map((t) => {
                const isResolved = t.status === 'resolvido' || t.status === 'resolved';
                return (
                  <article key={t.id} className="hlp-ticket" data-testid="support-ticket-card">
                    <div className="hlp-ticket-head">
                      <strong className="hlp-ticket-title">
                        {t.subject}
                      </strong>
                      <span className={`hlp-highlight ${isResolved ? 'hlp-status-ok' : 'hlp-status-open'}`}>
                        {isResolved ? (
                          <><CheckCircle2 size={14} style={{ marginRight: 5 }} /> Resolvido</>
                        ) : t.status === 'em_andamento' ? (
                          <><Clock size={14} style={{ marginRight: 5 }} /> Em Análise</>
                        ) : (
                          <><Clock size={14} style={{ marginRight: 5 }} /> Aberto</>
                        )}
                      </span>
                    </div>

                    <div className="hlp-ticket-meta">
                      <span>Módulo: <strong>{t.module || 'Geral'}</strong></span>
                      <span>Prioridade: <strong>{t.priority || 'Média'}</strong></span>
                      <span>Aberto em: <strong>{t.created_at ? new Date(t.created_at).toLocaleString('pt-BR') : 'Hoje'}</strong></span>
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
                    <div style={{ marginTop: '4px' }}>
                      <SupportAccessPanel ticketId={t.id} resolved={isResolved} />
                    </div>
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
