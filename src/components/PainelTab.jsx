import React, { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Droplets, Moon, Timer, Dumbbell, ChevronDown, CalendarClock, History, Sparkles, Bell, Building2 } from 'lucide-react';
import { isEventForDate } from '../services/storage';
import { ProgressMeter } from './rx/ProgressMeter';
import { DustCanvas } from './rx/DustCanvas';
import { withWaterToday } from '../utils/healthDay';

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
  spaceEvents = [], pendencias = 0, onOpenPendencias
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const [doneOpen, setDoneOpen] = useState(false);
  const [subPrompt, setSubPrompt] = useState(null);
  const [sleepEdit, setSleepEdit] = useState(false);
  const [bedIn, setBedIn] = useState(health?.sleep?.bedTime || '23:30');
  const [wakeIn, setWakeIn] = useState(health?.sleep?.wakeTime || '07:00');

  const todayStr = localDate(now);
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
  }, [spineKey]);

  const isEmpty = habits.length === 0 && todayEvents.length === 0;
  const lead = live
    ? <>{greet}{firstName ? `, ${firstName}` : ''}. Agora são {hhmm(now)} e <b>{live.title}</b>{live.endTime ? ` termina às ${live.endTime}` : ' está em andamento'}.</>
    : next
      ? <>{greet}{firstName ? `, ${firstName}` : ''}. O próximo compromisso é <b>{next.title}</b>, às {next.startTime}.</>
      : <>{greet}{firstName ? `, ${firstName}` : ''}.{isEmpty ? ' Nada previsto para hoje ainda.' : ''}</>;

  return (
    <div className="rx-grid">
      <div className="rx-day">
        <header className="rx-hero">
          <DustCanvas variant="head" count={26} />
          <h1>{dateLong}</h1>
          <p className="rx-lead">{lead}</p>
          {total > 0 && (
            <div className="rx-meter-row">
              <span>{doneCount} de {total} hábitos concluídos</span>
              <ProgressMeter pct={taskPct} label="Progresso dos hábitos de hoje" />
              <span className="pct">{taskPct}%</span>
            </div>
          )}
          {pendencias > 0 && (
            <div className="es-banner" role="status" data-testid="painel-pendencias">
              <Bell size={18} />
              <span className="grow">{pendencias === 1 ? '1 pendência' : `${pendencias} pendências`} dos seus espaços: convites e avisos.</span>
              <button type="button" className="rx-link" onClick={onOpenPendencias}>Ver pendências</button>
            </div>
          )}
        </header>

        <div className="rx-trail">
          {isEmpty ? (
            <div className="rx-empty">
              <h2>Seu dia está livre</h2>
              <p>Você ainda não tem hábitos nem compromissos para hoje. Comece criando o primeiro.</p>
              <button type="button" className="rx-btn" onClick={() => onOpenAdd?.()}><Plus size={18} />Criar hábito</button>
            </div>
          ) : (
            <>
              {spineItems.length > 0 && (
                <ol className="rx-spine" ref={spineRef} style={{ '--lived': `${lived}px` }}>
                  {spineItems.map((it, i) => it.now ? (
                    <li key={`now-${i}`} className="rx-row now-line"><span className="time">{hhmm(now)}</span><span className="node" /><div className="rule">agora</div></li>
                  ) : eventRow(it))}
                </ol>
              )}

              <section className="rx-loose">
                <h2>Ao longo do dia <small>{allDay.length ? 'Hábitos e compromissos de dia inteiro' : 'Hábitos sem horário fixo'}</small></h2>
                <ul>
                  {allDay.map((e) => eventRow({ ...e, startTime: '' }))}
                  {pending.map(habitRow)}
                </ul>
                {pending.length === 0 && allDay.length === 0 && habits.length > 0 && (
                  <p className="rx-sub">Todos os hábitos de hoje foram concluídos.</p>
                )}
                {completed.length > 0 && (
                  <details className="rx-done-box" open={doneOpen} onToggle={(e) => setDoneOpen(e.currentTarget.open)}>
                    <summary><ChevronDown size={18} /><span>Concluídos ({completed.length})</span></summary>
                    <ul>{completed.map(habitRow)}</ul>
                  </details>
                )}
              </section>
            </>
          )}
        </div>

        <section className="rx-strip" aria-label="Corpo e foco">
          <div className="rx-seg">
            <h3><Droplets size={18} />Água</h3>
            <div className="v">{waterGlasses} <small>de {waterTarget} copos</small></div>
            <div className="rx-ticks">{Array.from({ length: Math.min(waterTarget, 16) }, (_, k) => <i key={k} className={k < Math.round((waterGlasses / waterTarget) * Math.min(waterTarget, 16)) ? 'on' : ''} />)}</div>
            <p>{((waterGlasses * glassMl) / 1000).toFixed(2).replace('.', ',')} L de {((waterTarget * glassMl) / 1000).toFixed(1).replace('.', ',')} L</p>
            <div className="rx-row-btns">
              <button type="button" className="rx-btn ghost tiny" onClick={removeWater} disabled={waterGlasses <= 0} aria-label="Remover último copo">−1</button>
              <button type="button" className="rx-btn tiny" onClick={addWater}><Plus size={16} />1 copo</button>
            </div>
          </div>
          <div className="rx-seg">
            <h3><Moon size={18} />Sono</h3>
            {sleepLogged && !sleepEdit ? (
              <>
                <div className="v">{String(hours).replace('.', ',')}h</div>
                <p>Dormiu {health.sleep.bedTime} e acordou {health.sleep.wakeTime}. Meta de {health?.sleep?.targetHours || 8}h.</p>
                <div className="rx-row-btns"><button type="button" className="rx-btn ghost tiny" onClick={() => setSleepEdit(true)}>Editar</button></div>
              </>
            ) : sleepEdit ? (
              <form className="rx-form-inline" onSubmit={saveSleep}>
                <label>Dormiu <input type="time" value={bedIn} onChange={(e) => setBedIn(e.target.value)} required /></label>
                <label>Acordou <input type="time" value={wakeIn} onChange={(e) => setWakeIn(e.target.value)} required /></label>
                <button type="submit" className="rx-btn tiny">Salvar</button>
                <button type="button" className="rx-btn ghost tiny" onClick={() => setSleepEdit(false)}>Cancelar</button>
              </form>
            ) : (
              <>
                <div className="v">—</div>
                <p>Registre a noite passada para entrar no índice do dia.</p>
                <div className="rx-row-btns"><button type="button" className="rx-btn ghost tiny" onClick={() => setSleepEdit(true)}>Registrar sono</button></div>
              </>
            )}
          </div>
          <div className="rx-seg">
            <h3><Timer size={18} />Foco</h3>
            <div className="v">Pomodoro</div>
            <p>Sessões de foco com temporizador e sons.</p>
            <div className="rx-row-btns"><button type="button" className="rx-btn ghost tiny" onClick={() => onSwitchTab?.('focus')}>Abrir foco</button></div>
          </div>
          <div className="rx-seg">
            <h3><Dumbbell size={18} />Treino</h3>
            <div className="v">{todayWorkouts[0]?.name || 'Livre'}</div>
            <p>{todayWorkouts.length ? `${todayWorkouts.length} ficha${todayWorkouts.length > 1 ? 's' : ''} para hoje` : 'Nenhuma ficha agendada para hoje.'}</p>
            <div className="rx-row-btns"><button type="button" className="rx-btn ghost tiny" onClick={() => onSwitchTab?.('workouts')}>Abrir treino</button></div>
          </div>
        </section>
      </div>

      <aside className="rx-rail" aria-label="Resumo do dia">
        <section className="summary">
          <DustCanvas variant="score" count={18} />
          <h2>Vitalidade de hoje</h2>
          <div className="rx-score"><span className="n">{vitality}</span><span className="w">{vitalityLabel}</span></div>
          <p className="rx-sub">40% hábitos, 30% água e 30% sono</p>
          <dl className="rx-facts">
            <div><dt>Hábitos</dt><dd>{doneCount}<small> de {total}</small></dd></div>
            <div><dt>Água</dt><dd>{waterPct}<small> %</small></dd></div>
            <div><dt>Sono</dt><dd>{sleepLogged ? String(hours).replace('.', ',') : '—'}<small>{sleepLogged ? ' h' : ''}</small></dd></div>
          </dl>
        </section>
        <section>
          <h2>Agenda de hoje <button type="button" className="rx-link" onClick={() => onSwitchTab?.('calendar')}>Abrir agenda</button></h2>
          <ul className="rx-list">
            <li><span className="ic"><CalendarClock size={18} /></span><div><b>{todayEvents.length ? `${todayEvents.length} compromisso${todayEvents.length > 1 ? 's' : ''}` : 'Sem compromissos'}</b><p>{next ? `Próximo: ${next.title}, às ${next.startTime}.` : todayEvents.length ? 'Nenhum outro compromisso mais tarde.' : 'Use o botão Novo para agendar.'}</p></div></li>
            {todayWorkouts.length > 0 && <li><span className="ic violet"><Dumbbell size={18} /></span><div><b>Treino: {todayWorkouts[0].name}</b><p>Ficha agendada para hoje.</p></div></li>}
          </ul>
        </section>
        <section>
          <h2>Histórico</h2>
          <ul className="rx-list">
            <li><span className="ic violet"><History size={18} /></span><div><b>Consistência ao longo das semanas</b><p>Sequências, semanas e insights entram na próxima atualização, calculados a partir dos seus registros.</p></div></li>
            <li><span className="ic"><Sparkles size={18} /></span><div><b>Hoje</b><p>{anyActivity ? `Você já registrou atividade hoje: ${doneCount} hábito${doneCount === 1 ? '' : 's'}, ${waterGlasses} copo${waterGlasses === 1 ? '' : 's'} de água.` : 'Assim que você registrar algo, o resumo do dia aparece aqui.'}</p></div></li>
          </ul>
        </section>
      </aside>

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
