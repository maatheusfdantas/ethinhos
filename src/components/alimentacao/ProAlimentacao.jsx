import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Plus, Utensils } from 'lucide-react';
import { alimentacaoApi, fmtDia } from './alimentacaoApi';
import { PlanoEditor } from './PlanoEditor';
import { DiaRefeicoes } from './DiaRefeicoes';
import { Contagens } from './AlimentacaoTab';
import { addDays, contentSummary, groupFor, LAYOUTS, LOG_STATUS, localISO, mondayOf, starterContent } from './planoModel';
import { initialsOf } from '../espacos/espacosApi';
import '../../styles/espacos.css';
import '../../styles/alimentacao.css';

const firstName = (n) => String(n || '').split(' ')[0];

function Confirm({ title, text, button, danger, busy, onCancel, onOk }) {
  return (
    <div className="rx-overlay" onClick={onCancel}>
      <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="pa-c-t" onClick={(e) => e.stopPropagation()}>
        <h2 id="pa-c-t">{title}</h2><p>{text}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="rx-btn ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className={danger ? 'es-danger' : 'rx-btn'} disabled={busy} onClick={onOk}>{button}</button>
        </div>
      </div>
    </div>
  );
}

/** Como o paciente vai ver a partir da data de início: a tela do dia, sem registrar. */
function PreviaPaciente({ content, startsOn, pessoa, onClose }) {
  const groups = LAYOUTS[content?.layout] || LAYOUTS.todos;
  const [gk, setGk] = useState(groupFor(content, startsOn)?.key || groups[0].key);
  const meals = (content?.days || []).find((d) => d.key === gk)?.meals || [];
  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="pa-pv-t" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h2 id="pa-pv-t">Como {firstName(pessoa)} vai ver a partir de {fmtDia(startsOn, { weekday: false })}</h2>
        <p>Prévia da tela Alimentação do paciente, com o rascunho atual. Nada é publicado aqui.</p>
        {groups.length > 1 && <div className="es-tabs-row" role="group" aria-label="Grupo de dias">{groups.map((g) => <button key={g.key} type="button" aria-pressed={g.key === gk} onClick={() => setGk(g.key)}>{g.label}</button>)}</div>}
        <div className="ne-phone" data-testid="pa-previa">
          <b style={{ fontSize: 18 }}>Registro do dia: 0 de {meals.length} refeições</b>
          <DiaRefeicoes meals={meals} preview />
          {content?.notes && <p className="es-sub al-note" style={{ marginTop: 10 }}>{content.notes}</p>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}><button type="button" className="rx-btn ghost" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}

/**
 * Área individual, aba "Plano" (Nutricionista): rascunho no editor estruturado, prévia como o paciente vê,
 * publicação com data de início (a versão anterior vale até lá), versões e encerramento.
 */
