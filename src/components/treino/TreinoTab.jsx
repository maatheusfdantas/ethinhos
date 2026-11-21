import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, CheckCircle2, Clock, Dumbbell, History, Info, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { EXERCISE_LIBRARY_CATALOG, EXERCISE_LIBRARY_GROUPS, WORKOUT_THEMES } from '../WorkoutTab';
import { TreinoAtivo, TreinoResumo } from './TreinoAtivo';
import { DoSeuPersonal } from './DoSeuPersonal';
import { fmtKg, newSessionId, treinoApi } from './treinoApi';
import '../../styles/treino.css';

const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const accentOf = (w) => (WORKOUT_THEMES.find((t) => t.id === w?.theme) || WORKOUT_THEMES[0]).accent;
const daysText = (w) => {
  const d = WEEK_ORDER.filter((i) => (w.scheduledDays || []).includes(i)).map((i) => DAY_SHORT[i]);
  return d.length ? `${d.join(', ')} às ${w.scheduledTime || '18:30'}` : 'Sem dia na agenda';
};
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const blankExercise = () => ({ id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: '', sets: 3, reps: 10, weightKg: 0, restSec: 60, showWeight: true, showRestTimer: true });
const newWorkout = () => ({ id: `wo_${Date.now()}`, name: '', subtitle: 'Foco em força e hipertrofia progressiva', theme: 'orange', scheduledDays: [1], scheduledTime: '18:30', exercises: [] });

/**
 * Treino (redesenho aprovado em 18/11/2026, proposta 05). Usa as mesmas fichas de sempre (workouts);
 * as sessões ficam no servidor (/api/treino). O WorkoutTab antigo continua no código, sem uso nesta tela.
 */
