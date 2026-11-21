import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { espacosApi } from './espacosApi';

const STEPS = ['Destino', 'Revisar destinatários', 'Confirmar envio'];

/**
 * Atribuir uma ficha (proposta 07, item 5): nada é enviado ao criar a ficha.
 * 1. Destino: turma inteira, alunos selecionados (de uma turma ou de todos os vínculos) ou uma pessoa.
 * 2. Revisar: o servidor mostra quem recebe, quem já tem (não duplica) e quem tem cópia adaptada (não muda).
 * 3. Confirmar envio. Cada pessoa recebe uma cópia própria; repetir não duplica (o servidor garante).
 * `groupId` ou `linkIds` só pré-selecionam o destino; o profissional ainda revisa antes de enviar.
 */
export function AtribuirDialog({ groupId = null, linkIds = null, onClose, onDone, toast, initialFichaId = '' }) {
  const [step, setStep] = useState(1);
  const [fichas, setFichas] = useState(null);
  const [fichaId, setFichaId] = useState('');
  const [turmas, setTurmas] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [dest, setDest] = useState(groupId ? 'turma' : linkIds?.length === 1 ? 'individual' : linkIds?.length ? 'selecao' : 'turma');
  const [turmaId, setTurmaId] = useState(groupId || '');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [membros, setMembros] = useState(null);
  const [sel, setSel] = useState(linkIds || []);
  const [previa, setPrevia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([espacosApi.fichas(), espacosApi.meu(), espacosApi.pessoas()]).then(([f, m, p]) => {
      const ativas = (f.fichas || []).filter((x) => x.status === 'ativa');
      setFichas(ativas);
      setFichaId((ativas.find((x) => x.id === initialFichaId) || ativas[0])?.id || '');
      const ts = (m.turmas || []).filter((t) => t.status === 'ativa');
      setTurmas(ts);
      setTurmaId((v) => v || ts[0]?.id || '');
      setPessoas(p.pessoas || []);
      if (!ts.length && !groupId && !linkIds?.length) setDest('selecao');
    }, (e) => { setFichas([]); setErro(e.message); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Alunos de uma turma, para "alunos selecionados" (o vínculo vem da lista de pessoas do próprio espaço).
  useEffect(() => {
    if (!filtroTurma) { setMembros(null); return undefined; }
    let alive = true;
    espacosApi.turma(filtroTurma).then((r) => alive && setMembros((r.membros || []).map((m) => m.username)), () => alive && setMembros([]));
    return () => { alive = false; };
  }, [filtroTurma]);

  const target = dest === 'turma' ? { groupId: turmaId } : { linkIds: sel };
  const valid = fichaId && (dest === 'turma' ? Boolean(turmaId) : dest === 'individual' ? sel.length === 1 : sel.length > 0);
  const visiveis = membros ? pessoas.filter((p) => membros.includes(p.username)) : pessoas;
  const fichaNome = fichas?.find((f) => f.id === fichaId)?.name || 'a ficha';
  const destinoTxt = dest === 'turma' ? `a turma ${turmas.find((t) => t.id === turmaId)?.name || ''}` : dest === 'individual' ? (pessoas.find((p) => p.linkId === sel[0])?.name || 'uma pessoa') : `${sel.length} ${sel.length === 1 ? 'aluno selecionado' : 'alunos selecionados'}`;

  const revisar = async () => {
    setBusy(true); setErro('');
    try { setPrevia((await espacosApi.atribuir({ templateId: fichaId, ...target, preview: true })).previa); setStep(2); } catch (e) { setErro(e.message); } finally { setBusy(false); }
  };
  const enviar = async () => {
    if (busy) return;
    setBusy(true); setErro('');
    try {
      const r = await espacosApi.atribuir({ templateId: fichaId, ...target });
      toast?.(r.created ? `Enviada a ${r.created} ${r.created === 1 ? 'pessoa' : 'pessoas'}.${r.skipped ? ` ${r.skipped} já tinham.` : ''}` : 'Todos já tinham esta ficha. Nada foi duplicado.');
      onDone?.();
    } catch (e) { setErro(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="atr-t" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h2 id="atr-t">Atribuir {fichaNome}</h2>
        <ol className="es-steps" aria-label="Etapas">{STEPS.map((s, i) => <li key={s} aria-current={step === i + 1 ? 'step' : undefined}>{i + 1}. {s}</li>)}</ol>
        {fichas === null ? <p className="es-sub">Carregando…</p> : fichas.length === 0 ? (
          <div className="es-note"><Info size={16} /><span>Você ainda não tem fichas. Crie uma em “Fichas e programas”.</span></div>
        ) : step === 1 ? (
          <>
            <div className="es-field"><label htmlFor="atr-f">Ficha</label>
              <select id="atr-f" className="es-input" value={fichaId} onChange={(e) => setFichaId(e.target.value)}>{fichas.map((f) => <option key={f.id} value={f.id}>{f.name} (versão {f.version})</option>)}</select>
            </div>
            <div className="es-radio" role="radiogroup" aria-label="Destino">
              <label><input type="radio" name="atr-d" checked={dest === 'turma'} disabled={!turmas.length} onChange={() => setDest('turma')} /><span>Turma inteira<small>Uma cópia por pessoa da turma.{turmas.length ? '' : ' Você ainda não tem turma ativa.'}</small></span></label>
              <label><input type="radio" name="atr-d" checked={dest === 'selecao'} onChange={() => { setDest('selecao'); setSel([]); }} /><span>Alunos selecionados<small>Escolha quem recebe, de uma turma ou entre todos os seus vínculos.</small></span></label>
              <label><input type="radio" name="atr-d" checked={dest === 'individual'} onChange={() => { setDest('individual'); setSel([]); }} /><span>Uma pessoa<small>Só para um aluno.</small></span></label>
            </div>
            {dest === 'turma' && turmas.length > 0 && (
              <div className="es-field" style={{ marginTop: 12 }}><label htmlFor="atr-g">Turma</label><select id="atr-g" className="es-input" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>{turmas.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.members} {t.members === 1 ? 'pessoa' : 'pessoas'})</option>)}</select></div>
            )}
            {dest === 'selecao' && (
              <>
                {turmas.length > 0 && <div className="es-field" style={{ marginTop: 12 }}><label htmlFor="atr-ft">Mostrar alunos de</label><select id="atr-ft" className="es-input" value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}><option value="">Todos os vínculos</option>{turmas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
                {visiveis.length === 0 ? <p className="es-sub">Ninguém aqui ainda.</p> : (
                  <div className="es-radio" style={{ marginTop: 8 }}>{visiveis.map((p) => (
                    <label key={p.linkId}><input type="checkbox" checked={sel.includes(p.linkId)} onChange={(e) => setSel(e.target.checked ? [...sel, p.linkId] : sel.filter((x) => x !== p.linkId))} /><span>{p.name}<small>@{p.username}</small></span></label>
                  ))}</div>
                )}
              </>
            )}
            {dest === 'individual' && (
              <div className="es-field" style={{ marginTop: 12 }}><label htmlFor="atr-p">Pessoa</label><select id="atr-p" className="es-input" value={sel[0] || ''} onChange={(e) => setSel(e.target.value ? [e.target.value] : [])}><option value="">Escolha…</option>{pessoas.map((p) => <option key={p.linkId} value={p.linkId}>{p.name} (@{p.username})</option>)}</select></div>
            )}
          </>
        ) : step === 2 ? (
          previa && (
            <div data-testid="atr-previa">
              <p><b>{previa.novos} de {previa.total} {previa.total === 1 ? 'pessoa recebe' : 'pessoas recebem'} uma cópia</b> ({destinoTxt}).</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 14, color: 'var(--rx-ink-2)' }}>
                {previa.pessoas.map((p) => <li key={p.name}>{p.name}{p.already ? (p.adapted ? ': já tem, adaptada (não muda)' : ': já tem (não duplica)') : ': recebe'}</li>)}
              </ul>
            </div>
          )
        ) : (
          <div className="es-note"><Info size={16} /><span>Enviar {fichaNome} para {destinoTxt}: {previa?.novos || 0} {previa?.novos === 1 ? 'pessoa recebe' : 'pessoas recebem'}. Cada uma ganha uma cópia própria; depois você pode personalizar a de alguém sem mudar a ficha-base nem os colegas. Sessões já feitas não mudam.</span></div>
        )}
        {erro && <div className="es-error" role="alert" style={{ marginTop: 12 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
          <button type="button" className="rx-btn ghost" onClick={step === 1 ? onClose : () => setStep(step - 1)}>{step === 1 ? 'Cancelar' : 'Voltar'}</button>
          {step === 1 && <button type="button" className="rx-btn" disabled={busy || !valid} onClick={revisar}>Revisar destinatários</button>}
          {step === 2 && <button type="button" className="rx-btn" disabled={!previa || previa.novos === 0} onClick={() => setStep(3)}>{previa && previa.novos === 0 ? 'Todos já têm' : 'Continuar'}</button>}
          {step === 3 && <button type="button" className="rx-btn" disabled={busy} onClick={enviar}>Enviar para {previa?.novos || 0}</button>}
        </div>
      </div>
    </div>
  );
}
