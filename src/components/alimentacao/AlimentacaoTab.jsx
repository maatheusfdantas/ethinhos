import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Plus, Utensils, X } from 'lucide-react';
import { alimentacaoApi, fmtDia } from './alimentacaoApi';
import { DiaRefeicoes, OpcoesRefeicao, RegistroDialog } from './DiaRefeicoes';
import { addDays, LAYOUTS, LOG_STATUS, localISO, mondayOf, STATUS_KEYS } from './planoModel';
import '../../styles/espacos.css';
import '../../styles/alimentacao.css';

/** Contagens da relação com o plano: alternativa autorizada aparece junto com "conforme", nunca como erro. */
export function Contagens({ counts = {} }) {
  return (
    <div className="es-counts">
      {STATUS_KEYS.map((k) => <span key={k} className={`es-count ${LOG_STATUS[k].inPlan ? 'in' : ''}`}><b>{Number(counts[k] || 0)}</b>{LOG_STATUS[k].label.toLowerCase()}</span>)}
    </div>
  );
}

/** Conteúdo completo de uma versão (só leitura): grupos de dias, refeições, opções e substituições. */
export function VersaoConteudo({ content }) {
  const groups = LAYOUTS[content?.layout] || LAYOUTS.todos;
  return (
    <div>
      {groups.map((g) => {
        const meals = (content?.days || []).find((d) => d.key === g.key)?.meals || [];
        return (
          <section key={g.key} style={{ marginTop: 12 }}>
            {groups.length > 1 && <h3 style={{ margin: '0 0 6px', fontSize: 15.5 }}>{g.label}</h3>}
            {meals.map((m) => <div key={m.key} style={{ marginBottom: 12 }}><b>{m.time ? `${m.time}, ` : ''}{m.name}</b><OpcoesRefeicao meal={m} /></div>)}
          </section>
        );
      })}
      {content?.notes && <div className="es-note al-note" style={{ marginTop: 8 }}><span>{content.notes}</span></div>}
    </div>
  );
}

/**
 * Alimentação da pessoa (prévia 04): Dia, Semana e Histórico do plano publicado pela nutricionista.
 * A aba só aparece quando existe plano publicado. Plano encerrado (ou vínculo encerrado) fica só para leitura.
 * Registro do dia = refeições previstas com registro ÷ previstas; extras não entram na conta.
 */
