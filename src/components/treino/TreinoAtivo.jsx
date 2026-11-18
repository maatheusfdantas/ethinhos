import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, Pause, Play, RotateCcw } from 'lucide-react';
import { fmtClock, fmtKg, metricOf, treinoApi } from './treinoApi';

const SAVE_ERROR = 'Não foi possível salvar. Confira a conexão e tente de novo.';

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
  if (!ex) {
    return <div className="tr-panel"><p className="tr-sub">Esta ficha não tem exercícios.</p></div>;
  }
  const metric = metricOf(ex);
  const done = doneOf(ex.id);
  const total = Math.max(1, Number(ex.sets) || 1);
  const totalPlanned = exercises.reduce((a, e) => a + Math.max(1, Number(e.sets) || 1), 0);
  const totalDone = (session?.sets || []).length;

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
  const C = 2 * Math.PI * 38;

  return (
    <div>
      <div className="tr-bar" role="region" aria-label="Sessão em andamento">
        <div><div className="lbl">{paused ? 'Pausado' : 'Em andamento'}</div><div className="clock" data-testid="tr-clock">{fmtClock(elapsed)}</div></div>
        <div className="grow"><b>{session.name}</b><div className="lbl"><span data-testid="tr-sets-done">{totalDone}</span> de {totalPlanned} séries. Pausas não contam no tempo.</div></div>
        <button type="button" className="rx-btn ghost" onClick={togglePause} disabled={busy}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Continuar' : 'Pausar'}</button>
        <button type="button" className="rx-btn" onClick={() => setConfirm('finalizar')} disabled={busy}>Finalizar treino (+50 pts)</button>
      </div>

      <div className="tr-grid">
        <div className="tr-stack">
          {rest && restLeft > 0 && (
            <section className="tr-panel" aria-live="polite">
              <div className="tr-rest">
                <svg className="tr-ring" viewBox="0 0 88 88" aria-hidden="true"><circle className="bg" cx="44" cy="44" r="38" /><circle className="fg" cx="44" cy="44" r="38" strokeDasharray={C} strokeDashoffset={C * (1 - restLeft / rest.total)} /></svg>
                <div>
                  <div className="tr-sub" style={{ margin: '0 0 4px' }}>Descanso</div>
                  <div className="t">{fmtClock(restLeft)}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <button type="button" className="rx-btn ghost tiny" onClick={() => setRest((r) => ({ endAt: r.endAt + 15000, total: r.total + 15000 }))}>+15 s</button>
                    <button type="button" className="rx-btn ghost tiny" onClick={() => setRest(null)}>Pular descanso</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          <article className="tr-panel">
            <h2 style={{ fontSize: 24 }}>{ex.name} <span className="rx-pill">{metric === 'kg' ? 'Carga' : metric === 'tempo' ? 'Tempo' : 'Repetições'}</span></h2>
            <p className="tr-sub">{total} séries de {planText}{Number(ex.restSec) > 0 ? `, descanso de ${ex.restSec} s` : ''}.</p>
            <p className="tr-sub" id="tr-sug-note" style={{ marginTop: 8 }}>Valores em itálico vêm da {sugSource}. Só contam quando você conclui a série.</p>
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
          <thead><tr><th>Exercício</th><th>Séries</th><th>Volume (carga × reps)</th></tr></thead>
          <tbody>
            {exercises.map((e) => {
              const d = sets.filter((s) => s.exerciseKey === e.id);
              const m = metricOf(e);
              const vol = m === 'tempo' ? `${d.reduce((a, s) => a + (s.seconds || 0), 0)} s` : m === 'kg' ? `${fmtKg(d.reduce((a, s) => a + (s.weightKg || 0) * (s.reps || 0), 0))} kg` : `${d.reduce((a, s) => a + (s.reps || 0), 0)} reps`;
              return <tr key={e.id}><td className="wide">{e.name}</td><td className="tr-num" data-l="Séries">{d.length} de {Math.max(1, Number(e.sets) || 1)}</td><td className="tr-num" data-l="Volume">{d.length ? vol : '—'}</td></tr>;
            })}
          </tbody>
        </table>
        <p className="tr-sub" style={{ marginTop: 12 }}>Cada medida fica separada: carga, repetições e tempo não se misturam.</p>
      </article>
    </div>
  );
}
