import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, Dumbbell, Info, Pause, Play, RotateCcw } from 'lucide-react';
import { fmtClock, fmtKg, metricOf, treinoApi } from './treinoApi';
import { findExercise, loadBiblioteca } from './bibliotecaApi';
import { CorpoExercicio } from './MapaCorporal';
import { MUSCLES, normalizeSearch } from './musculos';

const SAVE_ERROR = 'Não foi possível salvar. Confira a conexão e tente de novo.';

const LEGACY_MUSCLE_MAP = {
  peitoral: { primary: ['peitoral'], secondary: ['triceps', 'deltoide_anterior'] },
  peito: { primary: ['peitoral'], secondary: ['triceps', 'deltoide_anterior'] },
  dorsais: { primary: ['dorsal', 'dorso_medio'], secondary: ['biceps', 'trapezio'] },
  costas: { primary: ['dorsal', 'dorso_medio'], secondary: ['biceps', 'lombar'] },
  'costas completas': { primary: ['dorsal', 'dorso_medio', 'lombar'], secondary: ['biceps', 'trapezio'] },
  quadriceps: { primary: ['quadriceps'], secondary: ['gluteos'] },
  pernas: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores', 'panturrilhas'] },
  'posterior e gluteos': { primary: ['posteriores', 'gluteos'], secondary: ['lombar'] },
  posteriores: { primary: ['posteriores'], secondary: ['gluteos'] },
  gluteos: { primary: ['gluteos'], secondary: ['posteriores', 'abdutores'] },
  panturrilhas: { primary: ['panturrilhas'], secondary: ['tibial'] },
  deltoides: { primary: ['deltoide_anterior', 'deltoide_lateral'], secondary: ['triceps', 'trapezio'] },
  'deltoide lateral': { primary: ['deltoide_lateral'], secondary: ['trapezio'] },
  ombros: { primary: ['deltoide_anterior', 'deltoide_lateral', 'deltoide_posterior'], secondary: ['trapezio'] },
  biceps: { primary: ['biceps'], secondary: ['antebraco'] },
  triceps: { primary: ['triceps'], secondary: ['peitoral', 'deltoide_anterior'] },
  abdomen: { primary: ['abdomen'], secondary: ['obliquos'] },
  core: { primary: ['abdomen', 'obliquos'], secondary: ['lombar'] }
};

export function resolveExerciseWithMuscles(ex, lib) {
  if (!ex) return { id: 'ex', name: '', primary: [], secondary: [] };
  if (Array.isArray(ex.primary) && ex.primary.length > 0) {
    return { ...ex, secondary: Array.isArray(ex.secondary) ? ex.secondary : [] };
  }
  const fromId = findExercise(lib, ex.libraryId || ex.id);
  if (fromId && fromId.primary?.length) return fromId;

  const all = [...(lib?.exercicios || []), ...(lib?.personalizados || [])];
  const normName = normalizeSearch(ex.name).trim();
  if (normName) {
    const exact = all.find((item) => normalizeSearch(item.name).trim() === normName || (item.aliases || []).some((a) => normalizeSearch(a).trim() === normName));
    if (exact && exact.primary?.length) return exact;
    const partial = all.find((item) => normalizeSearch(item.name).includes(normName) || normName.includes(normalizeSearch(item.name)));
    if (partial && partial.primary?.length) return partial;
  }

  const rawMuscle = normalizeSearch(ex.muscle || '').trim();
  if (rawMuscle && LEGACY_MUSCLE_MAP[rawMuscle]) {
    return { ...ex, ...LEGACY_MUSCLE_MAP[rawMuscle] };
  }
  for (const [k, v] of Object.entries(LEGACY_MUSCLE_MAP)) {
    if (rawMuscle.includes(k) || normName.includes(k)) {
      return { ...ex, ...v };
    }
  }
  if (/agachamento|leg press|extensora|afundo/i.test(ex.name || '')) {
    return { ...ex, primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] };
  }
  if (/supino|crucifixo|flexao/i.test(ex.name || '')) {
    return { ...ex, primary: ['peitoral'], secondary: ['triceps', 'deltoide_anterior'] };
  }
  if (/remada|puxada|barra fixa/i.test(ex.name || '')) {
    return { ...ex, primary: ['dorsal', 'dorso_medio'], secondary: ['biceps'] };
  }
  if (/terra|stiff|mesa flexora/i.test(ex.name || '')) {
    return { ...ex, primary: ['posteriores', 'gluteos'], secondary: ['lombar'] };
  }
  if (/desenvolvimento|elevacao lateral/i.test(ex.name || '')) {
    return { ...ex, primary: ['deltoide_anterior', 'deltoide_lateral'], secondary: ['triceps'] };
  }
  if (/rosca/i.test(ex.name || '')) {
    return { ...ex, primary: ['biceps'], secondary: ['antebraco'] };
  }
  if (/triceps|testa|corda/i.test(ex.name || '')) {
    return { ...ex, primary: ['triceps'], secondary: [] };
  }
  if (/prancha|abdominal/i.test(ex.name || '')) {
    return { ...ex, primary: ['abdomen', 'obliquos'], secondary: ['lombar'] };
  }
  return { ...ex, primary: [], secondary: [] };
}

