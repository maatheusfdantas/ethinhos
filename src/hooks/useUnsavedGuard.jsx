import React, { useEffect, useId, useRef, useState } from 'react';

/**
 * Alterações não salvas (proposta 07, item 4). Um registro único para o app:
 * - cada editor registra se está com alteração real (`dirty`) e como salvar (`onSave`);
 * - fechar o editor, trocar de tela ou sair do navegador com alteração pede confirmação:
 *   "Salvar e sair", "Descartar alterações" ou "Continuar editando";
 * - sem alteração real, nada é perguntado. Nada é descartado em silêncio e nada vira rascunho automático.
 */
const guards = new Map();
let host = null;

function anyDirty(only) {
  return [...guards.entries()].filter(([id, g]) => g.dirty && (!only || id === only));
}

/** Pede para sair: segue direto se não houver alteração; senão mostra o diálogo. */
export function requestLeave(proceed, { only = null } = {}) {
  const pending = anyDirty(only);
  if (!pending.length || !host) { proceed(); return; }
  host({ pending, proceed });
}
export const hasUnsaved = () => anyDirty().length > 0;

export function useUnsavedGuard(dirty, { label = 'este item', onSave = null } = {}) {
  const id = useId();
  const ref = useRef({ dirty, label, onSave });
  ref.current = { dirty, label, onSave };
  useEffect(() => {
    guards.set(id, { get dirty() { return ref.current.dirty; }, get label() { return ref.current.label; }, get canSave() { return typeof ref.current.onSave === 'function'; }, save: () => ref.current.onSave?.() });
    return () => { guards.delete(id); };
  }, [id]);
  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);
  return {
    /** Use ao fechar este editor: pergunta só se houver alteração. `proceed` deve fechar o editor (e assim limpar o estado). */
    confirm: (proceed) => requestLeave(proceed, { only: id })
  };
}

/** Diálogo único, montado uma vez no App. */
export function UnsavedHost() {
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  useEffect(() => { host = (a) => { setErro(''); setAsk(a); }; return () => { host = null; }; }, []);
  if (!ask) return null;
  const labels = ask.pending.map(([, g]) => g.label);
  // Sem forma de salvar (ex.: evento novo, em que salvar seria enviar convites), só descartar ou continuar.
  const canSave = ask.pending.every(([, g]) => g.canSave);
  const close = () => setAsk(null);
  return (
    <div className="rx-overlay" style={{ zIndex: 90 }} onClick={close}>
      <div className="rx-dialog" role="alertdialog" aria-modal="true" aria-labelledby="uns-t" onClick={(e) => e.stopPropagation()}>
        <h2 id="uns-t">Deseja sair sem salvar alterações?</h2>
        <p>Você mudou {labels.join(', ')} e ainda não salvou.</p>
        {erro && <p style={{ color: 'var(--rx-bad)' }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="rx-btn ghost" onClick={close} autoFocus>Continuar editando</button>
          <button type="button" className="es-danger" disabled={busy} onClick={() => { const p = ask.proceed; close(); p(); }}>Descartar alterações</button>
          {canSave && <button type="button" className="rx-btn" disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              for (const [, g] of ask.pending) { const ok = await g.save(); if (ok === false) throw new Error('Não foi possível salvar. Confira os campos.'); }
              const p = ask.proceed; close(); p();
            } catch (e) { setErro(e.message); } finally { setBusy(false); }
          }}>Salvar e sair</button>}
        </div>
      </div>
    </div>
  );
}
