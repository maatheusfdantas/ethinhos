import React, { useState } from 'react';
import { lerMenuRecolhido, salvarMenuRecolhido } from './rx/tema';
import { corModulo } from './rx/modulos';
import '../styles/espacos.css';
import {
  User, LayoutGrid, Calendar, TrendingUp, Plus, Settings, LogOut, ShieldAlert, Timer,
  Dumbbell, Users, CheckCircle2, ShieldOff, LifeBuoy, Menu, StickyNote, Building2, Ticket, ClipboardList, Utensils, ChevronsLeft
} from 'lucide-react';

/**
 * Navegação (direção roxo + azul). Mesmas exportações e props de antes.
 * Todos os módulos continuam acessíveis, respeitando permissões do admin e preferências de página.
 */

const DEFAULT_PAGES = { notes: true, dashboard: true, telemetry: true, habits: true, bad_habits: true, calendar: true, workouts: true, focus: true, social: true, espacos: true };

function readSystemModules() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('ethos_system_modules') : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildModules(user, userPermissions = {}, extra = {}) {
  const pages = { ...DEFAULT_PAGES, ...(user?.pagePreferences || {}) };
  const sys = { ...readSystemModules(), ...(extra.systemModules || {}) };
  const can = (k) => sys[k] !== false && pages[k] !== false && userPermissions[k] !== false;
  const all = [
    { id: 'dashboard', label: 'Painel principal', icon: LayoutGrid, group: null, enabled: true },
    { id: 'habits', label: 'Hábitos e rotinas', icon: CheckCircle2, group: 'Rotina', enabled: can('habits') },
    { id: 'calendar', label: 'Agenda semanal', icon: Calendar, group: 'Rotina', enabled: can('calendar') },
    { id: 'workouts', label: 'Treino', icon: Dumbbell, group: 'Corpo e mente', enabled: can('workouts') },
    // Lote E: só aparece quando existe plano alimentar publicado para a pessoa.
    { id: 'alimentacao', label: 'Alimentação', icon: Utensils, group: 'Corpo e mente', enabled: Boolean(extra.hasMealPlan) },
    { id: 'focus', label: 'Foco', icon: Timer, group: 'Corpo e mente', enabled: can('focus') },
    { id: 'bad_habits', label: 'Maus hábitos', icon: ShieldOff, group: 'Corpo e mente', enabled: can('bad_habits') },
    { id: 'notes', label: 'Notas', icon: StickyNote, group: 'Corpo e mente', enabled: can('notes') },
    { id: 'telemetry', label: 'Análise de progresso', icon: TrendingUp, group: 'Entender', enabled: can('telemetry') },
    { id: 'social', label: 'Comunidade', icon: Users, group: 'Pessoas', enabled: can('social') },
    { id: 'espacos', label: 'Espaços', icon: Building2, group: 'Pessoas', enabled: can('espacos') },
    { id: 'profile', label: 'Perfil', icon: User, group: 'Pessoas', enabled: true }
  ];
  return all.filter((m) => m.enabled);
}

/** Menu do contexto "Meu espaço" (perfil profissional ativo). */
export function proModules(pro) {
  return [
    { id: 'pro-visao', label: 'Visão geral', icon: LayoutGrid, group: null },
    { id: 'pro-turmas', label: 'Turmas e convites', icon: Ticket, group: 'Pessoas' },
    { id: 'pro-pessoas', label: pro?.peopleLabel || 'Pessoas', icon: Users, group: 'Pessoas' },
    ...(pro?.model === 'personal' ? [{ id: 'pro-conteudo', label: 'Fichas e programas', icon: ClipboardList, group: 'Conteúdo' }] : []),
    ...(pro?.model === 'nutri' ? [{ id: 'pro-conteudo', label: 'Planos alimentares', icon: Utensils, group: 'Conteúdo' }] : []),
    { id: 'pro-agenda', label: 'Agenda e avisos', icon: Calendar, group: 'Comunicação' },
    // Lote F: a Clínica cuida só da organização (sem conteúdo de treino ou alimentação).
    ...(pro?.model === 'clinica' ? [{ id: 'pro-tarefas', label: 'Pendências administrativas', icon: ClipboardList, group: 'Organização' }] : [])
  ];
}

