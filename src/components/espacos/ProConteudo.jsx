import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { espacosApi, fmtDate } from './espacosApi';
import { AtribuirDialog } from './AtribuirDialog';
import { FichaEditor, normalizeFicha, resumoExercicio } from './FichaEditor';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';

/**
 * Fichas e programas (Personal): modelos com versões imutáveis. Uma versão nova vai só para quem for escolhido;
 * cópias adaptadas ficam desmarcadas por padrão. Atribuir cria uma cópia por pessoa.
 */
export function ProConteudo({ toast }) {
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null); // { id, name, description, content, originalContent }
  const [levar, setLevar] = useState(null); // { ficha, version, items: [{id, person, adapted, checked}] }
  const [atribuir, setAtribuir] = useState(null);
  const [busy, setBusy] = useState(false);
  // Proposta 07: só salva com alteração real; fechar com alteração pergunta antes.
  const snap = (e) => JSON.stringify({ name: e.name, description: e.description, content: normalizeFicha(e.content) });
  const dirty = Boolean(edit) && snap(edit) !== edit.initial;
  const guard = useUnsavedGuard(dirty, { label: edit?.name ? `a ficha ${edit.name}` : 'a ficha nova', onSave: () => save() });
  const abrir = (e) => setEdit({ ...e, initial: snap(e) });

  const load = useCallback(async () => {
    try { setData(await espacosApi.fichas()); } catch (e) { toast?.(e.message); setData({ fichas: [], config: {} }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (busy) return false;
    const content = normalizeFicha(edit.content);
    if (!edit.name.trim()) { toast?.('Dê um nome à ficha.'); return false; }
    if (!content.exercises.length) { toast?.('Adicione pelo menos um exercício.'); return false; }
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
      return true;
    } catch (e) {
      toast?.(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Atribuir é um passo separado de criar (proposta 07): destino, revisar destinatários e confirmar envio.
  const openAlvo = (f) => setAtribuir({ fichaId: f.id });

  if (!data) return <div className="es"><p className="es-sub">Carregando fichas…</p></div>;
  const ativas = data.fichas.filter((f) => f.status === 'ativa');
  const arquivadas = data.fichas.filter((f) => f.status !== 'ativa');

  return (
    <div className="es">
      <div className="es-head"><div><h1>Fichas e programas</h1><p>Modelos com versões. Mudar um modelo não muda sessões feitas nem cópias adaptadas.</p></div>
        <div className="acts"><button type="button" className="rx-btn" onClick={() => abrir({ id: null, name: '', description: '', content: { exercises: [] }, originalContent: { exercises: [] } })}><Plus size={16} />Nova ficha</button></div></div>
      <div className="es-grid">
        <article className="es-card">
          {ativas.length === 0 ? (
            <div className="es-empty"><h3>Nenhuma ficha ainda</h3><p>Crie uma ficha com os exercícios da biblioteca ou personalizados. Depois atribua a uma turma ou a pessoas.</p><button type="button" className="rx-btn" onClick={() => abrir({ id: null, name: '', description: '', content: { exercises: [] }, originalContent: { exercises: [] } })}><Plus size={16} />Criar ficha</button></div>
          ) : ativas.map((f) => (
            <div className="es-row" key={f.id} style={{ alignItems: 'flex-start' }}>
              <div className="grow"><b>{f.name}</b><small>Versão {f.version}, {f.activeAssignments} {f.activeAssignments === 1 ? 'atribuição ativa' : 'atribuições ativas'}, atualizada em {fmtDate(f.updatedAt)}</small><small>{f.content.exercises.map((e) => `${e.name} ${resumoExercicio(e)}`).join('; ')}</small></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="rx-btn ghost tiny" onClick={() => abrir({ id: f.id, name: f.name, description: f.description, content: JSON.parse(JSON.stringify(f.content)), originalContent: f.content })}>Editar</button>
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
          <section><h2>Biblioteca</h2><p className="rx-sub">250 exercícios em português, com o nome em inglês para busca, e os personalizados do seu espaço. Abra pela ficha.</p></section>
        </aside>
      </div>

      {edit && (
        <div className="rx-overlay" onClick={() => guard.confirm(() => setEdit(null))}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="fic-t" style={{ maxWidth: 1080, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 id="fic-t">{edit.id ? `Editar ${edit.name}` : 'Nova ficha'}</h2>
            <p>{edit.id ? 'Mudar exercícios cria uma versão nova. Depois você escolhe quem recebe.' : 'A ficha nasce na versão 1.'}</p>
            <div className="es-field"><label htmlFor="fic-n">Nome da ficha</label><input id="fic-n" className="es-input" maxLength={80} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Ex.: Treino A, inferiores" /></div>
            <div className="es-field"><label htmlFor="fic-d">Descrição (opcional)</label><input id="fic-d" className="es-input" maxLength={240} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <FichaEditor value={edit.content} onChange={(content) => setEdit({ ...edit, content })} fichaName={edit.name || 'a ficha nova'} escopo="espaco" toast={toast} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <span className="es-sub" role="status" style={{ marginRight: 'auto', alignSelf: 'center' }}>{dirty ? 'Alterações não salvas.' : edit.id ? 'Tudo salvo.' : ''}</span>
              <button type="button" className="rx-btn ghost" onClick={() => guard.confirm(() => setEdit(null))}>{dirty ? 'Cancelar' : 'Fechar'}</button>
              <button type="button" className="rx-btn" disabled={busy || !dirty} onClick={save}>{edit.id ? 'Salvar alterações' : 'Criar ficha'}</button>
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

      {atribuir && <AtribuirDialog initialFichaId={atribuir.fichaId} toast={toast} onClose={() => setAtribuir(null)} onDone={() => { setAtribuir(null); load(); }} />}
    </div>
  );
}
