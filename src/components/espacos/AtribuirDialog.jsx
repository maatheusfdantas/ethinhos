import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { espacosApi } from './espacosApi';

/**
 * Atribuir uma ficha a uma turma (uma cópia por pessoa) ou a pessoas.
 * Sempre mostra quem recebe antes de confirmar. Repetir não duplica (o servidor garante).
 */
export function AtribuirDialog({ groupId = null, linkIds = null, alvo, onClose, onDone, toast, initialFichaId = '' }) {
  const [fichas, setFichas] = useState(null);
  const [fichaId, setFichaId] = useState('');
  const [previa, setPrevia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    espacosApi.fichas().then((r) => {
      const ativas = (r.fichas || []).filter((f) => f.status === 'ativa');
      setFichas(ativas);
      const first = ativas.find((f) => f.id === initialFichaId) || ativas[0];
      if (first) setFichaId(first.id);
    }, (e) => { setFichas([]); setErro(e.message); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const target = groupId ? { groupId } : { linkIds };
  useEffect(() => {
    if (!fichaId) { setPrevia(null); return; }
    let alive = true;
    setErro('');
    espacosApi.atribuir({ templateId: fichaId, ...target, preview: true }).then((r) => alive && setPrevia(r.previa), (e) => { if (alive) { setPrevia(null); setErro(e.message); } });
    return () => { alive = false; };
  }, [fichaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await espacosApi.atribuir({ templateId: fichaId, ...target });
      toast?.(r.created ? `Ficha atribuída a ${r.created} ${r.created === 1 ? 'pessoa' : 'pessoas'}.${r.skipped ? ` ${r.skipped} já tinham.` : ''}` : 'Todos já tinham esta ficha. Nada foi duplicado.');
      onDone?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="atr-t" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h2 id="atr-t">Atribuir ficha</h2>
        <p>Para {alvo}. Confira quem recebe antes de confirmar.</p>
        {fichas === null ? <p className="es-sub">Carregando fichas…</p> : fichas.length === 0 ? (
          <div className="es-note"><Info size={16} /><span>Você ainda não tem fichas. Crie uma em “Fichas e programas”.</span></div>
        ) : (
          <>
            <div className="es-field"><label htmlFor="atr-f">Ficha</label>
              <select id="atr-f" className="es-input" value={fichaId} onChange={(e) => setFichaId(e.target.value)}>
                {fichas.map((f) => <option key={f.id} value={f.id}>{f.name} (versão {f.version})</option>)}
              </select>
            </div>
            {previa && (
              <div className="es-card" style={{ boxShadow: 'none', padding: '12px 14px', marginBottom: 12 }} data-testid="atr-previa">
                <b>{previa.novos} de {previa.total} {previa.total === 1 ? 'pessoa recebe' : 'pessoas recebem'} uma cópia</b>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 14, color: 'var(--rx-ink-2)' }}>
                  {previa.pessoas.map((p) => <li key={p.name}>{p.name}{p.already ? (p.adapted ? ': já tem, adaptada (não muda)' : ': já tem (não duplica)') : ''}</li>)}
                </ul>
              </div>
            )}
            <div className="es-note"><Info size={16} /><span>Cada pessoa recebe uma cópia própria. Adaptar a de alguém não muda as outras. Ela aparece em “Do seu personal”, no Treino.</span></div>
          </>
        )}
        {erro && <div className="es-error" role="alert" style={{ marginTop: 12 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
          <button type="button" className="rx-btn ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="rx-btn" onClick={confirm} disabled={busy || !previa || previa.novos === 0}>{previa && previa.novos > 0 ? `Atribuir a ${previa.novos}` : 'Atribuir'}</button>
        </div>
      </div>
    </div>
  );
}
