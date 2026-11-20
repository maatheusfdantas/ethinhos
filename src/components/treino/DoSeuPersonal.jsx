import React, { useState } from 'react';
import { Building2, Copy, Eye, Pencil, Play } from 'lucide-react';
import { FichaEditor, normalizeFicha, resumoExercicio } from '../espacos/FichaEditor';
import { treinoApi } from './treinoApi';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';

/**
 * "Do seu personal" (lote D2): fichas atribuídas por um profissional.
 * Iniciar usa a cópia do servidor; editar só quando o profissional libera; copiar para as próprias fichas sempre.
 * Fichas encerradas (saiu da turma, vínculo encerrado) ficam só para leitura.
 */
export function DoSeuPersonal({ atribuidos = [], onStart, onCopy, onChanged, toast, starting }) {
  const [ver, setVer] = useState(null);
  const [editar, setEditar] = useState(null);
  const [busy, setBusy] = useState(false);
  const editDirty = Boolean(editar) && JSON.stringify(normalizeFicha(editar.content)) !== editar.initial;
  const salvarEdicao = async () => { setBusy(true); try { await treinoApi.editarAtribuido(editar.id, normalizeFicha(editar.content)); toast?.('Sua cópia foi salva.'); setEditar(null); onChanged?.(); return true; } catch (e) { toast?.(e.message); return false; } finally { setBusy(false); } };
  const guard = useUnsavedGuard(editDirty, { label: editar ? `a sua cópia de ${editar.name}` : '', onSave: salvarEdicao });
  const ativas = atribuidos.filter((a) => a.status === 'ativa');
  const encerradas = atribuidos.filter((a) => a.status !== 'ativa');
  if (!atribuidos.length) return null;

  const card = (a) => (
    <article className="tr-card" key={a.id} style={{ '--acc': 'var(--rx-blue)' }} data-testid="tr-atribuida">
      <h3><i className="dot" />{a.name}</h3>
      <p>{a.proName}, {a.spaceName}{a.groupName ? `, turma ${a.groupName}` : ''}</p>
      <div className="meta">
        <span className="tr-pill-badge"><Building2 size={13} />Do seu personal</span>
        <span className="rx-pill">{a.content.exercises.length} exercícios</span>
        {a.adapted && <span className="rx-pill">adaptada para você</span>}
        {a.status !== 'ativa' && <span className="rx-pill">encerrada</span>}
      </div>
      <ul className="tr-exlist">
        {a.content.exercises.slice(0, 3).map((e) => <li key={e.id}><span>{e.name}</span><span>{resumoExercicio(e)}</span></li>)}
        {a.content.exercises.length > 3 && <li><span style={{ color: 'var(--rx-ink-3)' }}>e mais {a.content.exercises.length - 3}</span><span /></li>}
      </ul>
      <div className="acts">
        {a.status === 'ativa' && <button type="button" className="rx-btn tiny" disabled={starting} onClick={() => onStart(a)}><Play size={15} />Iniciar treino</button>}
        <button type="button" className="rx-btn ghost tiny" onClick={() => setVer(a)}><Eye size={15} />Ver ficha</button>
        {a.canEdit && <button type="button" className="rx-btn ghost tiny" onClick={() => setEditar({ ...a, content: JSON.parse(JSON.stringify(a.content)), initial: JSON.stringify(normalizeFicha(a.content)) })}><Pencil size={15} />Editar</button>}
        <span className="grow" />
        <button type="button" className="tr-x" title="Copiar para minhas fichas" aria-label={`Copiar ${a.name} para minhas fichas`} onClick={() => onCopy(a)}><Copy size={16} /></button>
      </div>
    </article>
  );

  return (
    <section>
      <h2 className="tr-section-title">Do seu personal</h2>
      {ativas.length > 0 ? <div className="tr-cards">{ativas.map(card)}</div> : <p className="tr-sub">Nenhuma ficha ativa do profissional agora.</p>}
      {encerradas.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary className="tr-sub" style={{ cursor: 'pointer' }}>Fichas encerradas do profissional ({encerradas.length}), só para leitura</summary>
          <div className="tr-cards" style={{ marginTop: 12 }}>{encerradas.map(card)}</div>
        </details>
      )}
      <p className="tr-sub" style={{ marginTop: 10 }}>Mudanças feitas durante o treino valem só para a sessão. O profissional vê só as sessões destas fichas.</p>

      {ver && (
        <div className="rx-overlay" onClick={() => setVer(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="dsp-v" onClick={(e) => e.stopPropagation()}>
            <h2 id="dsp-v">{ver.name}</h2>
            <p>{ver.proName}, {ver.spaceName}. Versão {ver.templateVersion}{ver.adapted ? ', adaptada para você' : ''}.</p>
            <ul className="tr-exlist">{ver.content.exercises.map((e) => <li key={e.id}><span>{e.name}</span><span>{resumoExercicio(e)}{Number(e.restSec) > 0 ? `, descanso ${e.restSec} s` : ''}</span></li>)}</ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}><button type="button" className="rx-btn ghost" onClick={() => { onCopy(ver); setVer(null); }}><Copy size={15} />Copiar para minhas fichas</button><button type="button" className="rx-btn" onClick={() => setVer(null)}>Fechar</button></div>
          </div>
        </div>
      )}

      {editar && (
        <div className="rx-overlay" onClick={() => guard.confirm(() => setEditar(null))}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="dsp-e" style={{ maxWidth: 1080, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 id="dsp-e">Editar {editar.name}</h2>
            <p>O profissional liberou a edição da sua cópia. Ele vê que a ficha foi ajustada por você.</p>
            <FichaEditor value={editar.content} onChange={(content) => setEditar({ ...editar, content })} fichaName={editar.name} escopo="pessoa" toast={toast} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" className="rx-btn ghost" onClick={() => guard.confirm(() => setEditar(null))}>Cancelar</button>
              <button type="button" className="rx-btn" disabled={busy || !editDirty} onClick={salvarEdicao}>Salvar alterações</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
