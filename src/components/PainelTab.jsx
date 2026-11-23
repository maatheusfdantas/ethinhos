import React, { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Droplets, Moon, Timer, Dumbbell, ChevronDown, CalendarClock, History, Sparkles, Bell, Building2, CheckCircle2, CalendarPlus, Play, Megaphone, Utensils, Sliders, X } from 'lucide-react';
import { isEventForDate } from '../services/storage';
import { ProgressMeter } from './rx/ProgressMeter';
import { DustCanvas } from './rx/DustCanvas';
import { withWaterToday } from '../utils/healthDay';
import { loadState as loadFoco } from './rx/focoStore';
import { calculateDailyWaterTarget } from '../utils/biometricsAndAnalytics';

/**
 * Painel principal (direção roxo + azul).
 * Usa os mesmos dados e as mesmas regras/chamadas de API do DashboardTab legado:
 * concluir/incrementar hábito (com subclasse opcional), água, sono e conclusão de eventos.
 * Não exibe números que o sistema não tem: sem histórico, a coluna mostra só o dia de hoje.
 */

const PRIORITY = { Alta: 3, 'Média': 2, Baixa: 1 };
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toMin = (t) => { const [h, m] = String(t || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };

function sleepHours(bed, wake) {
  const b = toMin(bed), w = toMin(wake);
  if (b === null || w === null) return 0;
  let diff = w - b; if (diff < 0) diff += 24 * 60;
  return +(diff / 60).toFixed(1);
}

async function api(url, method, body) {
  try {
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (err) {
    console.error('Falha ao sincronizar:', err);
  }
}

export function PainelTab({
  habits = [], setHabits, events = [], workouts = [], health = {}, setHealth, tags = [], user = null,
  onOpenAdd, onSwitchTab, onToggleEvent, onLogSubclassEffort, showToast,
  spaceEvents = [], pendencias = 0, onOpenPendencias,
  pendData = null, focoDisponivel = true, sleepRequest = 0, aguaRequest = 0
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const [doneOpen, setDoneOpen] = useState(false);
  const [subPrompt, setSubPrompt] = useState(null);
  const [sleepEdit, setSleepEdit] = useState(false);
  const [bedIn, setBedIn] = useState(health?.sleep?.bedTime || '23:30');
  const [wakeIn, setWakeIn] = useState(health?.sleep?.wakeTime || '07:00');
  const [aba, setAba] = useState(null); // 'habitos' | 'agenda' no cartão Hoje
  // Pedidos vindos do menu do "+" (cada pedido tem um id único; cada um é atendido uma vez)
  const [ultimoSono, setUltimoSono] = useState(0);
  if (sleepRequest && sleepRequest !== ultimoSono) { setUltimoSono(sleepRequest); setSleepEdit(true); }
  const aguaAtendida = React.useRef(0);

  const todayStr = localDate(now);
  // Minutos de foco de hoje: o mesmo registro da aba Foco (no navegador, por usuário)
  const focoMin = Math.round(loadFoco(user?.id).days?.[todayStr]?.min || 0);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const firstName = (user?.name || user?.username || '').split(' ')[0];
  const greet = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const dateLong = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const catOf = (h) => tags.find((t) => t.id === h.tagId || t.name === h.category);

  // ---------- Dados do dia ----------
  // Eventos aceitos dos espaços entram como itens só de leitura (não fazem parte dos eventos sincronizados).
  const todayEvents = useMemo(() => [...events.filter((e) => isEventForDate(e, todayStr)), ...spaceEvents.filter((e) => e.date === todayStr)], [events, spaceEvents, todayStr]);
  const timed = todayEvents.filter((e) => !e.allDay && toMin(e.startTime) !== null).sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  const allDay = todayEvents.filter((e) => e.allDay || toMin(e.startTime) === null);
  const live = timed.find((e) => toMin(e.startTime) <= nowMin && nowMin < (toMin(e.endTime) ?? toMin(e.startTime) + 60) && !e.completed);
  const next = timed.find((e) => toMin(e.startTime) > nowMin && !e.completed);
  const todayWorkouts = (workouts || []).filter((w) => (w.scheduledDays || []).includes(now.getDay()));

  const pending = habits.filter((h) => !h.completed).sort((a, b) => (PRIORITY[b.priority] || 0) - (PRIORITY[a.priority] || 0));
  const completed = habits.filter((h) => h.completed);
  const total = habits.length;
  const doneCount = completed.length;
  const taskPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const waterGlasses = health?.waterGlasses || 0;
  const waterTarget = health?.waterTarget || 10;
  const glassMl = health?.glassMl || 250;
  const waterPct = Math.min(100, Math.round((waterGlasses / Math.max(1, waterTarget)) * 100));
  const sleepLogged = Boolean(health?.sleep?.logged);
  const hours = sleepLogged ? sleepHours(health?.sleep?.bedTime, health?.sleep?.wakeTime) : 0;
  const sleepPct = sleepLogged ? Math.min(100, Math.round((hours / (health?.sleep?.targetHours || 8)) * 100)) : 0;

  const [waterEditOpen, setWaterEditOpen] = useState(false);
  const [customWeight, setCustomWeight] = useState(() => {
    if (user?.weight && Number(user.weight) > 0) return String(user.weight);
    try {
      const s = localStorage.getItem(`ethos_user_weight_${user?.id || 'default'}`);
      if (s && Number(s) > 0) return s;
    } catch {}
    return '';
  });
  const [customTarget, setCustomTarget] = useState(waterTarget);
  const [customGlassMl, setCustomGlassMl] = useState(glassMl);

  useEffect(() => {
    if (user?.weight && Number(user.weight) > 0) setCustomWeight(String(user.weight));
  }, [user?.weight]);

  const waterSuggestion = useMemo(() => {
    const w = parseFloat(String(customWeight).replace(',', '.')) || 0;
    return calculateDailyWaterTarget(w, customGlassMl || 250);
  }, [customWeight, customGlassMl]);

  const applyWaterSuggestion = () => {
    if (waterSuggestion.targetGlasses > 0) {
      setCustomTarget(waterSuggestion.targetGlasses);
    }
  };

  const handleSaveWaterTarget = (e) => {
    e?.preventDefault?.();
    const w = parseFloat(String(customWeight).replace(',', '.'));
    if (Number.isFinite(w) && w > 0 && user) {
      try {
        localStorage.setItem(`ethos_user_weight_${user.id || 'default'}`, String(w));
        const updatedUser = { ...user, weight: w };
        localStorage.setItem('ethos_current_user', JSON.stringify(updatedUser));
        sessionStorage.setItem('ethos_current_user', JSON.stringify(updatedUser));
        api(`/api/user/${user.id}/profile`, 'PUT', { weight: w });
      } catch {}
    }
    const target = Math.max(1, Number(customTarget) || 8);
    const ml = Math.max(50, Number(customGlassMl) || 250);
    saveHealth({
      ...health,
      waterTarget: target,
      glassMl: ml
    });
    setWaterEditOpen(false);
    showToast?.(`Meta de água atualizada: ${target} copos (${((target * ml) / 1000).toFixed(2).replace('.', ',')} L)`);
  };

  // Índice de vitalidade do dia: mesma regra do painel legado (40% hábitos + 30% água + 30% sono)
  const anyActivity = doneCount > 0 || waterGlasses > 0 || sleepLogged;
  const vitality = anyActivity ? Math.round(taskPct * 0.4 + waterPct * 0.3 + sleepPct * 0.3) : 0;
  const vitalityLabel = vitality >= 80 ? 'Excelente' : vitality >= 50 ? 'Consistente' : vitality > 0 ? 'Em evolução' : 'Iniciando';

  // ---------- Ações (mesmas regras do legado) ----------
  const maybeAskSubclass = (h) => {
    const cat = catOf(h);
    if (cat && cat.has_subclasses && Array.isArray(cat.subclasses) && cat.subclasses.length > 0) {
      setSubPrompt({ habitId: h.id, habitTitle: h.title, categoryName: cat.name, subclasses: cat.subclasses });
    }
  };

  const toggleHabit = (id) => {
    const h = habits.find((x) => x.id === id);
    const nextCompleted = h ? !h.completed : true;
    const nextCurrent = nextCompleted ? (h?.target || 1) : 0;
    setHabits((prev) => prev.map((x) => (x.id === id ? { ...x, completed: nextCompleted, current: nextCurrent } : x)));
    if (nextCompleted) maybeAskSubclass(h);
    showToast?.(nextCompleted ? `Hábito "${h?.title || 'Rotina'}" concluído` : `Hábito "${h?.title || 'Rotina'}" desmarcado`, () => toggleHabit(id));
    if (user) {
      api(`/api/user/${user.id}/habit/${id}`, 'PUT', { current: nextCurrent, completed: nextCompleted });
      api(`/api/user/${user.id}/checkin`, 'POST', { habitId: id, value: nextCurrent, statusOverride: nextCompleted ? 'done' : 'missed', note: nextCompleted ? 'Concluído no Painel' : 'Desmarcado' });
    }
  };

  const stepHabit = (id, delta) => {
    const h = habits.find((x) => x.id === id);
    const target = h?.target || 1;
    const nextCurrent = Math.max(0, Math.min(target, (h?.current || 0) + delta));
    const nextCompleted = nextCurrent >= target;
    setHabits((prev) => prev.map((x) => (x.id === id ? { ...x, current: nextCurrent, completed: nextCompleted } : x)));
    if (nextCompleted && !h?.completed) {
      maybeAskSubclass(h);
      showToast?.(`Meta atingida em "${h?.title}"!`, () => toggleHabit(id));
    }
    if (user) {
      api(`/api/user/${user.id}/habit/${id}`, 'PUT', { current: nextCurrent, completed: nextCompleted });
      api(`/api/user/${user.id}/checkin`, 'POST', { habitId: id, value: nextCurrent, statusOverride: nextCompleted ? 'done' : 'partial', note: `Ajustado para ${nextCurrent}` });
    }
  };

  const assignSubclass = (sub) => {
    const p = subPrompt; if (!p) return;
    setHabits((prev) => prev.map((x) => (x.id === p.habitId ? { ...x, subclassId: sub?.id || null, subclassName: sub?.name || null } : x)));
    setSubPrompt(null);
    if (sub) onLogSubclassEffort?.(p.categoryName, sub.name, 1);
    else showToast?.(`Esforço registrado na categoria geral "${p.categoryName}"`);
    if (user) {
      const h = habits.find((x) => x.id === p.habitId);
      api(`/api/user/${user.id}/habit/${p.habitId}`, 'PUT', { current: h?.target || 1, completed: true, subclassId: sub?.id || null, subclassName: sub?.name || null });
    }
  };

  const saveHealth = (rawHealth) => {
    // Toda gravação leva o dia de hoje: o valor de água vale só para este dia (correção A).
    const nextHealth = withWaterToday(rawHealth);
    setHealth(nextHealth);
    if (user) api(`/api/user/${user.id}/health`, 'POST', nextHealth);
  };
  const addWater = () => saveHealth({ ...health, waterGlasses: waterGlasses + 1, waterHistory: [...(health.waterHistory || []), { id: Date.now(), timestamp: hhmm(new Date()), amountMl: glassMl }], waterTarget, glassMl });
  const removeWater = () => { if (waterGlasses > 0) saveHealth({ ...health, waterGlasses: waterGlasses - 1, waterHistory: (health.waterHistory || []).slice(0, -1), waterTarget, glassMl }); };
  const saveSleep = (e) => {
    e.preventDefault();
    const calculated = sleepHours(bedIn, wakeIn);
    saveHealth({ ...health, sleep: { ...(health.sleep || {}), bedTime: bedIn, wakeTime: wakeIn, hours: calculated, logged: true } });
    setSleepEdit(false);
    showToast?.(`Ciclo de sono atualizado: ${calculated}h`);
  };

  // ---------- Linhas ----------
  const tagLine = (name, color) => (
    <span className="tag"><span className="rx-dot" style={{ '--rx-dot': color || '#A78BFA' }} />{name}</span>
  );

  const eventRow = (e) => {
    const isLive = live?.id === e.id;
    return (
      <li key={e.id} className={`rx-row${e.completed ? ' done' : ''}${isLive ? ' live' : ''}`}>
        <span className="time">{e.startTime}</span>
        <span className="node" />
        <div className="body">
          <div className="title"><span className="t">{e.title}</span></div>
          <div className="rx-meta">
            {e.readOnly && <span className="rx-pill"><Building2 size={12} />{e.spaceName}</span>}
            {!e.readOnly && e.category && tagLine(e.category, tags.find((t) => t.name === e.category)?.color)}
            {e.endTime && <span>Até {e.endTime}</span>}
            {isLive && <span className="rx-pill now">Em andamento</span>}
            {e.priority === 'Alta' && <span className="rx-pill high">Prioridade alta</span>}
          </div>
        </div>
        <div className="rx-act">
          {/* Evento do espaço: referência só de leitura (quem muda é o profissional). */}
          {!e.readOnly && (
            <button type="button" className="rx-check" aria-pressed={Boolean(e.completed)} aria-label={`${e.completed ? 'Desmarcar' : 'Concluir'} ${e.title}`} onClick={() => onToggleEvent?.(e.id, !e.completed)}>
              <Check strokeWidth={2.6} />
            </button>
          )}
        </div>
      </li>
    );
  };

  const habitRow = (h) => {
    const cat = catOf(h);
    const target = h.target || 1;
    const current = h.completed ? target : Math.min(target, h.current || 0);
    const multi = target > 1;
    return (
      <li key={h.id} className={`rx-row habit${h.completed ? ' done' : ''}`}>
        <span className="time" /><span className="node" />
        <div className="body">
          <div className="title"><span className="t">{h.title}</span></div>
          <div className="rx-meta">
            {(cat?.name || h.category) && tagLine(cat?.name || h.category, cat?.color)}
            {multi && <span>{current} de {target} {h.unit || 'vezes'}</span>}
            {h.subclassName && <span>{h.subclassName}</span>}
            {h.priority === 'Alta' && !h.completed && <span className="rx-pill high">Prioridade alta</span>}
          </div>
          {multi && <ProgressMeter size="mini" pct={(current / target) * 100} label={`Progresso de ${h.title}`} />}
        </div>
        <div className="rx-act">
          {multi && !h.completed ? (
            <div className="rx-stepper">
              <button type="button" aria-label={`Desfazer o último registro de ${h.title}`} disabled={current <= 0} onClick={() => stepHabit(h.id, -1)}><Minus size={18} /></button>
              <b>{current}/{target}</b>
              <button type="button" aria-label={`Registrar 1 em ${h.title}`} onClick={() => stepHabit(h.id, 1)}><Plus size={18} /></button>
            </div>
          ) : (
            <button type="button" className="rx-check" aria-pressed={Boolean(h.completed)} aria-label={`${h.completed ? 'Desmarcar' : 'Concluir'} ${h.title}`} onClick={() => toggleHabit(h.id)}>
              <Check strokeWidth={2.6} />
            </button>
          )}
        </div>
      </li>
    );
  };

  // Posição da linha "agora" na trilha
  const spineItems = [];
  let nowInserted = false;
  timed.forEach((e) => {
    if (!nowInserted && toMin(e.startTime) > nowMin) { spineItems.push({ now: true }); nowInserted = true; }
    spineItems.push(e);
  });
  if (!nowInserted && timed.length) spineItems.push({ now: true });

  const [lived, setLived] = useState(0);
  const spineRef = React.useRef(null);
  const spineKey = spineItems.map((it) => (it.now ? 'now' : `${it.id}:${it.completed ? 1 : 0}`)).join('|');
  useEffect(() => {
    const sp = spineRef.current; const nl = sp?.querySelector('.now-line');
    const v = sp && nl ? Math.max(0, nl.offsetTop + nl.offsetHeight / 2 - 20) : 0;
    setLived((old) => (old === v ? old : v));
  }, [spineKey, aba]);

  const isEmpty = habits.length === 0 && todayEvents.length === 0;
  const destaque = live || next;
  const resumo = total === 0
    ? (isEmpty ? 'Nada previsto para hoje ainda. Comece criando o primeiro hábito.' : 'Sem hábitos para hoje.')
    : doneCount === total ? `Você concluiu os ${total} hábitos de hoje.` : `Você concluiu ${doneCount} de ${total} hábitos. Faltam ${total - doneCount} para fechar o dia.`;
  const notifs = [
    ...(pendData?.convites || []).map((c) => ({ key: `c${c.inviteId}`, cor: 'var(--rx-m-agenda)', Icon: CalendarClock, t: c.title, d: `${c.changed ? 'Horário mudou' : 'Convite'}, ${c.spaceName}` })),
    ...(pendData?.avisos || []).map((a) => ({ key: `a${a.postId}`, cor: 'var(--rx-m-espacos)', Icon: Megaphone, t: a.title, d: `Aviso de ${a.proName}, ${a.spaceName}` })),
    ...(pendData?.outras || []).map((o) => ({ key: `o${o.id}`, cor: o.type === 'plano_publicado' ? 'var(--rx-m-alim)' : o.type === 'evento_cancelado' ? 'var(--rx-bad)' : 'var(--rx-m-social)', Icon: o.type === 'plano_publicado' ? Utensils : o.type === 'comentario' ? Megaphone : o.type?.startsWith('evento') ? CalendarClock : Bell, t: { comentario: `Resposta em “${o.title}”`, evento_cancelado: `${o.title} foi cancelado`, evento_texto: `${o.title} foi atualizado`, plano_publicado: `Plano alimentar publicado: ${o.title}` }[o.type] || o.title, d: o.spaceName }))
  ];
  const abrirSono = () => { setSleepEdit(true); setTimeout(() => document.getElementById('pnSleepBed')?.focus(), 0); };
  const beberAgua = () => { addWater(); showToast?.(`+1 copo de água (${waterGlasses + 1} de ${waterTarget})`, () => removeWater()); };
  useEffect(() => {
    if (!aguaRequest || aguaAtendida.current === aguaRequest) return;
    aguaAtendida.current = aguaRequest;
    beberAgua();
  }, [aguaRequest]); // eslint-disable-line react-hooks/exhaustive-deps -- atende cada pedido uma vez
  const acoes = [
    { id: 'agua', label: 'Beber água', sub: `${waterGlasses} de ${waterTarget} copos`, Icon: Droplets, cor: 'var(--rx-m-agua)', go: beberAgua },
    focoDisponivel && { id: 'foco', label: 'Começar foco', sub: focoMin ? `${focoMin} min hoje` : 'Sessão de 25 min', Icon: Timer, cor: 'var(--rx-m-foco)', go: () => onSwitchTab?.('focus') },
    { id: 'habito', label: 'Novo hábito', sub: 'Leva poucos segundos', Icon: CheckCircle2, cor: 'var(--rx-m-habitos)', go: () => onOpenAdd?.('habit') },
    { id: 'evento', label: 'Novo evento', sub: 'Na sua agenda', Icon: CalendarPlus, cor: 'var(--rx-m-agenda)', go: () => onOpenAdd?.('event') },
    { id: 'sono', label: 'Registrar sono', sub: sleepLogged ? `${String(hours).replace('.', ',')} h registradas` : 'Ainda não registrado', Icon: Moon, cor: 'var(--rx-m-sono)', go: abrirSono }
  ].filter(Boolean);
  const abaHoje = aba || (habits.length === 0 && todayEvents.length > 0 ? 'agenda' : 'habitos');

  return (
    <div className="pn">
      <div className="pn-col">
        <section className="pn-hero rx-glass-card">
          <DustCanvas variant="head" count={26} />
          <div className="pn-hero-main">
            <h1 className="pn-date">{dateLong}</h1>
            <p className="pn-hi">{greet}{firstName ? `, ${firstName}` : ''}</p>
            <p className="pn-lead">{resumo}</p>
            {destaque && (
              <div className={`pn-now${live ? ' live' : ''}`}>
                <span className="rx-tile solid" style={{ '--c': destaque.readOnly ? 'var(--rx-m-espacos)' : 'var(--rx-m-agenda)' }}><CalendarClock size={20} /></span>
                <div className="tx">
                  <span className="pn-live">{live ? 'Agora' : `Próximo, às ${next.startTime}`}</span>
                  <b>{destaque.title}</b>
                  <small>{destaque.startTime}{destaque.endTime ? ` às ${destaque.endTime}` : ''}{destaque.location ? `, ${destaque.location}` : ''}{destaque.readOnly ? `, ${destaque.spaceName}` : ''}</small>
                </div>
                {focoDisponivel && <button type="button" className="rx-btn tiny" onClick={() => onSwitchTab?.('focus')}><Play size={15} />Focar agora</button>}
              </div>
            )}
            {pendencias > 0 && (
              <div className="es-banner" role="status" data-testid="painel-pendencias">
                <Bell size={18} />
                <span className="grow">{pendencias === 1 ? '1 notificação' : `${pendencias} notificações`} dos seus espaços.</span>
                <button type="button" className="rx-link" onClick={onOpenPendencias}>Ver notificações</button>
              </div>
            )}
          </div>
          {total > 0 && (
            <div className="pn-ring big" style={{ '--p': taskPct, '--c': 'var(--rx-m-habitos)' }} role="img" aria-label={`${taskPct}% dos hábitos de hoje`}><b>{taskPct}%</b></div>
          )}
        </section>

        <section className="pn-quick" aria-label="Ações rápidas">
          {acoes.map((a) => (
            <button key={a.id} type="button" className="pn-qa rx-glass-card" style={{ '--c': a.cor }} onClick={a.go} data-testid={`pn-acao-${a.id}`}>
              <span className="rx-tile solid lg"><a.Icon size={24} strokeWidth={1.9} /></span>
              <span><b>{a.label}</b><small>{a.sub}</small></span>
            </button>
          ))}
        </section>

        <section className="pn-stats" aria-label="Seu dia em números">
          <div className="pn-stat rx-glass-card" style={{ '--c': 'var(--rx-m-habitos)' }}>
            <h3><span className="rx-tile sm"><CheckCircle2 size={17} /></span>Hábitos</h3>
            <div className="v">{doneCount}<small> de {total}</small></div>
            <ProgressMeter size="mini" pct={taskPct} label="Progresso dos hábitos de hoje" />
          </div>
          <div className="pn-stat rx-glass-card" style={{ '--c': 'var(--rx-m-agua)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h3 style={{ margin: 0 }}><span className="rx-tile sm"><Droplets size={17} /></span>Água</h3>
              <button
                type="button"
                className="rx-icon-btn sm"
                onClick={() => {
                  setCustomTarget(waterTarget);
                  setCustomGlassMl(glassMl);
                  setWaterEditOpen(true);
                }}
                title="Editar meta de água"
                aria-label="Editar meta de água"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--rx-ink-3)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '8px'
                }}
              >
                <Sliders size={14} />
              </button>
            </div>
            <div className="v">{waterGlasses}<small> de {waterTarget} copos</small></div>
            <div style={{ fontSize: '11px', color: 'var(--rx-ink-3)', margin: '-2px 0 6px' }}>
              {((waterGlasses * glassMl) / 1000).toFixed(1).replace('.', ',')} L de {((waterTarget * glassMl) / 1000).toFixed(1).replace('.', ',')} L ({glassMl} ml/copo)
            </div>
            <div className="ft">
              <div className="pn-cups" aria-hidden="true">{Array.from({ length: Math.min(waterTarget, 12) }, (_, k) => <i key={k} className={k < Math.round((waterGlasses / waterTarget) * Math.min(waterTarget, 12)) ? 'on' : ''} />)}</div>
              <div className="rx-stepper sm">
                <button type="button" onClick={removeWater} disabled={waterGlasses <= 0} aria-label="Remover último copo"><Minus size={16} /></button>
                <button type="button" className="plus" onClick={addWater} aria-label="Adicionar um copo"><Plus size={16} /></button>
              </div>
            </div>
          </div>
          <div className="pn-stat rx-glass-card" style={{ '--c': 'var(--rx-m-sono)' }}>
            <h3><span className="rx-tile sm"><Moon size={17} /></span>Sono</h3>
            {!sleepEdit && sleepLogged && (<>
              <div className="v">{String(hours).replace('.', ',')}<small> h</small></div>
              <p>Dormiu {health.sleep.bedTime}, acordou {health.sleep.wakeTime}</p>
              <div className="ft"><button type="button" className="rx-btn ghost tiny" onClick={abrirSono}>Editar</button></div>
            </>)}
            {sleepEdit && (
              <form className="rx-form-inline" onSubmit={saveSleep}>
                <label>Dormiu <input id="pnSleepBed" type="time" value={bedIn} onChange={(e) => setBedIn(e.target.value)} required /></label>
                <label>Acordou <input type="time" value={wakeIn} onChange={(e) => setWakeIn(e.target.value)} required /></label>
                <button type="submit" className="rx-btn tiny">Salvar</button>
                <button type="button" className="rx-btn ghost tiny" onClick={() => setSleepEdit(false)}>Cancelar</button>
              </form>
            )}
            {!sleepEdit && !sleepLogged && (<>
              <div className="v muted">–</div>
              <div className="ft"><button type="button" className="rx-btn ghost tiny" onClick={abrirSono}>Registrar sono</button></div>
            </>)}
          </div>
          {focoDisponivel ? (
            <div className="pn-stat rx-glass-card" style={{ '--c': 'var(--rx-m-foco)' }}>
              <h3><span className="rx-tile sm"><Timer size={17} /></span>Foco</h3>
              <div className="v">{focoMin}<small> min hoje</small></div>
              <div className="ft"><button type="button" className="rx-btn ghost tiny" onClick={() => onSwitchTab?.('focus')}><Play size={14} />Abrir foco</button></div>
            </div>
          ) : (
            <div className="pn-stat rx-glass-card" style={{ '--c': 'var(--rx-m-treino)' }}>
              <h3><span className="rx-tile sm"><Dumbbell size={17} /></span>Treino</h3>
              <div className="v">{todayWorkouts.length}<small> {todayWorkouts.length === 1 ? 'ficha hoje' : 'fichas hoje'}</small></div>
              <div className="ft"><button type="button" className="rx-btn ghost tiny" onClick={() => onSwitchTab?.('workouts')}>Abrir treino</button></div>
            </div>
          )}
        </section>

        <section className="pn-today rx-glass-card">
          <div className="pn-today-head">
            <h2>Hoje</h2>
            {!isEmpty && (
              <div className="tl-seg" role="group" aria-label="O que mostrar">
                <button type="button" aria-pressed={abaHoje === 'habitos'} onClick={() => setAba('habitos')}>Hábitos <span>{pending.length}</span></button>
                <button type="button" aria-pressed={abaHoje === 'agenda'} onClick={() => setAba('agenda')}>Agenda <span>{todayEvents.length + todayWorkouts.length}</span></button>
              </div>
            )}
          </div>
          {isEmpty ? (
            <div className="rx-empty">
              <h2>Seu dia está livre</h2>
              <p>Você ainda não tem hábitos nem compromissos para hoje. Comece criando o primeiro.</p>
              <button type="button" className="rx-btn" onClick={() => onOpenAdd?.('habit')}><Plus size={18} />Criar hábito</button>
            </div>
          ) : abaHoje === 'habitos' ? (
            <section className="rx-loose">
              <ul>{pending.map(habitRow)}</ul>
              {habits.length === 0 && <p className="rx-sub">Nenhum hábito ainda. <button type="button" className="rx-link" onClick={() => onOpenAdd?.('habit')}>Criar hábito</button></p>}
              {pending.length === 0 && habits.length > 0 && <p className="rx-sub">Todos os hábitos de hoje foram concluídos.</p>}
              {completed.length > 0 && (
                <details className="rx-done-box" open={doneOpen} onToggle={(e) => setDoneOpen(e.currentTarget.open)}>
                  <summary><ChevronDown size={18} /><span>Concluídos ({completed.length})</span></summary>
                  <ul>{completed.map(habitRow)}</ul>
                </details>
              )}
            </section>
          ) : (
            <>
              {spineItems.length > 0 && (
                <ol className="rx-spine" ref={spineRef} style={{ '--lived': `${lived}px` }}>
                  {spineItems.map((it, i) => it.now ? (
                    <li key={`now-${i}`} className="rx-row now-line"><span className="time">{hhmm(now)}</span><span className="node" /><div className="rule">agora</div></li>
                  ) : eventRow(it))}
                </ol>
              )}
              {(allDay.length > 0 || todayWorkouts.length > 0) && (
                <section className="rx-loose">
                  <h2>Ao longo do dia <small>Compromissos de dia inteiro e treinos</small></h2>
                  <ul>
                    {allDay.map((e) => eventRow({ ...e, startTime: '' }))}
                    {todayWorkouts.map((w) => (
                      <li key={`w${w.id}`} className="rx-row">
                        <div className="body"><div className="title"><span className="t">Treino: {w.name}</span></div><div className="rx-meta"><span>Ficha agendada para hoje</span></div></div>
                        <div className="rx-act"><button type="button" className="rx-btn ghost tiny" onClick={() => onSwitchTab?.('workouts')}>Abrir treino</button></div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {todayEvents.length === 0 && todayWorkouts.length === 0 && <p className="rx-sub">Sem compromissos hoje. <button type="button" className="rx-link" onClick={() => onOpenAdd?.('event')}>Novo evento</button></p>}
            </>
          )}
        </section>
      </div>

      <aside className="pn-col pn-side" aria-label="Resumo do dia">
        <section className="pn-card rx-glass-card" data-testid="painel-notificacoes">
          <h2><span className="rx-tile sm solid" style={{ '--c': 'var(--rx-alert)' }}><Bell size={16} /></span>Notificações{notifs.length > 0 && <span className="pn-new">{notifs.length} {notifs.length === 1 ? 'nova' : 'novas'}</span>}</h2>
          {notifs.length === 0 ? (
            <p className="rx-sub">Tudo em dia. Convites e avisos dos seus espaços aparecem aqui.</p>
          ) : (
            <ul className="pn-nts">
              {notifs.slice(0, 3).map((n) => (
                <li key={n.key} style={{ '--c': n.cor }}>
                  <span className="rx-tile"><n.Icon size={18} /></span>
                  <div><b>{n.t}</b><small>{n.d}</small></div>
                </li>
              ))}
            </ul>
          )}
          {notifs.length > 0 && <button type="button" className="rx-btn ghost tiny pn-full" onClick={onOpenPendencias}>{notifs.length > 3 ? `Ver todas (${notifs.length})` : 'Abrir notificações'}</button>}
        </section>

        <section className="pn-card rx-glass-card summary">
          <DustCanvas variant="score" count={18} />
          <h2>Vitalidade de hoje</h2>
          <div className="pn-vit">
            <div className="pn-ring" style={{ '--p': vitality, '--c': 'var(--rx-violet)' }} role="img" aria-label={`Vitalidade ${vitality}`}><b>{vitality}</b></div>
            <div><b className="w">{vitalityLabel}</b><p className="rx-sub">40% hábitos, 30% água e 30% sono</p></div>
          </div>
          <dl className="rx-facts">
            <div><dt>Hábitos</dt><dd>{doneCount}<small> de {total}</small></dd></div>
            <div><dt>Água</dt><dd>{waterPct}<small> %</small></dd></div>
            <div><dt>Sono</dt><dd>{sleepLogged ? String(hours).replace('.', ',') : '—'}<small>{sleepLogged ? ' h' : ''}</small></dd></div>
          </dl>
        </section>

        <section className="pn-card rx-glass-card">
          <h2>Agenda de hoje <button type="button" className="rx-link" onClick={() => onSwitchTab?.('calendar')}>Abrir agenda</button></h2>
          <ul className="rx-list">
            <li><span className="ic"><CalendarClock size={18} /></span><div><b>{todayEvents.length ? `${todayEvents.length} compromisso${todayEvents.length > 1 ? 's' : ''}` : 'Sem compromissos'}</b><p>{next ? `Próximo: ${next.title}, às ${next.startTime}.` : todayEvents.length ? 'Nenhum outro compromisso mais tarde.' : 'Use o botão Novo para agendar.'}</p></div></li>
            {todayWorkouts.length > 0 && <li><span className="ic violet"><Dumbbell size={18} /></span><div><b>Treino: {todayWorkouts[0].name}</b><p>Ficha agendada para hoje.</p></div></li>}
          </ul>
        </section>

        <section className="pn-card rx-glass-card">
          <h2>Histórico</h2>
          <ul className="rx-list">
            <li><span className="ic violet"><History size={18} /></span><div><b>Consistência ao longo das semanas</b><p>Sequências, semanas e insights entram na próxima atualização, calculados a partir dos seus registros.</p></div></li>
            <li><span className="ic"><Sparkles size={18} /></span><div><b>Hoje</b><p>{anyActivity ? `Você já registrou atividade hoje: ${doneCount} hábito${doneCount === 1 ? '' : 's'}, ${waterGlasses} copo${waterGlasses === 1 ? '' : 's'} de água.` : 'Assim que você registrar algo, o resumo do dia aparece aqui.'}</p></div></li>
          </ul>
        </section>
      </aside>

      {waterEditOpen && (
        <div className="rx-overlay" onClick={() => setWaterEditOpen(false)}>
          <div
            className="rx-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pn-water-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', width: '92vw' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 id="pn-water-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--rx-ink)' }}>
                Meta de Hidratação Diária
              </h2>
              <button
                type="button"
                onClick={() => setWaterEditOpen(false)}
                aria-label="Fechar"
                style={{ background: 'none', border: 'none', color: 'var(--rx-ink-3)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* SUGESTÃO PERSONALIZADA BASEADA NO PESO DO USUÁRIO */}
            <div style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Sugestão personalizada
                </span>
                {waterSuggestion.targetGlasses > 0 && (
                  <button
                    type="button"
                    className="rx-btn tiny"
                    onClick={applyWaterSuggestion}
                    style={{ fontSize: '0.74rem', padding: '3px 9px' }}
                  >
                    Aplicar sugestão
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--rx-ink-2)', lineHeight: 1.4 }}>
                {Number(customWeight) > 0 ? (
                  <>
                    Com base no seu peso de <b>{customWeight} kg</b> (× 35 ml):{' '}
                    <b>{String(waterSuggestion.dailyLiters).replace('.', ',')} L por dia</b> ({waterSuggestion.targetGlasses} copos de {customGlassMl} ml).
                  </>
                ) : (
                  <>
                    Informe seu peso abaixo para calcular sua meta ideal de hidratação (35 ml por kg de peso corporal).
                  </>
                )}
              </p>
            </div>

            <form onSubmit={handleSaveWaterTarget} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="rx-field">
                  <label htmlFor="pn-water-weight">Seu peso (kg)</label>
                  <input
                    id="pn-water-weight"
                    type="number"
                    step="0.5"
                    min="20"
                    max="300"
                    placeholder="Ex: 70"
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="rx-field">
                  <label htmlFor="pn-water-glass">Tamanho do copo</label>
                  <select
                    id="pn-water-glass"
                    value={customGlassMl}
                    onChange={(e) => setCustomGlassMl(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    <option value={200}>200 ml (copo pequeno)</option>
                    <option value={250}>250 ml (copo padrão)</option>
                    <option value={300}>300 ml (copo grande)</option>
                    <option value={500}>500 ml (garrafinha)</option>
                  </select>
                </div>
              </div>

              <div className="rx-field">
                <label htmlFor="pn-water-target">Meta diária (em copos)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    id="pn-water-target"
                    type="number"
                    min="1"
                    max="30"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(Math.max(1, Number(e.target.value)))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--rx-ink-3)', whiteSpace: 'nowrap' }}>
                    = {((customTarget * customGlassMl) / 1000).toFixed(2).replace('.', ',')} L / dia
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="rx-btn ghost" onClick={() => setWaterEditOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="rx-btn">
                  Salvar meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subPrompt && (
        <div className="rx-overlay" onClick={(e) => { if (e.target === e.currentTarget) assignSubclass(null); }}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="rxSubTitle">
            <h2 id="rxSubTitle">Em qual parte de {subPrompt.categoryName}?</h2>
            <p>"{subPrompt.habitTitle}" foi concluído. Escolha a subclasse para registrar o esforço, se quiser.</p>
            <div className="opts">
              {subPrompt.subclasses.map((s) => (
                <button key={s.id || s.name} type="button" className="rx-btn ghost" onClick={() => assignSubclass(s)}>{s.name}</button>
              ))}
              <button type="button" className="rx-btn ghost" onClick={() => assignSubclass(null)}>Pular</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PainelTab;