/**
 * Treino ativo. A sessão vive no servidor: tempo calculado por início e pausas, séries salvas ao concluir.
 * Valores sugeridos (última execução ou ficha) aparecem em itálico e só contam quando a série é concluída.
 */
export function TreinoAtivo({ session, suggestions = {}, onChange, onFinished, onDiscarded, showToast }) {
  const exercises = useMemo(() => (Array.isArray(session?.content?.exercises) ? session.content.exercises : []), [session]);
  const doneOf = (key) => (session?.sets || []).filter((s) => s.exerciseKey === key).sort((a, b) => a.setNo - b.setNo);
  const firstPending = Math.max(0, exercises.findIndex((e) => doneOf(e.id).length < (Number(e.sets) || 1)));
  const [exIdx, setExIdx] = useState(firstPending);
  const [rest, setRest] = useState(null); // { endAt, total }
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'finalizar' | 'reiniciar'
  const [, setTick] = useState(0);
  const base = useRef({ elapsed: session?.elapsedMs || 0, at: Date.now() });
  const [typed, setTyped] = useState({});
  const [lib, setLib] = useState(null);

  useEffect(() => {
    loadBiblioteca().then(setLib, () => setLib({ exercicios: [], personalizados: [] }));
  }, []);

  useEffect(() => {
    base.current = { elapsed: session?.elapsedMs || 0, at: Date.now() };
  }, [session?.elapsedMs, session?.pausedAt]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  const paused = Boolean(session?.pausedAt);
  const elapsed = paused ? base.current.elapsed : base.current.elapsed + (Date.now() - base.current.at);
  const restLeft = rest ? rest.endAt - Date.now() : 0;
  useEffect(() => {
    if (rest && restLeft <= 0) setRest(null);
  });

  const ex = exercises[exIdx];
  const resolvedEx = useMemo(() => (ex ? resolveExerciseWithMuscles(ex, lib) : { primary: [], secondary: [] }), [ex, lib]);
  if (!ex) {
    return <div className="tr-panel"><p className="tr-sub">Esta ficha não tem exercícios.</p></div>;
  }
  const metric = metricOf(ex);
  const done = doneOf(ex.id);
  const total = Math.max(1, Number(ex.sets) || 1);
  const totalPlanned = exercises.reduce((a, e) => a + Math.max(1, Number(e.sets) || 1), 0);
  const totalDone = (session?.sets || []).length;
  const allExercisesDone = totalPlanned > 0 && totalDone >= totalPlanned;

  const primaryNames = (resolvedEx.primary || []).map((k) => MUSCLES[k]).filter(Boolean);
  const secondaryNames = (resolvedEx.secondary || []).map((k) => MUSCLES[k]).filter(Boolean);

  const prev = done[done.length - 1];
  const last = suggestions[ex.id];
  const sugKg = prev?.weightKg ?? last?.weightKg ?? (Number(ex.weightKg) || 0);
  const sugReps = prev?.reps ?? last?.reps ?? (Number(ex.reps) || 0);
  const sugSec = prev?.seconds ?? last?.seconds ?? (Number(ex.reps) || 30);
  const sugSource = prev ? 'série anterior' : last ? 'sua última execução' : 'ficha';
  const val = (k, fallback) => (typed[`${ex.id}:${k}`] !== undefined ? typed[`${ex.id}:${k}`] : String(fallback ?? ''));
  const isSug = (k) => typed[`${ex.id}:${k}`] === undefined;
  const type = (k) => (e) => setTyped((t) => ({ ...t, [`${ex.id}:${k}`]: e.target.value }));

  const run = async (fn) => {
    if (busy) return null;
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      showToast?.(e?.status === 409 ? e.message : SAVE_ERROR);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const completeSet = () => run(async () => {
    const numberOf = (v) => {
      const n = Number(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const body = { exerciseKey: ex.id, exerciseName: ex.name, setNo: done.length + 1, metric };
    if (metric === 'tempo') body.seconds = numberOf(val('sec', sugSec));
    else {
      body.reps = numberOf(val('reps', sugReps));
      if (metric === 'kg') body.weightKg = numberOf(val('kg', sugKg));
    }
    const r = await treinoApi.serie(session.id, body);
    onChange(r.session);
    setTyped((t) => {
      const n = { ...t };
      delete n[`${ex.id}:kg`];
      delete n[`${ex.id}:reps`];
      delete n[`${ex.id}:sec`];
      return n;
    });
    if (ex.showRestTimer !== false && Number(ex.restSec) > 0) setRest({ endAt: Date.now() + Number(ex.restSec) * 1000, total: Number(ex.restSec) * 1000 });
    if (done.length + 1 >= total && exIdx < exercises.length - 1) {
      setExIdx(exIdx + 1);
      showToast?.(`${ex.name} concluído. Próximo: ${exercises[exIdx + 1].name}.`);
    }
  });

  const undo = () => run(async () => {
    const r = await treinoApi.desfazer(session.id, { exerciseKey: ex.id, setNo: done.length });
    onChange(r.session);
    setRest(null);
  });

  const togglePause = () => run(async () => {
    const r = await treinoApi.pausa(session.id, !paused);
    onChange(r.session);
  });

  const finish = () => run(async () => {
    const r = await treinoApi.finalizar(session.id);
    setConfirm(null);
    onFinished(r.session);
  });

  const discard = () => run(async () => {
    await treinoApi.descartar(session.id);
    setConfirm(null);
    onDiscarded();
  });

  const planText = metric === 'tempo' ? `${ex.reps} s` : `${ex.reps} reps`;
  const C = 2 * Math.PI * 28;

  return (
    <div>
      {/* Card compacto e fixo do cronômetro "Em andamento" */}
      <div className="tr-bar tr-bar-compact" role="region" aria-label="Sessão em andamento">
        <div className="tr-bar-timer">
          <span className={`tr-live-dot ${paused ? 'paused' : ''}`} aria-hidden="true" />
          <div>
            <div className="lbl">{paused ? 'Pausado' : 'Em andamento'}</div>
            <div className="clock" data-testid="tr-clock">{fmtClock(elapsed)}</div>
          </div>
        </div>
        <div className="grow">
          <b>{session.name}</b>
          <div className="lbl"><span data-testid="tr-sets-done">{totalDone}</span> de {totalPlanned} séries</div>
        </div>
        <button type="button" className="rx-btn ghost tiny" onClick={togglePause} disabled={busy}>
          {paused ? <Play size={15} /> : <Pause size={15} />}
          {paused ? 'Continuar' : 'Pausar'}
        </button>
        {!allExercisesDone && (
          <button type="button" className="rx-btn tiny" onClick={() => setConfirm('finalizar')} disabled={busy}>
            Finalizar treino (+50 pts)
          </button>
        )}
      </div>

      {/* Card flutuante de tempo de descanso */}
      {rest && restLeft > 0 && (
        <aside className="tr-rest-float" role="timer" aria-live="polite" aria-label="Tempo de descanso" data-testid="tr-rest-floating">
          <svg className="tr-ring" viewBox="0 0 68 68" aria-hidden="true">
            <circle className="bg" cx="34" cy="34" r="28" />
            <circle className="fg" cx="34" cy="34" r="28" strokeDasharray={C} strokeDashoffset={C * (1 - restLeft / rest.total)} />
          </svg>
          <div className="tr-rest-body">
            <div className="tr-rest-lbl">Tempo de descanso</div>
            <div className="t">{fmtClock(restLeft)}</div>
            <div className="tr-rest-acts">
              <button type="button" className="rx-btn ghost tiny" onClick={() => setRest((r) => ({ endAt: r.endAt + 15000, total: r.total + 15000 }))}>+15 s</button>
              <button type="button" className="rx-btn tiny" onClick={() => setRest(null)}>Pular descanso</button>
            </div>
          </div>
        </aside>
      )}

      <div className="tr-grid">
        <div className="tr-stack">
          {/* Card em destaque para finalizar quando todos os exercícios foram concluídos */}
          {allExercisesDone && (
            <section className="tr-panel tr-finish-banner" data-testid="tr-all-done" aria-live="polite">
              <div className="tr-finish-info">
                <CheckCircle2 size={24} />
                <div>
                  <h3>Todos os exercícios concluídos!</h3>
                  <p className="tr-sub">Você completou todas as {totalPlanned} séries planejadas desta sessão.</p>
                </div>
              </div>
              <button type="button" className="rx-btn" onClick={finish} disabled={busy}>
                Finalizar treino (+50 pts)
              </button>
            </section>
          )}

          {/* Card do exercício atual com destaque visual */}
          <article className="tr-panel tr-ex-highlight" data-testid="tr-active-exercise-card">
            <div className="tr-ex-head">
              <span className="tr-ex-step">Exercício {exIdx + 1} de {exercises.length}</span>
              <span className="rx-pill">{metric === 'kg' ? 'Carga' : metric === 'tempo' ? 'Tempo' : 'Repetições'}</span>
            </div>
            <h2 className="tr-ex-title">{ex.name}</h2>
            <p className="tr-sub">{total} séries de {planText}{Number(ex.restSec) > 0 ? `, descanso de ${ex.restSec} s` : ''}.</p>
            <p className="tr-sub" id="tr-sug-note" style={{ marginTop: 6 }}>Valores em itálico vêm da {sugSource}. Só contam quando você conclui a série.</p>
            <div className="tr-sets">
              {Array.from({ length: total }, (_, i) => {
                const d = done[i];
                if (d) {
                  return (
                    <div className="tr-set done" key={i}>
                      <span className="n">{i + 1}</span>
                      <div className="plan"><b>Feita</b>Planejado {planText}</div>
                      <div className="tr-in"><span>{metric === 'tempo' ? 'Segundos' : metric === 'kg' ? 'Carga' : 'Repetições'}</span><span className="val">{metric === 'tempo' ? `${d.seconds} s` : metric === 'kg' ? `${fmtKg(d.weightKg)} kg` : d.reps}</span></div>
                      <div className="tr-in"><span>{metric === 'kg' ? 'Repetições' : ''}</span><span className="val">{metric === 'kg' ? d.reps : ''}</span></div>
                      {i === done.length - 1 ? <button type="button" className="tr-undo" onClick={undo} disabled={busy} aria-label={`Desfazer série ${i + 1}`}>Desfazer</button> : <span />}
                    </div>
                  );
                }
                if (i === done.length) {
                  return (
                    <div className="tr-set cur" key={i}>
                      <span className="n">{i + 1}</span>
                      <div className="plan"><b>Agora</b>Planejado {planText}</div>
                      {metric === 'tempo' && <label className="tr-in"><span>Segundos</span><input inputMode="numeric" className={isSug('sec') ? 'sug' : ''} value={val('sec', sugSec)} onChange={type('sec')} aria-describedby="tr-sug-note" /></label>}
                      {metric === 'kg' && <label className="tr-in"><span>Carga (kg)</span><input inputMode="decimal" className={isSug('kg') ? 'sug' : ''} value={val('kg', fmtKg(sugKg))} onChange={type('kg')} aria-describedby="tr-sug-note" /></label>}
                      {metric !== 'tempo' && <label className="tr-in"><span>Repetições</span><input inputMode="numeric" className={isSug('reps') ? 'sug' : ''} value={val('reps', sugReps)} onChange={type('reps')} aria-describedby="tr-sug-note" /></label>}
                      {metric !== 'kg' && <span />}
                      {metric === 'tempo' && <span />}
                      <button type="button" className="rx-check" onClick={completeSet} disabled={busy} aria-label={`Concluir série ${i + 1}`}><Check /></button>
                    </div>
                  );
                }
                return (
                  <div className="tr-set" key={i}>
                    <span className="n">{i + 1}</span>
                    <div className="plan"><b>Depois</b>Planejado {planText}</div>
                    <span /><span /><span />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setExIdx(Math.max(0, exIdx - 1))} disabled={exIdx === 0}>Exercício anterior</button>
              <button type="button" className="rx-btn ghost" onClick={() => setExIdx(Math.min(exercises.length - 1, exIdx + 1))} disabled={exIdx === exercises.length - 1}>Próximo exercício</button>
            </div>
          </article>
        </div>

        <aside className="tr-stack">
          {/* Card com o músculo trabalhado */}
          <section className="tr-panel tr-muscle-card" data-testid="tr-musculo-card">
            <h2><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Dumbbell size={16} />Músculo trabalhado</span></h2>
            <p className="tr-sub">Ênfase muscular de <b>{ex.name}</b></p>
            <div style={{ marginTop: 10 }}>
              <CorpoExercicio exercise={resolvedEx} />
            </div>
            <div className="tr-muscle-tags">
              <p className="bl-ms">
                <span className="bl-tag p">Principal</span>
                {primaryNames.length ? primaryNames.join(', ') : (ex.muscle || 'Corpo todo / Geral')}
              </p>
              {secondaryNames.length > 0 && (
                <p className="bl-ms">
                  <span className="bl-tag">Secundário</span>
                  {secondaryNames.join(', ')}
                </p>
              )}
            </div>
          </section>

          <section className="tr-panel">
            <h2>Exercícios</h2>
            <ul className="tr-exnav">
              {exercises.map((x, i) => {
                const n = doneOf(x.id).length;
                const t = Math.max(1, Number(x.sets) || 1);
                return (
                  <li key={x.id} className={n >= t ? 'ok' : ''}>
                    <button type="button" aria-current={i === exIdx ? 'true' : undefined} onClick={() => setExIdx(i)}><span>{x.name}</span><small>{n} de {t}</small></button>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="tr-note"><Info size={16} /><span>O treino fica salvo: pode trocar de aba ou fechar o app e voltar depois. Mudanças feitas aqui valem só para esta sessão.</span></section>
          <button type="button" className="tr-btn-danger" onClick={() => setConfirm('reiniciar')}><RotateCcw size={15} />Reiniciar sessão</button>
        </aside>
      </div>

      {confirm && (
        <div className="rx-overlay" onClick={() => setConfirm(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            {confirm === 'finalizar' ? (
              <>
                <h2>Finalizar o treino?</h2>
                <p>{totalDone} de {totalPlanned} séries feitas. {totalDone < totalPlanned ? 'A sessão fica como incompleta e guarda só o que você fez.' : 'Todas as séries foram feitas.'}</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" className="rx-btn ghost" onClick={() => setConfirm(null)}>Continuar treinando</button>
                  <button type="button" className="rx-btn" onClick={finish} disabled={busy}>Finalizar agora</button>
                </div>
              </>
            ) : (
              <>
                <h2>Reiniciar a sessão?</h2>
                <p>As séries desta sessão são descartadas e o tempo volta a zero. Sessões já encerradas continuam no histórico.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" className="rx-btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
                  <button type="button" className="tr-btn-danger" onClick={discard} disabled={busy}>Reiniciar sessão</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Resumo da sessão encerrada. */
export function TreinoResumo({ session, onBack }) {
  const exercises = Array.isArray(session?.content?.exercises) ? session.content.exercises : [];
  const sets = session?.sets || [];
  const full = session?.status === 'concluida';
  return (
    <div>
      <div className="tr-head">
        <div><h1>{full ? 'Treino concluído' : 'Treino registrado como incompleto'}</h1><p>{full ? 'Todas as séries foram feitas. Você ganhou 50 pontos.' : 'Ficou registrado só o que você fez. Nenhuma série foi inventada. Você ganhou 50 pontos.'}</p></div>
        <div className="acts"><button type="button" className="rx-btn" onClick={onBack}>Voltar ao Treino</button></div>
      </div>
      <article className="tr-panel">
        <dl className="tr-kv">
          <div><dt>Tempo</dt><dd>{Math.round((session?.elapsedMs || 0) / 60000)} <small>min</small></dd></div>
          <div><dt>Séries</dt><dd>{sets.length} <small>de {session?.plannedSets || 0}</small></dd></div>
          <div><dt>Situação</dt><dd style={{ fontSize: 18, marginTop: 6 }}>{full ? 'Concluída' : 'Incompleta'}</dd></div>
        </dl>
        <table className="tr-table resp" style={{ marginTop: 18 }}>
          <thead><tr><th>Exercício</th><th>Planejado</th><th>Realizado</th><th>Volume</th></tr></thead>
          <tbody>
            {exercises.map((e) => {
              const d = sets.filter((s) => s.exerciseKey === e.id).sort((x, y) => x.setNo - y.setNo);
              const m = metricOf(e);
              const planned = Math.max(1, Number(e.sets) || 1);
              const plano = m === 'tempo' ? `${planned} × ${e.reps} s` : m === 'kg' ? `${planned} × ${e.reps}, ${fmtKg(e.weightKg)} kg` : `${planned} × ${e.reps}`;
              const feito = d.map((s) => (m === 'tempo' ? `${s.seconds} s` : m === 'kg' ? `${fmtKg(s.weightKg)} kg × ${s.reps}` : `${s.reps}`)).join(', ');
              const vol = m === 'tempo' ? `${d.reduce((a, s) => a + (s.seconds || 0), 0)} s` : m === 'kg' ? `${fmtKg(d.reduce((a, s) => a + (s.weightKg || 0) * (s.reps || 0), 0))} kg` : `${d.reduce((a, s) => a + (s.reps || 0), 0)} reps`;
              return (
                <tr key={e.id}>
                  <td className="wide">{e.name}</td>
                  <td className="tr-num" data-l="Planejado">{plano}</td>
                  <td className="tr-num" data-l="Realizado" style={{ color: d.length < planned ? 'var(--rx-amber)' : undefined }}>{d.length ? `${d.length} de ${planned}: ${feito}` : 'não feito'}</td>
                  <td className="tr-num" data-l="Volume">{d.length ? vol : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </div>
  );
}