export function ProPlano({ linkId, pessoa, toast }) {
  const [data, setData] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [novo, setNovo] = useState({ name: '', modeloId: '' });
  const [draft, setDraft] = useState(null);
  const [name, setName] = useState('');
  const [dirty, setDirty] = useState(false);
  const [startsOn, setStartsOn] = useState(localISO());
  const [endsOn, setEndsOn] = useState('');
  const [previa, setPrevia] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await alimentacaoApi.planoPessoa(linkId);
      setData(r);
      setErro('');
      if (r.plano) {
        setDraft(r.plano.draft?.days ? r.plano.draft : starterContent());
        setName(r.plano.name);
        setDirty(false);
        const last = r.plano.versoes.reduce((m, v) => (v.startsOn > m ? v.startsOn : m), '');
        setStartsOn(last && last > localISO() ? addDays(last, 1) : localISO());
        setEndsOn(r.plano.endsOn || '');
      }
    } catch (e) { setErro(e.message); }
  }, [linkId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { alimentacaoApi.modelos().then((r) => setModelos(r.modelos || []), () => setModelos([])); }, []);

  const run = async (fn, ok) => {
    if (busy) return null;
    setBusy(true);
    try { const r = await fn(); if (ok) toast?.(ok); return r ?? true; } catch (e) { toast?.(e.message); return null; } finally { setBusy(false); }
  };

  if (erro) return <div className="es-error">{erro}</div>;
  if (!data) return <p className="es-sub">Carregando o plano…</p>;
  const nome = pessoa?.name || data.pessoa?.name || 'a pessoa';

  if (!data.plano) {
    return (
      <div className="es-stack">
        <article className="es-card" style={{ maxWidth: 680 }}>
          <h2>Plano alimentar de {firstName(nome)}</h2>
          <div className="es-empty" style={{ textAlign: 'left', padding: '8px 0 0' }}><p>Nenhum plano em andamento. Comece um rascunho: {firstName(nome)} só vê o plano depois que você publicar.</p></div>
          <div className="es-field"><label htmlFor="pa-nome">Nome do plano</label><input id="pa-nome" className="es-input" maxLength={80} placeholder="Ex.: Reeducação, fase 1" value={novo.name} onChange={(e) => setNovo({ ...novo, name: e.target.value })} /></div>
          <div className="es-field"><label htmlFor="pa-base">Começar de</label>
            <select id="pa-base" className="es-input" value={novo.modeloId} onChange={(e) => setNovo({ ...novo, modeloId: e.target.value })}>
              <option value="">Em branco (5 refeições, sem alimentos)</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>Modelo: {m.name}</option>)}
            </select>
          </div>
          <button type="button" className="rx-btn" disabled={busy || !novo.name.trim()} onClick={async () => { if (await run(() => alimentacaoApi.criarPlano(linkId, novo.name, novo.modeloId || null), 'Rascunho criado.')) load(); }}><Plus size={16} />Criar rascunho</button>
        </article>
        {data.anteriores.length > 0 && <Anteriores list={data.anteriores} />}
      </div>
    );
  }

  const p = data.plano;
  const publicado = p.currentVersion > 0;
  const next = p.currentVersion + 1;
  const salvar = () => run(async () => { const r = await alimentacaoApi.salvarRascunho(p.id, name, draft); setDraft(r.content); setDirty(false); return r; }, 'Rascunho salvo.');

  return (
    <div className="es-grid">
      <article className="es-card">
        <h2>{p.name} <span className={`rx-pill ${publicado ? 'es-pill-on' : ''}`}>{publicado ? `Versão ${p.currentVersion} publicada` : 'Rascunho'}</span></h2>
        <p className="es-sub">{publicado ? `Você edita a versão ${next}. A versão ${p.vigente?.version || p.currentVersion} continua valendo até a nova começar.` : `${firstName(nome)} ainda não vê este plano. Publique quando estiver pronto.`}</p>
        <div className="es-field" style={{ marginTop: 10 }}><label htmlFor="pa-n">Nome do plano</label><input id="pa-n" className="es-input" maxLength={80} value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} /></div>
        <PlanoEditor value={draft} onChange={(c) => { setDraft(c); setDirty(true); }} idPrefix="pa" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="rx-btn" disabled={busy || !dirty} onClick={salvar}>Salvar rascunho</button>
          <span className="es-sub" style={{ margin: 0 }} role="status">{dirty ? 'Alterações não salvas.' : 'Rascunho salvo.'}</span>
        </div>
      </article>
      <aside className="rx-rail">
        <section className="summary"><h2>Publicação <span className={`rx-pill ${publicado ? 'es-pill-on' : ''}`}>{publicado ? `v${p.currentVersion}` : 'Rascunho'}</span></h2>
          <div className="es-field" style={{ marginTop: 14 }}><label htmlFor="pa-ini">Começa em</label><input id="pa-ini" className="es-input" type="date" min={localISO()} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            <span className="es-sub" style={{ margin: 0 }}>{publicado ? `A versão atual vale até ${fmtDia(addDays(startsOn, -1), { weekday: false })}. Nada muda antes disso.` : `A aba Alimentação de ${firstName(nome)} desbloqueia ao publicar.`}</span></div>
          <div className="es-field"><label htmlFor="pa-fim">Termina em <span style={{ color: 'var(--rx-ink-3)', fontWeight: 450 }}>(opcional)</span></label><input id="pa-fim" className="es-input" type="date" min={startsOn} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => setPrevia(true)}><Eye size={16} />Ver como {firstName(nome)} vai ver</button>
            <button type="button" className="rx-btn" disabled={busy} onClick={() => setConfirm('publicar')}>Publicar para {firstName(nome)}</button>
          </div>
        </section>
        <section><h2>Versões</h2>
          {p.versoes.length === 0 ? <p className="rx-sub">Nenhuma versão publicada ainda.</p> : (
            <ul className="al-list-plain">
              {[...p.versoes].reverse().map((v) => <li key={v.version}>Versão {v.version}: {v.startsOn > localISO() ? 'começa' : 'desde'} {fmtDia(v.startsOn, { weekday: false })}{p.vigente?.version === v.version ? ' (vigente)' : v.startsOn > localISO() ? ' (futura)' : ' (substituída)'}</li>)}
            </ul>
          )}
          {p.endsOn && <p className="rx-sub" style={{ marginTop: 8 }}>Termina em {fmtDia(p.endsOn, { weekday: false })}.</p>}
        </section>
        {data.resumo7 && (
          <section><h2>Registros, 7 dias</h2>
            <p className="rx-sub">{data.resumo7.registradas} de {data.resumo7.previstas} refeições previstas com registro.</p>
            <Contagens counts={data.resumo7.counts} />
          </section>
        )}
        <section>
          <button type="button" className="es-danger" onClick={() => setConfirm('encerrar')}>{publicado ? 'Encerrar plano' : 'Descartar rascunho'}</button>
          {data.anteriores.length > 0 && <p className="rx-sub" style={{ marginTop: 10 }}>{data.anteriores.length} {data.anteriores.length === 1 ? 'plano encerrado' : 'planos encerrados'} no histórico de {firstName(nome)}.</p>}
        </section>
      </aside>

      {previa && <PreviaPaciente content={draft} startsOn={startsOn} pessoa={nome} onClose={() => setPrevia(false)} />}
      {confirm === 'publicar' && (
        <Confirm title={`Publicar a versão ${next}?`} button={`Publicar para ${fmtDia(startsOn, { weekday: false })}`} busy={busy}
          text={`${firstName(nome)} vê o plano ${publicado ? 'novo ' : ''}a partir de ${fmtDia(startsOn, { weekday: false })}.${publicado ? ' Até lá, a versão atual continua valendo. Os registros feitos nela ficam ligados a ela.' : ''}`}
          onCancel={() => setConfirm(null)}
          onOk={async () => {
            const ok = await run(async () => {
              if (dirty) { const r = await alimentacaoApi.salvarRascunho(p.id, name, draft); setDraft(r.content); }
              return alimentacaoApi.publicar(p.id, startsOn, endsOn || null);
            }, `Versão ${next} publicada.`);
            setConfirm(null);
            if (ok) load();
          }} />
      )}
      {confirm === 'encerrar' && (
        <Confirm danger title={publicado ? `Encerrar ${p.name}?` : 'Descartar o rascunho?'} button={publicado ? 'Encerrar plano' : 'Descartar'} busy={busy}
          text={publicado ? `${firstName(nome)} continua vendo o plano e os registros, só para leitura. Depois você pode começar um plano novo.` : `${firstName(nome)} nunca viu este rascunho. Ele sai da lista.`}
          onCancel={() => setConfirm(null)}
          onOk={async () => { const ok = await run(() => alimentacaoApi.encerrar(p.id), publicado ? 'Plano encerrado.' : 'Rascunho descartado.'); setConfirm(null); if (ok) load(); }} />
      )}
    </div>
  );
}

