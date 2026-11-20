import React, { useCallback, useEffect, useState } from 'react';
import { Info, Plus } from 'lucide-react';
import { espacosApi, fmtDate } from './espacosApi';
import { AtribuirDialog } from './AtribuirDialog';
import { FichaEditor, normalizeFicha, resumoExercicio } from './FichaEditor';

/**
 * Fichas e programas (Personal): modelos com versões imutáveis. Uma versão nova vai só para quem for escolhido;
 * cópias adaptadas ficam desmarcadas por padrão. Atribuir cria uma cópia por pessoa.
 */
export function ProConteudo({ toast }) {
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null); // { id, name, description, content, originalContent }
  const [levar, setLevar] = useState(null); // { ficha, version, items: [{id, person, adapted, checked}] }
  const [alvo, setAlvo] = useState(null); // { fichaId, turmas, pessoas, kind, groupId, linkIds }
  const [atribuir, setAtribuir] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await espacosApi.fichas()); } catch (e) { toast?.(e.message); setData({ fichas: [], config: {} }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (busy) return;
    const content = normalizeFicha(edit.content);
    if (!edit.name.trim()) { toast?.('Dê um nome à ficha.'); return; }
    if (!content.exercises.length) { toast?.('Adicione pelo menos um exercício.'); return; }
    setBusy(true);
    try {
      if (!edit.id) {
        await espacosApi.criarFicha({ name: edit.name, description: edit.description, content });
        toast?.('Ficha criada (versão 1).');
        setEdit(null);
      } else {
        await espacosApi.editarFicha(edit.id, { name: edit.name, description: edit.description });
        const changed = JSON.stringify(content) !== JSON.stringify(normalizeFicha(edit.originalContent));
        if (changed) {
          const v = await espacosApi.novaVersao(edit.id, content);
          const det = await espacosApi.ficha(edit.id);
          setLevar({ ficha: det.ficha, version: v.version, items: det.atribuicoes.map((a) => ({ ...a, checked: !a.adapted })) });
        } else toast?.('Ficha atualizada.');
        setEdit(null);
      }
      await load();
    } catch (e) {
      toast?.(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openAlvo = async (f) => {
    try {
      const [meu, pes] = await Promise.all([espacosApi.meu(), espacosApi.pessoas()]);
      setAlvo({ fichaId: f.id, fichaName: f.name, turmas: (meu.turmas || []).filter((t) => t.status === 'ativa'), pessoas: pes.pessoas || [], kind: (meu.turmas || []).length ? 'turma' : 'pessoas', groupId: (meu.turmas || [])[0]?.id || '', linkIds: [] });
    } catch (e) { toast?.(e.message); }
  };

  if (!data) return <div className="es"><p className="es-sub">Carregando fichas…</p></div>;
  const ativas = data.fichas.filter((f) => f.status === 'ativa');
  const arquivadas = data.fichas.filter((f) => f.status !== 'ativa');

  return (
    <div className="es">
      <div className="es-head"><div><h1>Fichas e programas</h1><p>Modelos com versões. Mudar um modelo não muda sessões feitas nem cópias adaptadas.</p></div>
        <div className="acts"><button type="button" className="rx-btn" onClick={() => setEdit({ id: null, name: '', description: '', content: { exercises: [] }, originalContent: { exercises: [] } })}><Plus size={16} />Nova ficha</button></div></div>
      <div className="es-grid">
        <article className="es-card">
          {ativas.length === 0 ? (
            <div className="es-empty"><h3>Nenhuma ficha ainda</h3><p>Crie uma ficha com os exercícios da biblioteca ou personalizados. Depois atribua a uma turma ou a pessoas.</p><button type="button" className="rx-btn" onClick={() => setEdit({ id: null, name: '', description: '', content: { exercises: [] }, originalContent: { exercises: [] } })}><Plus size={16} />Criar ficha</button></div>
          ) : ativas.map((f) => (
            <div className="es-row" key={f.id} style={{ alignItems: 'flex-start' }}>
              <div className="grow"><b>{f.name}</b><small>Versão {f.version}, {f.activeAssignments} {f.activeAssignments === 1 ? 'atribuição ativa' : 'atribuições ativas'}, atualizada em {fmtDate(f.updatedAt)}</small><small>{f.content.exercises.map((e) => `${e.name} ${resumoExercicio(e)}`).join('; ')}</small></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="rx-btn ghost tiny" onClick={() => setEdit({ id: f.id, name: f.name, description: f.description, content: JSON.parse(JSON.stringify(f.content)), originalContent: f.content })}>Editar</button>
                <button type="button" className="rx-btn tiny" onClick={() => openAlvo(f)}>Atribuir</button>
                <button type="button" className="rx-btn ghost tiny" onClick={async () => { try { await espacosApi.editarFicha(f.id, { status: 'arquivada' }); toast?.('Ficha arquivada. As cópias atribuídas continuam.'); load(); } catch (e) { toast?.(e.message); } }}>Arquivar</button>
              </div>
            </div>
          ))}
          {arquivadas.length > 0 && <p className="es-sub" style={{ marginTop: 10 }}>Arquivadas: {arquivadas.map((f) => f.name).join(', ')}.</p>}
        </article>
        <aside className="rx-rail">
          <section className="summary">
            <h2>Padrão do espaço</h2>
            <button type="button" className="es-switch" role="switch" aria-checked={data.config?.allowClientEdit === true} style={{ marginTop: 10 }}
              onClick={async () => { try { await espacosApi.config({ allowClientEdit: !(data.config?.allowClientEdit === true) }); load(); } catch (e) { toast?.(e.message); } }}>
              <span className="knob" /><span>Pessoas podem editar a cópia delas</span>
            </button>
            <p className="rx-sub">Vale quando a atribuição não define nada. A escolha feita na atribuição tem precedência.</p>
          </section>
          <section><h2>Biblioteca</h2><p className="rx-sub">33 exercícios do Ethos e os personalizados que você criar dentro das fichas.</p></section>
        </aside>
      </div>

      {edit && (
        <div className="rx-overlay" onClick={() => setEdit(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="fic-t" style={{ maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="fic-t">{edit.id ? `Editar ${edit.name}` : 'Nova ficha'}</h2>
            <p>{edit.id ? 'Mudar exercícios cria uma versão nova. Depois você escolhe quem recebe.' : 'A ficha nasce na versão 1.'}</p>
            <div className="es-field"><label htmlFor="fic-n">Nome da ficha</label><input id="fic-n" className="es-input" maxLength={80} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Ex.: Treino A, inferiores" /></div>
            <div className="es-field"><label htmlFor="fic-d">Descrição (opcional)</label><input id="fic-d" className="es-input" maxLength={240} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <FichaEditor value={edit.content} onChange={(content) => setEdit({ ...edit, content })} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="rx-btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button type="button" className="rx-btn" disabled={busy} onClick={save}>Salvar ficha</button>
            </div>
          </div>
        </div>
      )}

      {levar && (
        <div className="rx-overlay" onClick={() => setLevar(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="lev-t" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="lev-t">Versão {levar.version} de {levar.ficha.name} salva</h2>
            <p>Quem recebe a versão nova? Quem não for marcado continua com a versão atual. Sessões em andamento não mudam.</p>
            {levar.items.length === 0 ? <p className="es-sub">Ninguém tem esta ficha atribuída. Ela vale para as próximas atribuições.</p> : (
              <div className="es-radio">
                {levar.items.map((a, i) => (
                  <label key={a.id}><input type="checkbox" checked={a.checked} onChange={(e) => setLevar({ ...levar, items: levar.items.map((x, k) => (k === i ? { ...x, checked: e.target.checked } : x)) })} />
                    <span>{a.person}<small>versão {a.version}{a.groupName ? `, turma ${a.groupName}` : ''}{a.adapted ? ': adaptada para esta pessoa (marque só se quiser substituir a adaptação)' : ''}</small></span></label>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="rx-btn ghost" onClick={() => setLevar(null)}>Só para atribuições novas</button>
              {levar.items.length > 0 && <button type="button" className="rx-btn" disabled={busy || !levar.items.some((x) => x.checked)} onClick={async () => {
                try { const r = await espacosApi.levarVersao(levar.ficha.id, levar.items.filter((x) => x.checked).map((x) => x.id)); toast?.(`Versão ${levar.version} enviada a ${r.updated} ${r.updated === 1 ? 'pessoa' : 'pessoas'}.`); setLevar(null); load(); } catch (e) { toast?.(e.message); }
              }}>Enviar a {levar.items.filter((x) => x.checked).length}</button>}
            </div>
          </div>
        </div>
      )}

      {alvo && (
        <div className="rx-overlay" onClick={() => setAlvo(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="alv-t" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="alv-t">Atribuir {alvo.fichaName}</h2>
            <p>Para uma turma (uma cópia por pessoa) ou para pessoas escolhidas.</p>
            <div className="es-chips" style={{ marginBottom: 12 }}>
              <button type="button" className="es-chip" aria-pressed={alvo.kind === 'turma'} disabled={!alvo.turmas.length} onClick={() => setAlvo({ ...alvo, kind: 'turma' })}>Turma</button>
              <button type="button" className="es-chip" aria-pressed={alvo.kind === 'pessoas'} onClick={() => setAlvo({ ...alvo, kind: 'pessoas' })}>Pessoas</button>
            </div>
            {alvo.kind === 'turma' ? (
              <div className="es-field"><label htmlFor="alv-g">Turma</label><select id="alv-g" className="es-input" value={alvo.groupId} onChange={(e) => setAlvo({ ...alvo, groupId: e.target.value })}>{alvo.turmas.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.members} pessoas)</option>)}</select></div>
            ) : alvo.pessoas.length === 0 ? <div className="es-note"><Info size={16} /><span>Ninguém com vínculo ainda.</span></div> : (
              <div className="es-radio">{alvo.pessoas.map((p) => (
                <label key={p.linkId}><input type="checkbox" checked={alvo.linkIds.includes(p.linkId)} onChange={(e) => setAlvo({ ...alvo, linkIds: e.target.checked ? [...alvo.linkIds, p.linkId] : alvo.linkIds.filter((x) => x !== p.linkId) })} /><span>{p.name}<small>@{p.username}</small></span></label>
              ))}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="rx-btn ghost" onClick={() => setAlvo(null)}>Cancelar</button>
              <button type="button" className="rx-btn" disabled={alvo.kind === 'turma' ? !alvo.groupId : !alvo.linkIds.length} onClick={() => {
                const t = alvo.kind === 'turma' ? { groupId: alvo.groupId, alvo: `a turma ${alvo.turmas.find((x) => x.id === alvo.groupId)?.name}` } : { linkIds: alvo.linkIds, alvo: `${alvo.linkIds.length} ${alvo.linkIds.length === 1 ? 'pessoa' : 'pessoas'}` };
                setAtribuir({ ...t, fichaId: alvo.fichaId }); setAlvo(null);
              }}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {atribuir && <AtribuirDialog groupId={atribuir.groupId || null} linkIds={atribuir.linkIds || null} initialFichaId={atribuir.fichaId} alvo={atribuir.alvo} toast={toast} onClose={() => setAtribuir(null)} onDone={() => { setAtribuir(null); load(); }} />}
    </div>
  );
}