export function AlimentacaoTab({ showToast }) {
  const toast = (m) => showToast?.(m);
  const [planos, setPlanos] = useState(null);
  const [planId, setPlanId] = useState('');
  const [tab, setTab] = useState('Dia');
  const [date, setDate] = useState(localISO());
  const [dia, setDia] = useState(null);
  const [from, setFrom] = useState(mondayOf(localISO()));
  const [semana, setSemana] = useState(null);
  const [reg, setReg] = useState(null);
  const [extra, setExtra] = useState(null);
  const [versao, setVersao] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const today = localISO();

  useEffect(() => {
    alimentacaoApi.planos().then((r) => {
      setPlanos(r.planos || []);
      const first = (r.planos || []).find((p) => p.ativo) || (r.planos || [])[0];
      if (first) setPlanId(first.id);
    }, (e) => { setPlanos([]); setErro(e.message); });
  }, []);

  const loadDia = useCallback(async () => {
    if (!planId) return;
    try { setDia(await alimentacaoApi.dia(planId, date)); setErro(''); } catch (e) { setErro(e.message); }
  }, [planId, date]);
  const loadSemana = useCallback(async () => {
    if (!planId) return;
    try { setSemana(await alimentacaoApi.semana(planId, from)); } catch (e) { setErro(e.message); }
  }, [planId, from]);
  useEffect(() => { if (tab === 'Dia') loadDia(); }, [tab, loadDia]);
  useEffect(() => { if (tab === 'Semana') loadSemana(); }, [tab, loadSemana]);

  if (planos === null) return <div className="es"><p className="es-sub">Carregando sua alimentação…</p></div>;
  if (planos.length === 0) {
    return (
      <div className="es">
        <div className="es-head"><div><h1>Alimentação</h1><p>Esta aba mostra o plano que a sua nutricionista publicar para você.</p></div></div>
        <section className="es-card" style={{ maxWidth: 640 }}><div className="es-empty"><h3>Nenhum plano publicado</h3><p>{erro || 'Quando houver um plano publicado, ele aparece aqui com as refeições do dia.'}</p></div></section>
      </div>
    );
  }
  const plano = planos.find((p) => p.id === planId) || planos[0];

  const salvar = async (body) => {
    setBusy(true);
    try {
      await alimentacaoApi.registrar({ planId: plano.id, date, mealKey: reg.meal.key, ...body });
      toast('Registro salvo.');
      setReg(null);
      await loadDia();
    } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const apagar = async (mealKey, msg = 'Registro apagado.') => {
    setBusy(true);
    try { await alimentacaoApi.apagar({ planId: plano.id, date, mealKey }); toast(msg); setReg(null); await loadDia(); } catch (e) { toast(e.message); } finally { setBusy(false); }
  };

  const n = dia?.numeros || { previstas: 0, registradas: 0, counts: {} };
  const pct = n.previstas ? (n.registradas / n.previstas) * 100 : 0;

  let body = null;
  if (tab === 'Dia') {
    body = !dia ? <p className="es-sub">Carregando…</p> : (
      <div className="es-grid">
        <div>
          <div className="al-plans" role="group" aria-label="Dia">
            <button type="button" className="rx-btn ghost tiny" aria-label="Dia anterior" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={15} /></button>
            <span className="rx-pill" style={{ alignSelf: 'center' }}>{date === today ? `Hoje, ${fmtDia(date, { weekday: false })}` : fmtDia(date)}</span>
            <button type="button" className="rx-btn ghost tiny" aria-label="Próximo dia" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={15} /></button>
            {date !== today && <button type="button" className="rx-btn ghost tiny" onClick={() => setDate(today)}>Hoje</button>}
          </div>
          {dia.versao ? (
            <>
              <div className="rx-meter-row" style={{ marginTop: 0 }}>
                <span data-testid="al-registro-dia">Registro do dia: {n.registradas} de {n.previstas} {n.previstas === 1 ? 'refeição' : 'refeições'}</span>
                <div className="rx-meter" role="progressbar" aria-valuemin={0} aria-valuemax={n.previstas} aria-valuenow={n.registradas} aria-label="Refeições previstas com registro"><div className={`rx-fill ${n.registradas ? '' : 'zero'}`} style={{ width: `${pct}%` }} /></div>
              </div>
              {dia.grupo && dia.grupo.key !== 'todos' && <p className="es-sub" style={{ marginTop: 8 }}>Cardápio de {dia.grupo.label.toLowerCase()}.</p>}
              <DiaRefeicoes meals={dia.refeicoes} registros={dia.registros} isToday={date === today} podeRegistrar={dia.podeRegistrar} onRegistrar={(meal) => setReg({ meal, log: dia.registros[meal.key] || null })} />
              {!dia.podeRegistrar && dia.motivo && <div className="es-note" style={{ marginTop: 12 }}><Lock size={15} /><span>{dia.motivo}</span></div>}
              <div className="rx-loose">
                <h2>Refeições extras <small>Não entram na conta das previstas</small></h2>
                {dia.extras.map((x) => (
                  <div className="es-row" key={x.key}><div className="grow"><b>{x.note}</b><small>Registrada {new Date(x.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></div>
                    {dia.podeRegistrar && <button type="button" className="es-x" aria-label={`Apagar ${x.note}`} onClick={() => apagar(x.key, 'Refeição extra apagada.')}><X size={15} /></button>}</div>
                ))}
                {dia.podeRegistrar && <button type="button" className="rx-btn ghost tiny" style={{ marginTop: 8 }} onClick={() => setExtra('')}><Plus size={14} />Registrar refeição extra</button>}
              </div>
            </>
          ) : <div className="es-empty"><p>{dia.motivo || 'Nenhuma versão do plano vale neste dia.'}</p></div>}
        </div>
        <aside className="rx-rail">
          <section className="summary"><h2>Relação com o plano</h2>
            <p className="rx-sub">Contagens do dia. Não é nota: serve para você e {plano.proName || 'a nutricionista'} conversarem.</p>
            <Contagens counts={n.counts} />
          </section>
          <section><h2>{plano.status === 'encerrado' ? 'Plano encerrado' : 'Plano vigente'}</h2>
            <ul className="rx-list"><li><span className="ic"><Utensils size={16} /></span><div><b>{dia.versao?.name || plano.name}</b>
              <p>{plano.proName || 'Profissional'}{dia.versao ? `, versão ${dia.versao.version}, desde ${fmtDia(dia.versao.startsOn, { weekday: false })}` : ''}.</p>
              {plano.proxima && <p>A versão {plano.proxima.version} começa em {fmtDia(plano.proxima.startsOn, { weekday: false })}.</p>}
              {plano.endsOn && <p>Termina em {fmtDia(plano.endsOn, { weekday: false })}.</p>}
            </div><span /></li></ul>
          </section>
          {dia.versao?.notes && <section><h2>Orientações</h2><p className="rx-sub al-note">{dia.versao.notes}</p></section>}
        </aside>
      </div>
    );
  } else if (tab === 'Semana') {
    body = !semana ? <p className="es-sub">Carregando…</p> : (
      <>
        <div className="al-plans" role="group" aria-label="Semana">
          <button type="button" className="rx-btn ghost tiny" aria-label="Semana anterior" onClick={() => setFrom(addDays(from, -7))}><ChevronLeft size={15} /></button>
          <span className="rx-pill" style={{ alignSelf: 'center' }}>{fmtDia(from, { weekday: false })} a {fmtDia(addDays(from, 6), { weekday: false })}</span>
          <button type="button" className="rx-btn ghost tiny" aria-label="Próxima semana" onClick={() => setFrom(addDays(from, 7))}><ChevronRight size={15} /></button>
        </div>
        <div className="al-week">
          {semana.days.map((d) => (
            <div key={d.date} className={`al-day ${d.date === today ? 'today' : ''}`}>
              <b>{fmtDia(d.date).split(',')[0]}</b><small>{fmtDia(d.date, { weekday: false })}</small>
              <div className="v">{d.futuro || !d.previstas ? '—' : <>{d.registradas}<small> de {d.previstas}</small></>}</div>
              {d.futuro ? <small>ainda não chegou</small> : d.previstas ? <div className="rx-ticks">{Array.from({ length: d.previstas }, (_, i) => <i key={i} className={i < d.registradas ? 'on' : ''} />)}</div> : <small>sem plano</small>}
              {d.extras > 0 && <small>+{d.extras} extra{d.extras > 1 ? 's' : ''}</small>}
            </div>
          ))}
        </div>
        <p className="rx-sub" style={{ marginTop: 14 }}>Cada barrinha é uma refeição prevista com registro. Na semana: {semana.total.registradas} de {semana.total.previstas} até hoje.</p>
        <Contagens counts={semana.total.counts} />
      </>
    );
  } else {
    body = (
      <article className="es-card">
        <h2>Versões e planos</h2>
        {planos.flatMap((p) => p.versoes.map((v) => ({ p, v }))).sort((a, b) => b.v.startsOn.localeCompare(a.v.startsOn)).map(({ p, v }) => {
          const vigente = p.vigente?.version === v.version && p.id === plano.id && p.status !== 'encerrado';
          const futura = v.startsOn > today;
          return (
            <div className="es-row" key={`${p.id}-${v.version}`}>
              <div className="grow"><b>{v.name}</b><small>Versão {v.version}, {futura ? 'começa' : 'desde'} {fmtDia(v.startsOn, { weekday: false })}. {p.proName || 'Profissional'}. {p.status === 'encerrado' ? 'Plano encerrado, só leitura.' : vigente ? 'Vigente.' : futura ? 'Ainda não começou.' : 'Substituída por uma versão mais nova.'}</small></div>
              <button type="button" className="rx-btn ghost tiny" onClick={async () => { try { setVersao(await alimentacaoApi.versao(p.id, v.version)); } catch (e) { toast(e.message); } }}>Ver</button>
            </div>
          );
        })}
        <p className="rx-sub">Se o vínculo com a nutricionista acabar, você continua vendo seus planos e registros aqui. Eles não aparecem como vigentes.</p>
      </article>
    );
  }

  return (
    <div className="es">
      <div className="es-head">
        <div><h1>Alimentação</h1><p>Plano de <b>{plano.proName || 'sua nutricionista'}</b>{plano.spaceName ? ` (${plano.spaceName})` : ''}. {plano.status === 'encerrado' ? 'Este plano foi encerrado e fica só para leitura.' : 'Esta aba aparece porque existe um plano publicado para você.'}</p></div>
        <div className="acts"><div className="es-tabs-row" role="group" aria-label="Período" style={{ marginBottom: 0 }}>{['Dia', 'Semana', 'Histórico'].map((t) => <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div></div>
      </div>
      {planos.length > 1 && (
        <div className="es-chips" role="group" aria-label="Plano" style={{ marginBottom: 16 }}>
          {planos.map((p) => <button key={p.id} type="button" className="es-chip" aria-pressed={p.id === plano.id} onClick={() => { setPlanId(p.id); setDia(null); setSemana(null); }}>{p.name}{p.status === 'encerrado' ? ' (encerrado)' : ''}</button>)}
        </div>
      )}
      {erro && <div className="es-error" style={{ marginBottom: 12 }}>{erro}</div>}
      {body}

      {reg && <RegistroDialog meal={reg.meal} log={reg.log} proName={plano.proName} busy={busy} onClose={() => setReg(null)} onSave={salvar} onDelete={() => apagar(reg.meal.key)} />}
      {extra !== null && (
        <div className="rx-overlay" onClick={() => setExtra(null)}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="al-ex-t" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try { await alimentacaoApi.extra({ planId: plano.id, date, note: extra }); toast('Refeição extra registrada. Ela não muda o registro do dia.'); setExtra(null); await loadDia(); } catch (err) { toast(err.message); } finally { setBusy(false); }
          }}>
            <h2 id="al-ex-t">Refeição extra</h2>
            <p>Algo que você comeu fora das refeições previstas. Não entra na conta do dia.</p>
            <div className="es-field"><label htmlFor="al-ex">O que foi</label><input id="al-ex" className="es-input" maxLength={140} placeholder="Ex.: pipoca no cinema" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="rx-btn ghost" onClick={() => setExtra(null)}>Cancelar</button><button type="submit" className="rx-btn" disabled={busy || !extra.trim()}>Registrar</button></div>
          </form>
        </div>
      )}
      {versao && (
        <div className="rx-overlay" onClick={() => setVersao(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="al-v-t" style={{ maxWidth: 680, maxHeight: '86vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 id="al-v-t">{versao.versao.name}, versão {versao.versao.version}</h2>
            <p>{versao.plano.proName || 'Profissional'}. {versao.versao.startsOn > today ? 'Começa' : 'Desde'} {fmtDia(versao.versao.startsOn, { weekday: false })}. Só leitura.</p>
            <VersaoConteudo content={versao.versao.content} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><button type="button" className="rx-btn ghost" onClick={() => setVersao(null)}>Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