function Anteriores({ list }) {
  return (
    <article className="es-card">
      <h2>Planos encerrados</h2>
      {list.map((p) => <div className="es-row" key={p.id}><div className="grow"><b>{p.name}</b><small>{p.versoes.length} {p.versoes.length === 1 ? 'versão' : 'versões'}{p.endedAt ? `, encerrado em ${new Date(p.endedAt).toLocaleDateString('pt-BR')}` : ''}. A pessoa mantém, só para leitura.</small></div></div>)}
    </article>
  );
}

/** Área individual, aba "Registros" (Nutricionista): semana do paciente com os dois números e as observações. */
export function ProRegistrosAlimentacao({ linkId, toast }) {
  const [from, setFrom] = useState(mondayOf(localISO()));
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    alimentacaoApi.registrosPessoa(linkId, from).then((r) => alive && setData(r), (e) => { if (alive) { setData({ plano: null }); toast?.(e.message); } });
    return () => { alive = false; };
  }, [linkId, from]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <p className="es-sub">Carregando registros…</p>;
  if (!data.plano) return <article className="es-card"><div className="es-empty"><h3>Sem plano publicado</h3><p>Os registros aparecem aqui depois que você publicar um plano e a pessoa registrar as refeições.</p></div></article>;
  const today = localISO();
  return (
    <div className="es-stack">
      <article className="es-card">
        <h2>Semana <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="rx-btn ghost tiny" aria-label="Semana anterior" onClick={() => setFrom(addDays(from, -7))}><ChevronLeft size={15} /></button>
          <button type="button" className="rx-btn ghost tiny" aria-label="Próxima semana" onClick={() => setFrom(addDays(from, 7))}><ChevronRight size={15} /></button>
        </span></h2>
        <p className="es-sub">{data.plano.name}, de {fmtDia(from, { weekday: false })} a {fmtDia(addDays(from, 6), { weekday: false })}.</p>
        <div className="al-week" style={{ marginTop: 12 }}>
          {data.days.map((d) => (
            <div key={d.date} className={`al-day ${d.date === today ? 'today' : ''}`}>
              <b>{fmtDia(d.date).split(',')[0]}</b><small>{fmtDia(d.date, { weekday: false })}</small>
              <div className="v">{d.futuro || !d.previstas ? '—' : <>{d.registradas}<small> de {d.previstas}</small></>}</div>
              {!d.futuro && d.previstas > 0 && <div className="rx-ticks">{Array.from({ length: d.previstas }, (_, i) => <i key={i} className={i < d.registradas ? 'on' : ''} />)}</div>}
              {d.extras > 0 && <small>+{d.extras} extra{d.extras > 1 ? 's' : ''}</small>}
            </div>
          ))}
        </div>
        <p className="rx-sub" style={{ marginTop: 12 }}>Registro = refeições previstas com registro ÷ previstas: {data.total.registradas} de {data.total.previstas} até hoje. Relação com o plano em contagens, sem nota:</p>
        <Contagens counts={data.total.counts} />
      </article>
      <article className="es-card">
        <h2>Registros da semana</h2>
        {data.registros.length === 0 ? <div className="es-empty"><p>Nenhum registro nesta semana.</p></div> : data.registros.map((r) => (
          <div className="es-row" key={`${r.date}-${r.mealKey}`} style={{ alignItems: 'flex-start' }}>
            <div className="grow"><b>{r.meal}{r.time ? `, ${r.time}` : ''}</b>
              <small>{fmtDia(r.date)}{r.option ? `, ${r.option}` : ''}{r.substitution ? `, ${r.substitution}` : ''}</small>
              {r.note && <small>“{r.note}”</small>}
            </div>
            {r.status !== 'extra' && <span className={`rx-pill ${LOG_STATUS[r.status]?.inPlan ? 'es-pill-on' : ''}`}>{LOG_STATUS[r.status]?.label || r.status}</span>}
          </div>
        ))}
      </article>
    </div>
  );
}