/** Seletor Pessoal | Meu espaço (só aparece para quem tem perfil profissional ativo). */
export function ContextSwitch({ pro, proMode, onToggleProMode }) {
  if (!pro || pro.status !== 'ativo') return null;
  return (
    <>
      <div className="rx-ctx" role="group" aria-label="Contexto">
        <button type="button" aria-pressed={!proMode} onClick={() => onToggleProMode?.(false)}>Pessoal</button>
        <button type="button" aria-pressed={proMode} onClick={() => onToggleProMode?.(true)}>Meu espaço</button>
      </div>
      <p className="rx-ctx-note">{proMode ? `${pro.spaceName}, ${pro.modelLabel}` : 'Seu Ethos de sempre'}</p>
    </>
  );
}

export function BrandMark({ size = 28, id = 'rxBrand' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A78BFA" />
          <stop offset="1" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="14" cy="14" r="4.6" fill={`url(#${id})`} />
    </svg>
  );
}

function initials(user) {
  const name = user?.name || user?.username || 'Ethos';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'E';
}

export function DesktopSidebar({
  activeTab,
  setActiveTab,
  isAdmin,
  userPermissions = {},
  user,
  tags = [],
  onConfigureCategory,
  onCreateCategory,
  onOpenProfile,
  onOpenAuth,
  onOpenSupport,
  onLogout,
  pro = null,
  proMode = false,
  onToggleProMode,
  hasMealPlan = false
}) {
  const inSpace = Boolean(proMode && pro?.status === 'ativo');
  const modules = inSpace ? proModules(pro) : buildModules(user, userPermissions, { hasMealPlan });
  const [mini, setMini] = useState(lerMenuRecolhido);
  const alternarMini = () => { const v = !mini; setMini(v); salvarMenuRecolhido(v); };
  const groups = [];
  modules.forEach((m) => {
    const last = groups[groups.length - 1];
    if (!last || last.name !== m.group) groups.push({ name: m.group, items: [m] });
    else last.items.push(m);
  });

  return (
    <aside className={`rx-side${mini ? ' mini' : ''}`} aria-label="Navegação principal">
      <div className="rx-side-head">
        <button type="button" className="rx-brand" onClick={() => setActiveTab('dashboard')} aria-label="Ethos, ir para o painel">
          <BrandMark id="rxBrandSide" />
          <span>ethos</span>
        </button>
        <button type="button" className="rx-nav-btn rx-collapse" onClick={alternarMini} aria-pressed={mini} aria-label={mini ? 'Expandir menu' : 'Recolher menu'} title={mini ? 'Expandir menu' : 'Recolher menu'} data-testid="menu-recolher">
          <span className="rx-tile"><ChevronsLeft className="rx-i" strokeWidth={1.9} /></span>
        </button>
      </div>

      <ContextSwitch pro={pro} proMode={inSpace} onToggleProMode={onToggleProMode} />

      <nav className="rx-nav" aria-label="Módulos">
        {groups.map((g) => (
          <div className="rx-nav-group" key={g.name || 'root'}>
            {g.name && <p>{g.name}</p>}
            {g.items.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  className="rx-nav-btn"
                  aria-current={activeTab === m.id ? 'page' : undefined}
                  onClick={() => setActiveTab(m.id)}
                  title={mini ? m.label : undefined}
                  style={{ '--c': corModulo(m.id) }}
                >
                  <span className="rx-tile"><Icon className="rx-i" strokeWidth={1.9} /></span>
                  <span className="lbl">{m.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {!inSpace && <section className="rx-cats" aria-label="Categorias">
        <h2>Categorias</h2>
        {tags.map((tag) => (
          <button
            key={tag.id || tag.name}
            type="button"
            className="rx-cat"
            onClick={() => onConfigureCategory?.(tag)}
            title={`Configurar ${tag.name}`}
          >
            <span className="rx-dot" style={{ '--rx-dot': tag.color || '#A78BFA' }} />
            <span>{tag.name}</span>
            {tag.has_subclasses && tag.subclasses?.length > 0 && <small>{tag.subclasses.length}</small>}
          </button>
        ))}
        {onCreateCategory && (
          <button type="button" className="rx-cat rx-cat-add" onClick={onCreateCategory}>
            <Plus className="rx-i" strokeWidth={1.75} />
            <span>Nova categoria</span>
          </button>
        )}
      </section>}

      <div className="rx-side-foot">
        {isAdmin && (
          <button type="button" className="rx-nav-btn" aria-current={activeTab === 'admin' ? 'page' : undefined} onClick={() => setActiveTab('admin')} title={mini ? 'Portal admin' : undefined} style={{ '--c': corModulo('admin') }}>
            <span className="rx-tile"><ShieldAlert className="rx-i" strokeWidth={1.9} /></span>
            <span className="lbl">Portal admin</span>
          </button>
        )}
        <button type="button" className="rx-nav-btn" onClick={() => onOpenSupport?.()} title={mini ? 'Suporte' : undefined}>
          <span className="rx-tile"><LifeBuoy className="rx-i" strokeWidth={1.9} /></span>
          <span className="lbl">Suporte</span>
        </button>
        <button type="button" className="rx-nav-btn" onClick={() => onOpenAuth?.()} title={mini ? 'Configurações' : undefined}>
          <span className="rx-tile"><Settings className="rx-i" strokeWidth={1.9} /></span>
          <span className="lbl">Configurações</span>
        </button>
        <button type="button" className="rx-me" onClick={() => onOpenProfile?.()} title={mini ? (user?.name || user?.username || 'Perfil') : undefined}>
          <span className="rx-avatar">{initials(user)}</span>
          <span>
            <b>{user?.name || user?.username || 'Visitante'}</b>
            <small>{user?.subscription_tier || 'Conta Ethos'}</small>
          </span>
        </button>
        <button type="button" className="rx-nav-btn" onClick={() => onLogout?.()} title={mini ? 'Sair' : undefined}>
          <span className="rx-tile"><LogOut className="rx-i" strokeWidth={1.9} /></span>
          <span className="lbl">Sair</span>
        </button>
      </div>
    </aside>
  );
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  onOpenAdd,
  isAdmin,
  userPermissions = {},
  user,
  onOpenSupport,
  onOpenAuth,
  onLogout,
  pro = null,
  proMode = false,
  onToggleProMode,
  hasMealPlan = false
}) {
  const [open, setOpen] = useState(false);
  const inSpace = Boolean(proMode && pro?.status === 'ativo');
  const modules = inSpace ? proModules(pro) : buildModules(user, userPermissions, { hasMealPlan });
  const go = (id) => { setActiveTab(id); setOpen(false); };
  const tab = (id, label, Icon) => (
    <button type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => go(id)}>
      <Icon className="rx-i" strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {inSpace ? (
        <nav className="rx-tabbar" aria-label="Navegação">
          {tab('pro-visao', 'Visão geral', LayoutGrid)}
          {tab('pro-turmas', 'Turmas', Ticket)}
          {tab('pro-pessoas', pro?.peopleLabel || 'Pessoas', Users)}
          {tab('espacos', 'Espaços', Building2)}
          <button type="button" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="rx-i" strokeWidth={1.75} />
            <span>Menu</span>
          </button>
        </nav>
      ) : (
        <nav className="rx-tabbar" aria-label="Navegação">
          {tab('dashboard', 'Painel', LayoutGrid)}
          {modules.some((m) => m.id === 'habits') ? tab('habits', 'Hábitos', CheckCircle2) : tab('calendar', 'Agenda', Calendar)}
          <button type="button" className="fab" aria-label="Criar ou registrar" onClick={() => onOpenAdd?.()} data-testid="dock-mais">
            <span className="c"><Plus className="rx-i" strokeWidth={2.2} /></span>
            <span>Novo</span>
          </button>
          {tab('telemetry', 'Análise', TrendingUp)}
          <button type="button" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="rx-i" strokeWidth={1.75} />
            <span>Menu</span>
          </button>
        </nav>
      )}

      {open && (
        <div className="rx-msheet" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="rxMenuTitle">
            <div className="rx-grab" />
            <h2 id="rxMenuTitle">Todos os módulos</h2>
            <div style={{ margin: '10px 0 4px' }}><ContextSwitch pro={pro} proMode={inSpace} onToggleProMode={(v) => { onToggleProMode?.(v); setOpen(false); }} /></div>
            <div className="rx-mods">
              {modules.map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.id} type="button" aria-current={activeTab === m.id ? 'page' : undefined} onClick={() => go(m.id)} style={{ '--c': corModulo(m.id) }}>
                    <span className="rx-tile sm"><Icon className="rx-i" strokeWidth={1.9} /></span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="rx-extra">
              {isAdmin && <button type="button" className="rx-btn ghost" onClick={() => go('admin')}><ShieldAlert className="rx-i" strokeWidth={1.75} />Portal admin</button>}
              <button type="button" className="rx-btn ghost" onClick={() => { setOpen(false); onOpenSupport?.(); }}><LifeBuoy className="rx-i" strokeWidth={1.75} />Suporte</button>
              <button type="button" className="rx-btn ghost" onClick={() => { setOpen(false); onOpenAuth?.(); }}><Settings className="rx-i" strokeWidth={1.75} />Configurações</button>
              <button type="button" className="rx-btn ghost" onClick={() => { setOpen(false); onLogout?.(); }}><LogOut className="rx-i" strokeWidth={1.75} />Sair</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