export function TreinoTab({ workouts = [], setWorkouts, onCompleteWorkout, showToast, user }) {
  const [view, setView] = useState('home');
  const [draft, setDraft] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [libGroup, setLibGroup] = useState('all');
  const [libQuery, setLibQuery] = useState('');
  const [libTarget, setLibTarget] = useState('');
  const [custom, setCustom] = useState(null);
  const [history, setHistory] = useState({ sessions: [], exercises: [], loaded: false, error: '' });
  const [open, setOpen] = useState(null);
  const [active, setActive] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [finished, setFinished] = useState(null);
  const [progressKey, setProgressKey] = useState('');
  const [progress, setProgress] = useState([]);
  const [starting, setStarting] = useState(false);
  const [atribuidos, setAtribuidos] = useState([]);
  const toast = (m) => (showToast ? showToast(m) : undefined);
  const userId = user?.id;

  const loadServer = useCallback(async () => {
    try {
      const [h, o] = await Promise.all([treinoApi.historico(60), treinoApi.aberta()]);
      setHistory({ sessions: h.sessions || [], exercises: h.exercises || [], loaded: true, error: '' });
      setOpen(o.session || null);
      // "Do seu personal": se a parte dos espaços ainda não existir no servidor, a seção só não aparece.
      treinoApi.atribuidos().then((r) => setAtribuidos(r.atribuidos || []), () => setAtribuidos([]));
    } catch (e) {
      setHistory({ sessions: [], exercises: [], loaded: true, error: e?.code === 'treino_indisponivel' ? 'O histórico de treinos ainda não está disponível.' : 'Não foi possível carregar o histórico agora.' });
    }
  }, []);

  useEffect(() => {
    if (userId) loadServer();
  }, [userId, loadServer]);

  useEffect(() => {
    if (!progressKey) return;
    let alive = true;
    treinoApi.progresso(progressKey).then((r) => alive && setProgress(r.weeks || []), () => alive && setProgress([]));
    return () => { alive = false; };
  }, [progressKey]);

  const own = workouts;
  const today = new Date();
  const dow = today.getDay();

  const go = (v) => {
    setView(v);
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
  };

  const loadSuggestions = async (exercises) => {
    try {
      const keys = exercises.map((e) => e.id).filter(Boolean);
      if (keys.length) setSuggestions((await treinoApi.ultimas(keys)).last || {});
    } catch {
      setSuggestions({});
    }
  };

  // Ficha do profissional: o conteúdo vem da cópia no servidor (o navegador manda só o id da atribuição).
  const startAssignment = async (a) => {
    if (starting) return;
    setStarting(true);
    try {
      const r = await treinoApi.iniciar({ id: newSessionId(), assignmentId: a.id });
      if (r.resumed && r.session?.assignmentId !== a.id) toast(r.message || 'Você já tem um treino em andamento. Ele foi retomado.');
      await loadSuggestions(r.session.content.exercises || []);
      setActive(r.session);
      setOpen(r.session);
      go('ativo');
    } catch (e) {
      toast(e?.message || 'Não foi possível iniciar o treino. Confira a conexão.');
    } finally {
      setStarting(false);
    }
  };

  const copyAssignment = (a) => {
    const copy = { id: `wo_${Date.now()}`, name: `${a.name} (cópia)`, subtitle: `Copiada da ficha de ${a.proName}`, theme: 'blue', scheduledDays: [], scheduledTime: '18:30', exercises: a.content.exercises.map((e) => ({ ...e, id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` })) };
    setWorkouts((prev) => [...prev, copy]);
    toast(`${a.name} foi copiada para as suas fichas. A ficha do profissional continua igual.`);
  };

  const startWorkout = async (w) => {
    if (starting) return;
    if (!w.exercises?.length) {
      toast('Adicione pelo menos um exercício à ficha antes de começar.');
      return;
    }
    setStarting(true);
    try {
      const content = { exercises: w.exercises.map((e) => ({ id: e.id, name: e.name, sets: e.sets, reps: e.reps, weightKg: e.weightKg, restSec: e.restSec, showWeight: e.showWeight, showRestTimer: e.showRestTimer, muscle: e.muscle })) };
      const r = await treinoApi.iniciar({ id: newSessionId(), name: w.name, workoutRef: w.id, content });
      if (r.resumed && r.session?.workoutRef !== w.id) toast(r.message || 'Você já tem um treino em andamento. Ele foi retomado.');
      await loadSuggestions(r.session.content.exercises || []);
      setActive(r.session);
      setOpen(r.session);
      go('ativo');
    } catch (e) {
      toast(e?.code === 'treino_indisponivel' ? 'O treino ativo ainda não está disponível. Tente mais tarde.' : 'Não foi possível iniciar o treino. Confira a conexão.');
    } finally {
      setStarting(false);
    }
  };

  const resume = async () => {
    if (!open) return;
    await loadSuggestions(open.content?.exercises || []);
    setActive(open);
    go('ativo');
  };

  // ---------- números da semana (só dados reais) ----------
  const stats = useMemo(() => {
    const closed = history.sessions.filter((s) => s.status !== 'em_andamento');
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((dow + 6) % 7));
    const weekDates = WEEK_ORDER.map((d, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return { idx: d, date: localDate(dt) };
    });
    const trainedDates = new Set(closed.filter((s) => s.doneSets > 0).map((s) => localDate(new Date(s.startedAt))));
    const week = weekDates.map(({ idx, date }) => ({
      idx, date,
      names: own.filter((w) => (w.scheduledDays || []).includes(idx)).map((w) => w.name),
      done: trainedDates.has(date),
      today: date === localDate(today)
    }));
    const scheduledDays = week.filter((d) => d.names.length).length;
    const trainedThisWeek = week.filter((d) => d.done).length;
    const month = closed.filter((s) => { const d = new Date(s.startedAt); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); });
    const full = closed.filter((s) => s.status === 'concluida');
    const avg = full.length ? Math.round(full.reduce((a, s) => a + (s.elapsedMs || 0), 0) / full.length / 60000) : null;
    let next = null;
    for (let k = 0; k < 7 && !next; k++) {
      const d = (dow + k) % 7;
      const nowHm = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
      const cands = own.filter((w) => (w.scheduledDays || []).includes(d) && (k > 0 || (w.scheduledTime || '23:59') >= nowHm)).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
      if (cands[0]) next = { w: cands[0], when: k === 0 ? `Hoje, ${cands[0].scheduledTime}` : `${DAY_SHORT[d]}, ${cands[0].scheduledTime}` };
    }
    return { week, scheduledDays, trainedThisWeek, month: month.length, monthIncomplete: month.filter((s) => s.status === 'incompleta').length, avg, next };
  }, [history.sessions, own, dow]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- edição ----------
  const openEditor = (w) => {
    setDraft(JSON.parse(JSON.stringify(w || newWorkout())));
    go('editor');
  };
  const saveDraft = (andThen) => {
    const name = (draft?.name || '').trim();
    if (!name) {
      toast('Dê um nome para a ficha.');
      return null;
    }
    const clean = { ...draft, name, subtitle: (draft.subtitle || '').trim(), exercises: (draft.exercises || []).filter((e) => (e.name || '').trim()).map((e) => ({ ...e, name: e.name.trim(), sets: Math.max(1, Number(e.sets) || 1), reps: Math.max(0, Number(e.reps) || 0), weightKg: Math.max(0, Number(String(e.weightKg).replace(',', '.')) || 0), restSec: Math.max(0, Number(e.restSec) || 0) })) };
    setWorkouts((prev) => (prev.some((w) => w.id === clean.id) ? prev.map((w) => (w.id === clean.id ? clean : w)) : [...prev, clean]));
    if (andThen) andThen(clean);
    else {
      toast('Ficha salva.');
      go('home');
    }
    return clean;
  };
  const deleteWorkout = (id) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    setConfirm(null);
    toast('Ficha excluída. As sessões já feitas continuam no histórico.');
    go('home');
  };
  const setEx = (i, patch) => setDraft((d) => ({ ...d, exercises: d.exercises.map((e, k) => (k === i ? { ...e, ...patch } : e)) }));

  const addFromLibrary = (card, targetId) => {
    const target = own.find((w) => w.id === targetId);
    if (!target) {
      toast('Crie uma ficha primeiro.');
      return;
    }
    const ex = { id: `ex_lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: card.name, muscle: card.muscle, sets: card.sets || 4, reps: card.reps || 10, weightKg: card.weightKg || 0, restSec: card.restSec || 60, showWeight: (card.weightKg || 0) > 0, showRestTimer: true };
    setWorkouts((prev) => prev.map((w) => (w.id === targetId ? { ...w, exercises: [...(w.exercises || []), ex] } : w)));
    toast(`${card.name} entrou em ${target.name}.`);
  };

  const target = libTarget || own[0]?.id || '';

  // ---------- telas ----------
  let body;
  if (view === 'ativo' && active) {
    body = (
      <TreinoAtivo
        session={active}
        suggestions={suggestions}
        showToast={toast}
        onChange={(s) => { setActive(s); setOpen(s); }}
        onFinished={(s) => { setFinished(s); setActive(null); setOpen(null); onCompleteWorkout?.(s.name); loadServer(); go('resumo'); }}
        onDiscarded={() => { setActive(null); setOpen(null); toast('Sessão reiniciada.'); go('home'); }}
      />
    );
  } else if (view === 'resumo' && finished) {
    body = <TreinoResumo session={finished} onBack={() => go('home')} />;
  } else if (view === 'editor' && draft) {
    const isNew = !own.some((w) => w.id === draft.id);
    body = (
      <>
        <div className="tr-head">
          <div><h1>{isNew ? 'Nova ficha' : 'Editar ficha'}</h1><p>Dias na agenda, horário, estilo do card, séries, carga e descanso.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('home')}>Voltar para as fichas</button><button type="button" className="rx-btn" onClick={() => saveDraft()}>Salvar ficha</button></div>
        </div>
        <div className="tr-grid">
          <article className="tr-panel">
            <div className="tr-field"><label htmlFor="tr-fn">Nome da ficha</label><input id="tr-fn" className="tr-input" value={draft.name} placeholder="Ex.: Treino A, pernas" onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="tr-field"><label htmlFor="tr-fs">Descrição do foco</label><input id="tr-fs" className="tr-input" value={draft.subtitle || ''} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></div>
            <h3 style={{ margin: '18px 0 4px' }}>Exercícios</h3>
            {(draft.exercises || []).length === 0 && <p className="tr-sub">Nenhum exercício ainda. Adicione da biblioteca ou crie um personalizado.</p>}
            {(draft.exercises || []).map((e, i) => (
              <div className="tr-edit-ex" key={e.id}>
                <label>Exercício<input className="tr-input" value={e.name} onChange={(ev) => setEx(i, { name: ev.target.value })} /></label>
                <label>Séries<input className="tr-input" inputMode="numeric" value={e.sets} onChange={(ev) => setEx(i, { sets: ev.target.value })} /></label>
                <label>Repetições<input className="tr-input" inputMode="numeric" value={e.reps} onChange={(ev) => setEx(i, { reps: ev.target.value })} /></label>
                <label>Carga (kg)<input className="tr-input" inputMode="decimal" value={e.weightKg} onChange={(ev) => setEx(i, { weightKg: ev.target.value })} /></label>
                <label>Descanso (s)<input className="tr-input" inputMode="numeric" value={e.restSec} onChange={(ev) => setEx(i, { restSec: ev.target.value })} /></label>
                <label className="chk"><input type="checkbox" checked={e.showWeight !== false} onChange={(ev) => setEx(i, { showWeight: ev.target.checked })} />Exibir carga</label>
                <button type="button" className="tr-x" aria-label={`Tirar ${e.name || 'exercício'}`} onClick={() => setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, k) => k !== i) }))}><X size={16} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" className="rx-btn ghost tiny" onClick={() => saveDraft((w) => { setLibTarget(w.id); go('biblioteca'); })}><BookOpen size={15} />Adicionar da biblioteca</button>
              <button type="button" className="rx-btn ghost tiny" onClick={() => setDraft((d) => ({ ...d, exercises: [...(d.exercises || []), blankExercise()] }))}><Plus size={15} />Exercício personalizado</button>
            </div>
          </article>
          <aside className="tr-stack">
            <section className="tr-panel">
              <h2>Agenda</h2>
              <div className="tr-field" style={{ marginTop: 12 }}>
                <span className="lbl">Dias na agenda semanal</span>
                <div className="tr-chips">
                  {WEEK_ORDER.map((d) => (
                    <button key={d} type="button" className="tr-chip" aria-pressed={(draft.scheduledDays || []).includes(d)} onClick={() => setDraft((x) => ({ ...x, scheduledDays: (x.scheduledDays || []).includes(d) ? x.scheduledDays.filter((k) => k !== d) : [...(x.scheduledDays || []), d] }))}>{DAY_SHORT[d]}</button>
                  ))}
                </div>
              </div>
              <div className="tr-field"><label htmlFor="tr-ft">Horário sugerido na agenda</label><input id="tr-ft" type="time" className="tr-input" value={draft.scheduledTime || '18:30'} onChange={(e) => setDraft({ ...draft, scheduledTime: e.target.value })} /></div>
            </section>
            <section className="tr-panel">
              <h2>Estilo visual do card</h2>
              <div className="tr-swatches" style={{ marginTop: 12 }}>
                {WORKOUT_THEMES.map((t) => (
                  <button key={t.id} type="button" className="tr-swatch" style={{ '--acc': t.accent }} aria-pressed={(draft.theme || 'orange') === t.id} onClick={() => setDraft({ ...draft, theme: t.id })}><i />{t.label}</button>
                ))}
              </div>
            </section>
            {!isNew && <button type="button" className="tr-btn-danger" onClick={() => setConfirm({ type: 'delete', id: draft.id, name: draft.name })}><Trash2 size={15} />Excluir ficha</button>}
          </aside>
        </div>
      </>
    );
  } else if (view === 'biblioteca') {
    const q = libQuery.trim().toLowerCase();
    const items = EXERCISE_LIBRARY_CATALOG.filter((e) => (libGroup === 'all' || e.group === libGroup) && (!q || `${e.name} ${e.muscle}`.toLowerCase().includes(q)));
    body = (
      <>
        <div className="tr-head">
          <div><h1>Biblioteca de exercícios</h1><p>{EXERCISE_LIBRARY_CATALOG.length} exercícios prontos. Busque por nome ou músculo e coloque direto numa ficha.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('home')}>Voltar</button><button type="button" className="rx-btn" onClick={() => (own.length ? setCustom({ name: '', sets: 3, reps: 10, weightKg: 0, restSec: 60, target }) : toast('Crie uma ficha primeiro.'))}><Plus size={16} />Criar exercício personalizado</button></div>
        </div>
        <div className="tr-field" style={{ maxWidth: 520 }}><label htmlFor="tr-q">Buscar exercício ou músculo</label><input id="tr-q" className="tr-input" value={libQuery} placeholder="Ex.: glúteo, supino" autoComplete="off" onChange={(e) => setLibQuery(e.target.value)} /></div>
        <div className="tr-chips" style={{ marginBottom: 18 }}>
          {EXERCISE_LIBRARY_GROUPS.map((g) => <button key={g.id} type="button" className="tr-chip" aria-pressed={libGroup === g.id} onClick={() => setLibGroup(g.id)}>{g.label}</button>)}
        </div>
        {items.length ? (
          <div className="tr-lib">
            {items.map((e) => (
              <article className="tr-libcard" key={e.id}>
                <b>{e.name}</b>
                <div className="row"><span className="rx-pill">{e.muscle}</span><span className="rx-pill">{e.level}</span><span className="rx-pill">{e.sets} × {e.reps}{e.weightKg ? `, ${e.weightKg} kg` : ''}</span></div>
                <p>{e.desc}</p>
                {own.length ? (
                  <div className="go">
                    <select aria-label={`Ficha para ${e.name}`} value={target} onChange={(ev) => setLibTarget(ev.target.value)}>{own.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                    <button type="button" className="rx-btn tiny" onClick={() => addFromLibrary(e, target)}>Colocar na ficha</button>
                  </div>
                ) : <button type="button" className="rx-btn ghost tiny" onClick={() => openEditor()}>Criar uma ficha</button>}
              </article>
            ))}
          </div>
        ) : <div className="tr-empty"><h3>Nada encontrado</h3><p>Tente outro nome ou músculo, ou crie um exercício personalizado.</p></div>}
      </>
    );
  } else if (view === 'historico') {
    const sessions = history.sessions;
    const max = Math.max(1, ...progress.map((p) => Number(p.maxKg) || 0));
    body = (
      <>
        <div className="tr-head">
          <div><h1>Histórico de treinos</h1><p>Cada sessão fica salva com as séries que você fez. Sessão parada no meio aparece como incompleta.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('home')}>Voltar</button></div>
        </div>
        <div className="tr-grid">
          <article className="tr-panel">
            {history.error ? <p className="tr-sub">{history.error}</p> : sessions.length === 0 ? (
              <div className="tr-empty"><h3>Nenhuma sessão ainda</h3><p>Quando você terminar um treino, ele aparece aqui com o tempo e as séries feitas.</p></div>
            ) : (
              <table className="tr-table resp">
                <thead><tr><th>Quando</th><th>Ficha</th><th>Situação</th><th>Tempo</th><th>Séries</th></tr></thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="wide">{new Date(s.startedAt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td data-l="Ficha">{s.name}</td>
                      <td><span className={`rx-pill ${s.status === 'concluida' ? 'now' : ''}`}>{s.status === 'concluida' ? 'Concluída' : 'Incompleta'}</span></td>
                      <td className="tr-num" data-l="Tempo">{Math.round((s.elapsedMs || 0) / 60000)} min</td>
                      <td className="tr-num" data-l="Séries">{s.doneSets} de {s.plannedSets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>
          <aside className="tr-stack">
            <section className="tr-panel">
              <h2>Carga por semana</h2>
              <p className="tr-sub">Maior carga feita em cada semana, no mesmo exercício.</p>
              {history.exercises.length === 0 ? <p className="tr-sub" style={{ marginTop: 10 }}>Aparece depois do primeiro treino com carga registrada.</p> : (
                <>
                  <select className="tr-input" style={{ marginTop: 12, height: 42 }} aria-label="Exercício" value={progressKey} onChange={(e) => setProgressKey(e.target.value)}>
                    <option value="">Escolha um exercício</option>
                    {history.exercises.map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}
                  </select>
                  <div style={{ marginTop: 12 }}>
                    {progress.map((p, i) => (
                      <div className="tr-prog" key={p.week}><span>Semana {i + 1}</span><div className="rx-meter" style={{ maxWidth: 'none', height: 8 }}><div className="rx-fill zero" style={{ width: `${(Number(p.maxKg) / max) * 100}%` }} /></div><span>{fmtKg(p.maxKg)} kg</span></div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
      </>
    );
  } else {
    // home
    if (own.length === 0 && atribuidos.length === 0) {
      body = (
        <>
          <div className="tr-head"><div><h1>Treino</h1><p>Monte fichas com os exercícios da biblioteca e registre cada sessão.</p></div></div>
          <section className="tr-panel" style={{ maxWidth: 640 }}>
            <div className="tr-empty">
              <h3>Crie sua primeira ficha</h3>
              <p>Escolha os exercícios na biblioteca ({EXERCISE_LIBRARY_CATALOG.length} prontos) ou crie os seus. Você define séries, repetições, carga e descanso, e em quais dias ela aparece na agenda.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="rx-btn" onClick={() => openEditor()}><Plus size={16} />Criar primeira ficha</button>
                <button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('biblioteca')}><BookOpen size={16} />Ver a biblioteca</button>
              </div>
            </div>
          </section>
        </>
      );
    } else {
      const s = stats;
      body = (
        <>
          <div className="tr-head">
            <div><h1>Treino</h1><p>{s.next ? `Próximo: ${s.next.w.name}, ${s.next.when.toLowerCase().startsWith('hoje') ? s.next.when.toLowerCase() : s.next.when}.` : 'Nenhuma ficha com dia na agenda.'}</p></div>
            <div className="acts">
              <button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('biblioteca')}><BookOpen size={16} />Biblioteca ({EXERCISE_LIBRARY_CATALOG.length})</button>
              <button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('historico')}><History size={16} />Histórico</button>
              <button type="button" className="rx-btn" onClick={() => openEditor()}><Plus size={16} />Nova ficha</button>
            </div>
          </div>
          {open && (
            <div className="tr-banner" role="status">
              <Play size={18} /><span className="grow"><b>{open.name}</b> em andamento desde {new Date(open.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. As séries feitas estão salvas.</span>
              <button type="button" className="rx-btn tiny" onClick={resume}>Retomar treino</button>
            </div>
          )}
          <div className="rx-strip" style={{ marginTop: 0 }}>
            <div className="rx-seg"><h3><Calendar size={16} />Esta semana</h3><div className="v">{s.trainedThisWeek} <small>de {s.scheduledDays} dias agendados</small></div><div className="rx-ticks">{Array.from({ length: Math.max(1, s.scheduledDays) }, (_, i) => <i key={i} className={i < s.trainedThisWeek ? 'on' : ''} />)}</div></div>
            <div className="rx-seg"><h3><Play size={16} />Próximo</h3><div className="v" style={{ fontSize: 24 }}>{s.next ? s.next.w.name : '—'}</div><p>{s.next ? s.next.when : 'Defina dias na ficha.'}</p></div>
            <div className="rx-seg"><h3><Dumbbell size={16} />Sessões no mês</h3><div className="v">{history.loaded && !history.error ? s.month : '—'}</div><p>{s.monthIncomplete ? `${s.monthIncomplete} ficou incompleta.` : 'Concluídas e incompletas.'}</p></div>
            <div className="rx-seg"><h3><Clock size={16} />Tempo médio</h3><div className="v">{s.avg ?? '—'} {s.avg !== null && <small>min</small>}</div><p>Só sessões concluídas, sem pausas.</p></div>
          </div>
          <div className="tr-grid" style={{ marginTop: 28 }}>
            <section>
              <DoSeuPersonal atribuidos={atribuidos} onStart={startAssignment} onCopy={copyAssignment} onChanged={loadServer} toast={toast} starting={starting} />
              <h2 className="tr-section-title" style={{ marginTop: atribuidos.length ? 28 : 0 }}>Suas fichas</h2>
              {own.length === 0 && <p className="tr-sub" style={{ marginBottom: 12 }}>Você ainda não tem fichas próprias. Crie uma ou copie uma ficha do seu personal.</p>}
              <div className="tr-cards">
                {own.map((w) => (
                  <article className="tr-card" key={w.id} style={{ '--acc': accentOf(w) }}>
                    <h3><i className="dot" />{w.name}</h3>
                    {w.subtitle && <p>{w.subtitle}</p>}
                    <div className="meta"><span className="rx-pill">{(w.exercises || []).length} exercícios</span><span className="rx-pill">{daysText(w)}</span></div>
                    <ul className="tr-exlist">
                      {(w.exercises || []).slice(0, 3).map((e) => <li key={e.id}><span>{e.name}</span><span>{e.sets} × {e.reps}{e.showWeight !== false && Number(e.weightKg) > 0 ? `, ${fmtKg(e.weightKg)} kg` : ''}</span></li>)}
                      {(w.exercises || []).length > 3 && <li><span style={{ color: 'var(--rx-ink-3)' }}>e mais {(w.exercises || []).length - 3}</span><span /></li>}
                    </ul>
                    <div className="acts">
                      <button type="button" className="rx-btn tiny" disabled={starting} onClick={() => (open ? resume() : startWorkout(w))}><Play size={15} />{open && open.workoutRef === w.id ? 'Retomar treino' : 'Iniciar treino'}</button>
                      <button type="button" className="rx-btn ghost tiny" onClick={() => openEditor(w)}><Pencil size={15} />Editar</button>
                      <span className="grow" />
                      <button type="button" className="tr-x" title="Excluir ficha de treino" aria-label={`Excluir ${w.name}`} onClick={() => setConfirm({ type: 'delete', id: w.id, name: w.name })}><Trash2 size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <aside className="rx-rail">
              <section className="summary">
                <h2>Semana</h2>
                <div className="tr-week">
                  {s.week.map((d) => <div key={d.idx} className={`tr-day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}`}><b>{DAY_SHORT[d.idx]}</b><i /><small>{d.names[0] || 'livre'}</small></div>)}
                </div>
                <p className="rx-sub" style={{ marginTop: 10 }}>Marcado: dia com pelo menos uma série feita.</p>
              </section>
              <section>
                <h2>Últimas sessões <button type="button" className="rx-link" onClick={() => go('historico')}>Ver histórico</button></h2>
                {history.error ? <p className="rx-sub">{history.error}</p> : history.sessions.length === 0 ? <p className="rx-sub">Nenhuma sessão ainda. Comece por uma ficha.</p> : (
                  <ul className="rx-list">
                    {history.sessions.slice(0, 3).map((x) => (
                      <li key={x.id}><span className="ic violet"><CheckCircle2 size={16} /></span><div><b>{x.name}</b><p>{new Date(x.startedAt).toLocaleDateString('pt-BR', { weekday: 'long' })}, {Math.round((x.elapsedMs || 0) / 60000)} min, {x.doneSets} de {x.plannedSets} séries</p></div></li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        </>
      );
    }
  }

  return (
    <div className="tr">
      {body}
      {confirm?.type === 'delete' && (
        <div className="rx-overlay" onClick={() => setConfirm(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="tr-del-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="tr-del-t">Excluir “{confirm.name}”?</h2>
            <p>A ficha sai da lista e da agenda. As sessões já feitas continuam no histórico.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
              <button type="button" className="tr-btn-danger" onClick={() => deleteWorkout(confirm.id)}>Excluir ficha</button>
            </div>
          </div>
        </div>
      )}
      {custom && (
        <div className="rx-overlay" onClick={() => setCustom(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="tr-cus-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="tr-cus-t">Exercício personalizado</h2>
            <p>Ele entra na ficha escolhida, como os da biblioteca.</p>
            <div className="tr-field"><label htmlFor="tr-cn">Nome do exercício</label><input id="tr-cn" className="tr-input" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {[['sets', 'Séries'], ['reps', 'Repetições'], ['weightKg', 'Carga (kg)'], ['restSec', 'Descanso (s)']].map(([k, l]) => (
                <div className="tr-field" key={k}><label htmlFor={`tr-c-${k}`}>{l}</label><input id={`tr-c-${k}`} className="tr-input" inputMode="decimal" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} /></div>
              ))}
            </div>
            <div className="tr-field"><label htmlFor="tr-ct">Colocar na ficha</label><select id="tr-ct" className="tr-input" value={custom.target} onChange={(e) => setCustom({ ...custom, target: e.target.value })}>{own.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setCustom(null)}>Cancelar</button>
              <button type="button" className="rx-btn" onClick={() => {
                if (!custom.name.trim()) { toast('Dê um nome ao exercício.'); return; }
                const kg = Math.max(0, Number(String(custom.weightKg).replace(',', '.')) || 0);
                addFromLibrary({ name: custom.name.trim(), muscle: 'Personalizado', sets: Math.max(1, Number(custom.sets) || 1), reps: Math.max(0, Number(custom.reps) || 0), weightKg: kg, restSec: Math.max(0, Number(custom.restSec) || 0) }, custom.target);
                setCustom(null);
              }}>Adicionar exercício</button>
            </div>
          </div>
        </div>
      )}
      {view === 'home' && own.length > 0 && !history.loaded && <p className="tr-sub" style={{ marginTop: 16 }}><Info size={14} /> Carregando o histórico…</p>}
    </div>
  );
}