/** Turma, aba "Planos": cada paciente tem o seu plano, mesmo dentro do grupo. */
export function TurmaPlanos({ turma, openPessoa, toast }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    let alive = true;
    alimentacaoApi.planosTurma(turma.id).then((r) => alive && setList(r.pessoas || []), (e) => { if (alive) { setList([]); toast?.(e.message); } });
    return () => { alive = false; };
  }, [turma.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <article className="es-card">
      <h2>Planos dos participantes</h2>
      {list === null ? <p className="es-sub">Carregando…</p> : list.length === 0 ? <div className="es-empty"><p>Ninguém na turma ainda.</p></div> : list.map((p) => (
        <div className="es-row" key={p.linkId}><span className="es-avatar">{initialsOf(p.name)}</span>
          <div className="grow"><b>{p.name}</b><small>{!p.plano ? 'Sem plano' : p.plano.status === 'rascunho' ? `${p.plano.name}: rascunho, ainda não publicado` : `${p.plano.name}: ${p.plano.vigente ? `versão ${p.plano.vigente.version} vigente` : 'ainda não começou'}${p.plano.proxima ? `, versão ${p.plano.proxima.version} começa em ${fmtDia(p.plano.proxima.startsOn, { weekday: false })}` : ''}`}{p.registro7 && p.registro7.previstas ? `. ${p.registro7.registradas} de ${p.registro7.previstas} refeições em 7 dias` : ''}</small></div>
          <button type="button" className={p.plano ? 'rx-btn ghost tiny' : 'rx-btn tiny'} onClick={() => openPessoa?.(p.linkId, 'Plano')}>{p.plano ? 'Abrir plano' : 'Criar plano'}</button>
        </div>
      ))}
      <p className="es-sub">Planos alimentares são individuais: cada paciente tem o seu, mesmo dentro do grupo.</p>
    </article>
  );
}

