import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Lock, Plus } from 'lucide-react';
import { espacosApi, fmtDate } from './espacosApi';
import { AtribuirDialog } from './AtribuirDialog';
import { FichaEditor, normalizeFicha, resumoExercicio } from './FichaEditor';
import { requestLeave, useUnsavedGuard } from '../../hooks/useUnsavedGuard';

const DAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const local = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtKg = (n) => String(Math.round(Number(n) * 10) / 10).replace('.', ',');

function realizado(sets) {
  return sets.map((s) => (s.metric === 'tempo' ? `${s.seconds} s` : s.metric === 'kg' ? `${fmtKg(s.weightKg)} kg × ${s.reps}` : `${s.reps}`)).join(', ');
}

/**
 * Área individual de acompanhamento (não é a conta da pessoa): só o que o profissional atribuiu e os registros disso.
 * Extensões dos outros lotes (agenda, plano alimentar) entram como abas extras via `extraTabs`.
 */
export function ProIndividual({ linkId, pro, onBack, toast, extraTabs = [], initialTab = null }) {
  const isPersonal = pro?.model === 'personal';
  const tabs = [...(isPersonal ? ['Planejamento', 'Registros'] : []), ...extraTabs.map((t) => t.label), 'Acesso'];
  const [tab, setTab] = useState(initialTab && tabs.includes(initialTab) ? initialTab : tabs[0]);
  const [data, setData] = useState(null);
  const [pessoa, setPessoa] = useState(null);
  const [erro, setErro] = useState('');
  const [atribuir, setAtribuir] = useState(false);
  const [adaptar, setAdaptar] = useState(null);
  const adaptDirty = Boolean(adaptar) && JSON.stringify([normalizeFicha(adaptar.content), adaptar.note]) !== adaptar.initial;
  const salvarAdaptacao = async () => { try { await espacosApi.adaptar(adaptar.id, normalizeFicha(adaptar.content), adaptar.note); setAdaptar(null); toast?.('Versão desta pessoa salva.'); await load(); return true; } catch (e) { toast?.(e.message); return false; } };
  const guard = useUnsavedGuard(adaptDirty, { label: adaptar ? `a adaptação de ${adaptar.name}` : '', onSave: salvarAdaptacao });
  const [sessao, setSessao] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isPersonal) {
        const r = await espacosApi.acompanhamento(linkId);
        setData(r);
        setPessoa(r.pessoa);
      } else {
        const p = (await espacosApi.pessoas()).pessoas.find((x) => x.linkId === linkId);
        setPessoa(p ? { linkId, name: p.name, username: p.username, since: p.since } : null);
        if (!p) setErro('Pessoa não encontrada ou sem vínculo ativo.');
      }
    } catch (e) {
      setErro(e.message);
    }
  }, [linkId, isPersonal]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (ok) toast?.(ok);
      await load();
    } catch (e) {
      toast?.(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (erro) return <div className="es"><button type="button" className="rx-btn ghost tiny" onClick={onBack}><ArrowLeft size={15} />Voltar</button><div className="es-error" style={{ marginTop: 14 }}>{erro}</div></div>;
  if (!pessoa) return <div className="es"><p className="es-sub">Carregando…</p></div>;

  const ativas = (data?.atribuicoes || []).filter((a) => a.status === 'ativa');
  const encerradas = (data?.atribuicoes || []).filter((a) => a.status !== 'ativa');
  const sessoes = data?.sessoes || [];
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const trained = new Set(sessoes.filter((s) => s.doneSets > 0).map((s) => local(new Date(s.startedAt))));
  const extra = extraTabs.find((t) => t.label === tab);

  return (
    <div className="es">
      <button type="button" className="rx-btn ghost tiny" onClick={() => requestLeave(() => onBack?.())} style={{ marginBottom: 14 }}><ArrowLeft size={15} />{pro?.peopleLabel || 'Pessoas'}</button>
      <div className="es-head"><div><h1>{pessoa.name}</h1><p>Vínculo desde {fmtDate(pessoa.since)}.</p></div>
        {isPersonal && <div className="acts"><button type="button" className="rx-btn" onClick={() => setAtribuir(true)}><Plus size={16} />Atribuir ficha</button></div>}</div>
      <div className="es-tabs-row" role="group" aria-label="Seções da área individual">
        {tabs.map((t) => <button key={t} type="button" aria-pressed={t === tab} onClick={() => requestLeave(() => setTab(t))}>{t}</button>)}
      </div>

      {isPersonal && tab === 'Planejamento' && (
        <article className="es-card">
          <h2>Fichas atribuídas</h2>
          {ativas.length === 0 && <div className="es-empty"><h3>Nada atribuído ainda</h3><p>Atribua uma ficha: ela aparece em “Do seu personal”, no Treino da pessoa.</p><button type="button" className="rx-btn" onClick={() => setAtribuir(true)}><Plus size={16} />Atribuir ficha</button></div>}
          {ativas.map((a) => (
            <div className="es-row" key={a.id} style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <b>{a.name}</b>
                <small>{a.groupName ? `da turma ${a.groupName}` : 'individual'}, versão {a.templateVersion}{a.adapted ? ', adaptada para esta pessoa' : ''}</small>
                <small>{a.content.exercises.map((e) => `${e.name} ${resumoExercicio(e)}`).join('; ')}</small>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="es-input" style={{ height: 34, width: 'auto', fontSize: 13.5 }} aria-label={`Quem edita ${a.name}`} value={a.allowClientEdit === null ? 'padrao' : a.allowClientEdit ? 'sim' : 'nao'}
                  onChange={(e) => run(() => espacosApi.permissao(a.id, e.target.value === 'padrao' ? null : e.target.value === 'sim'), 'Permissão atualizada.')}>
                  <option value="padrao">Edição: padrão do espaço ({data?.config?.allowClientEdit ? 'libera' : 'só na sessão'})</option>
                  <option value="sim">Pessoa pode editar a cópia</option>
                  <option value="nao">Só registra na sessão</option>
                </select>
                <button type="button" className="rx-btn ghost tiny" onClick={() => setAdaptar({ id: a.id, name: a.name, content: JSON.parse(JSON.stringify(a.content)), note: '', initial: JSON.stringify([normalizeFicha(a.content), '']) })}>Adaptar</button>
                <button type="button" className="es-danger" style={{ height: 34 }} onClick={() => setConfirm({ title: `Encerrar ${a.name}?`, text: 'A ficha sai de “Do seu personal” e fica no histórico da pessoa, só para leitura. As sessões feitas continuam.', button: 'Encerrar ficha', run: () => espacosApi.encerrarAtribuicao(a.id), ok: 'Ficha encerrada.' })}>Encerrar</button>
              </div>
            </div>
          ))}
          {encerradas.length > 0 && <p className="es-sub" style={{ marginTop: 10 }}>Encerradas: {encerradas.map((a) => `${a.name} (${a.endReason || 'encerrada'})`).join(', ')}.</p>}
        </article>
      )}

      {/* Registros de treino só no Personal; a Nutricionista tem a própria aba "Registros" (lote E, via extraTabs). */}
      {isPersonal && tab === 'Registros' && (
        <div className="es-stack">
          <article className="es-card">
            <h2>Esta semana</h2>
            <div className="es-week" style={{ marginTop: 12 }}>
              {week.map((d) => { const k = local(d); return <div key={k} className={`es-day ${trained.has(k) ? 'done' : ''} ${k === local(new Date()) ? 'today' : ''}`}><b>{DAY[d.getDay()]}</b><i /><small>{trained.has(k) ? 'treinou' : '—'}</small></div>; })}
            </div>
            <p className="es-sub" style={{ marginTop: 10 }}>Só treinos das suas fichas.</p>
          </article>
          <article className="es-card">
            <h2>Sessões (últimos 28 dias)</h2>
            {sessoes.length === 0 ? <div className="es-empty"><p>Nenhuma sessão das suas fichas nesse período.</p></div> : sessoes.map((s) => (
              <div className="es-row" key={s.id}>
                <div className="grow"><b>{s.name}</b><small>{new Date(s.startedAt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}, {Math.round(s.elapsedMs / 60000)} min, {s.doneSets} de {s.plannedSets} séries</small></div>
                <span className={`rx-pill ${s.status === 'concluida' ? 'es-pill-on' : ''}`}>{s.status === 'concluida' ? 'Concluída' : 'Incompleta'}</span>
                <button type="button" className="rx-btn ghost tiny" onClick={async () => { try { setSessao((await espacosApi.sessao(s.id)).sessao); } catch (e) { toast?.(e.message); } }}>Planejado x realizado</button>
              </div>
            ))}
          </article>
        </div>
      )}

      {extra && extra.render({ linkId, pessoa, pro, toast })}

      {tab === 'Acesso' && (
        <article className="es-card">
          <h2>Acesso</h2>
          <div className="es-share">
            <div><h4><Check size={15} />Você vê</h4><ul><li>Nome, @ e foto</li><li>{pro?.model === 'personal' ? 'Fichas que você atribuiu e as sessões delas' : pro?.model === 'nutri' ? 'Planos que você publicou e os registros deles' : 'Respostas aos seus convites'}</li><li>Comentários nos seus avisos</li></ul></div>
            <div><h4><Lock size={15} />Você não vê</h4><ul><li>Hábitos, notas, foco, saúde e agenda pessoal</li><li>{pro?.model === 'personal' ? 'Alimentação e treinos próprios' : pro?.model === 'nutri' ? 'Treinos' : 'Treinos e alimentação'}</li></ul></div>
          </div>
          <button type="button" className="es-danger" onClick={() => setConfirm({ title: `Encerrar vínculo com ${pessoa.name}?`, text: 'Você perde o acesso aos registros desta pessoa na hora. Ela continua com tudo o que recebeu, só para leitura. Nada é apagado.', button: 'Encerrar vínculo', run: async () => { await espacosApi.encerrarPessoa(linkId); onBack?.(); }, ok: 'Vínculo encerrado.' })}>Encerrar vínculo</button>
        </article>
      )}

      {atribuir && <AtribuirDialog linkIds={[linkId]} alvo={pessoa.name} toast={toast} onClose={() => setAtribuir(false)} onDone={() => { setAtribuir(false); load(); }} />}

      {adaptar && (
        <div className="rx-overlay" onClick={() => guard.confirm(() => setAdaptar(null))}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="adp-t" style={{ maxWidth: 1080, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 id="adp-t">Adaptar {adaptar.name} para {pessoa.name}</h2>
            <p>Cria uma versão só desta pessoa. As cópias dos colegas não mudam. Sessões já feitas também não.</p>
            <FichaEditor value={adaptar.content} onChange={(content) => setAdaptar({ ...adaptar, content })} fichaName={adaptar.name} escopo="espaco" toast={toast} />
            <div className="es-field" style={{ marginTop: 12 }}><label htmlFor="adp-n">Motivo (opcional, fica no histórico)</label><input id="adp-n" className="es-input" maxLength={200} value={adaptar.note} onChange={(e) => setAdaptar({ ...adaptar, note: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => guard.confirm(() => setAdaptar(null))}>Cancelar</button>
              <button type="button" className="rx-btn" disabled={busy || !adaptDirty} onClick={salvarAdaptacao}>Salvar versão de {pessoa.name.split(' ')[0]}</button>
            </div>
          </div>
        </div>
      )}

      {sessao && (
        <div className="rx-overlay" onClick={() => setSessao(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="ses-t" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="ses-t">{sessao.name}: planejado x realizado</h2>
            <p>{new Date(sessao.startedAt).toLocaleString('pt-BR')}, {Math.round(sessao.elapsedMs / 60000)} min, {sessao.status === 'concluida' ? 'concluída' : 'incompleta'}.</p>
            <table className="es-table resp">
              <thead><tr><th>Exercício</th><th>Planejado</th><th>Realizado</th></tr></thead>
              <tbody>
                {sessao.content.exercises.map((e) => {
                  const done = sessao.sets.filter((s) => s.exerciseKey === e.id);
                  const menos = done.length < Number(e.sets || 1);
                  return <tr key={e.id}><td className="wide">{e.name}</td><td data-l="Planejado">{resumoExercicio(e)}</td><td data-l="Realizado" style={{ color: menos ? 'var(--rx-amber)' : undefined }}>{done.length ? realizado(done) : 'não feito'}</td></tr>;
                })}
              </tbody>
            </table>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><button type="button" className="rx-btn ghost" onClick={() => setSessao(null)}>Fechar</button></div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="rx-overlay" onClick={() => setConfirm(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{confirm.title}</h2><p>{confirm.text}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
              <button type="button" className="es-danger" disabled={busy} onClick={async () => { const c = confirm; setConfirm(null); await run(c.run, c.ok); }}>{confirm.button}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