/** Conteúdo da Nutricionista: modelos de plano para reaproveitar (cada paciente recebe uma cópia própria). */
export function PlanosModelo({ toast }) {
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setList((await alimentacaoApi.modelos()).modelos || []); } catch (e) { setList([]); toast?.(e.message); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  if (edit) {
    return (
      <>
        <div className="es-head"><div><h1>{edit.id ? edit.name || 'Modelo' : 'Novo modelo'}</h1><p>O modelo não vai para ninguém sozinho. Ao criar o plano de um paciente, escolha “Começar de” este modelo.</p></div></div>
        <article className="es-card">
          <div className="es-field"><label htmlFor="pm-n">Nome do modelo</label><input id="pm-n" className="es-input" maxLength={80} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <PlanoEditor value={edit.content} onChange={(content) => setEdit({ ...edit, content })} idPrefix="pm" />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="rx-btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
            <button type="button" className="rx-btn" disabled={busy || !edit.name.trim()} onClick={async () => {
              setBusy(true);
              try {
                if (edit.id) await alimentacaoApi.salvarModelo(edit.id, edit.name, edit.content);
                else await alimentacaoApi.criarModelo(edit.name, edit.content);
                toast?.('Modelo salvo.');
                setEdit(null);
                load();
              } catch (e) { toast?.(e.message); } finally { setBusy(false); }
            }}>Salvar modelo</button>
          </div>
        </article>
      </>
    );
  }
  return (
    <>
      <div className="es-head"><div><h1>Planos alimentares</h1><p>Modelos de plano para reaproveitar. Cada paciente recebe uma cópia própria, que você ajusta na área individual.</p></div>
        <div className="acts"><button type="button" className="rx-btn" onClick={() => setEdit({ id: null, name: '', content: starterContent() })}><Plus size={16} />Novo modelo</button></div></div>
      <article className="es-card">
        {list === null ? <p className="es-sub">Carregando…</p> : list.length === 0 ? (
          <div className="es-empty"><h3>Nenhum modelo ainda</h3><p>Monte um plano base (refeições, opções e substituições) para começar os planos dos pacientes mais rápido.</p><button type="button" className="rx-btn" onClick={() => setEdit({ id: null, name: '', content: starterContent() })}><Plus size={16} />Criar modelo</button></div>
        ) : list.map((m) => (
          <div className="es-row" key={m.id}><span className="es-avatar"><Utensils size={15} /></span><div className="grow"><b>{m.name}</b><small>{contentSummary(m.content)}</small></div>
            <span className="rx-pill">versão {m.version}</span>
            <button type="button" className="rx-btn ghost tiny" onClick={() => setEdit({ id: m.id, name: m.name, content: m.content })}>Editar</button>
            <button type="button" className="rx-btn ghost tiny" onClick={async () => { try { await alimentacaoApi.arquivarModelo(m.id); toast?.('Modelo arquivado.'); load(); } catch (e) { toast?.(e.message); } }}>Arquivar</button>
          </div>
        ))}
        <p className="es-sub">Mudar um modelo não muda os planos já criados a partir dele.</p>
      </article>
    </>
  );
}
