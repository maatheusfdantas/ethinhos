import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Plus, Search } from 'lucide-react';
import { bibliotecaApi, loadBiblioteca } from './bibliotecaApi';
import { CorpoExercicio } from './MapaCorporal';
import { matchesExercise, MUSCLES, MUSCLE_KEYS } from './musculos';
import '../../styles/treino.css';

// Busca e filtro ficam guardados ao voltar e reabrir (proposta 07, "preservar filtros").
const memo = { q: '', group: 'Todos', sel: null };

/**
 * Biblioteca de exercícios (tela própria, por cima da ficha).
 * - "Voltar" claro; Esc e o voltar do navegador também fecham e devolvem à ficha.
 * - Indicador: ✓ quando o exercício está na ficha uma vez; número quando está mais de uma.
 * - Repetir um exercício pede confirmação ("Deseja adicioná-lo novamente?") sem bloquear repetição intencional.
 * - Personalizado: exige ao menos um músculo principal (decisão 6). `escopo`: 'espaco' (Personal) ou 'pessoa'.
 */
export function Biblioteca({ fichaName = 'a ficha', counts = {}, onAdd, onRemoveLast, onClose, escopo = 'pessoa', toast }) {
  const [lib, setLib] = useState(null);
  const [erro, setErro] = useState('');
  const [q, setQ] = useState(memo.q);
  const [group, setGroup] = useState(memo.group);
  const [sel, setSel] = useState(memo.sel);
  const [dup, setDup] = useState(null);
  const [custom, setCustom] = useState(null);
  const [fix, setFix] = useState(null);
  const [busy, setBusy] = useState(false);
  const closing = useRef(false);

  useEffect(() => { loadBiblioteca().then(setLib, (e) => setErro(e.message)); }, []);
  useEffect(() => { memo.q = q; memo.group = group; memo.sel = sel; }, [q, group, sel]);

  // Voltar do navegador: abrir a biblioteca empilha uma entrada no histórico; voltar fecha.
  useEffect(() => {
    window.history.pushState({ ethosBiblioteca: true }, '');
    const onPop = () => { if (!closing.current) { closing.current = true; onClose?.(); } };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const voltar = () => {
    if (window.history.state?.ethosBiblioteca) window.history.back();
    else if (!closing.current) { closing.current = true; onClose?.(); }
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !dup && !custom) voltar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => (lib ? [...lib.personalizados, ...lib.exercicios] : []), [lib]);
  const groups = useMemo(() => ['Todos', ...new Set(all.map((e) => e.group))], [all]);
  const list = useMemo(() => all.filter((e) => (group === 'Todos' || e.group === group) && matchesExercise(e, q)), [all, group, q]);
  const selected = all.find((e) => e.id === sel) || null;
  const add = (e) => { if (counts[e.id]) setDup(e); else { onAdd(e); toast?.(`${e.name} entrou na ficha. Salve para guardar.`); } };

  return (
    <div className="bl-screen" role="dialog" aria-modal="true" aria-labelledby="bl-t">
      <div className="bl-wrap">
        <button type="button" className="rx-btn ghost tiny" onClick={voltar}><ArrowLeft size={15} />Voltar para {fichaName}</button>
        <div className="bl-head">
          <div><h2 id="bl-t">Biblioteca de exercícios</h2><p className="tr-sub">{lib ? `${lib.exercicios.length} exercícios${lib.personalizados.length ? ` e ${lib.personalizados.length} personalizados` : ''}. Busque em português ou inglês.` : ''}</p></div>
          <button type="button" className="rx-btn ghost" onClick={() => setCustom({ name: '', primary: [], secondary: [], equipment: '', metric: 'reps', instructions: '' })}><Plus size={16} />Exercício personalizado</button>
        </div>
        {erro && <div className="tr-error">{erro}</div>}
        <div className="bl-grid">
          <section className="bl-card">
            <label className="bl-search"><Search size={16} aria-hidden="true" /><input type="search" placeholder="Busque em português ou inglês: supino, squat, glúteos…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar exercício" /></label>
            <div className="tr-chips" role="group" aria-label="Grupo muscular" style={{ margin: '10px 0' }}>
              {groups.map((g) => <button key={g} type="button" className="tr-chip" aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>)}
            </div>
            {!lib ? <p className="tr-sub">Carregando a biblioteca…</p> : list.length === 0 ? <p className="tr-sub">Nada encontrado. Tente outro termo ou crie um exercício personalizado.</p> : (
              <ul className="bl-list">
                {list.slice(0, 120).map((e) => {
                  const n = counts[e.id] || 0;
                  return (
                    <li key={e.id}>
                      <button type="button" className="bl-item" aria-current={sel === e.id ? 'true' : undefined} onClick={() => setSel(e.id)} data-testid="bl-item">
                        <span className="bl-thumb"><CorpoExercicio exercise={e} thumb /></span>
                        <span className="bl-txt"><b>{e.name}</b><small>{[e.aliases?.[0], e.equipment, e.origin === 'personalizada' ? 'personalizado' : null].filter(Boolean).join(', ')}</small></span>
                        <span className={`bl-mark ${n ? 'on' : ''}`} aria-label={n === 0 ? 'Não está na ficha' : n === 1 ? 'Já está na ficha' : `Está ${n} vezes na ficha`} data-testid="bl-mark">{n === 1 ? <Check size={15} strokeWidth={3} /> : n > 1 ? n : ''}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {list.length > 120 && <p className="tr-sub">Mostrando 120 de {list.length}. Refine a busca.</p>}
          </section>
          <aside className="bl-card bl-detail">
            {!selected ? <p className="tr-sub">Escolha um exercício para ver os músculos e adicionar.</p> : (
              <>
                <h3>{selected.name}</h3>
                <p className="tr-sub">{[selected.aliases?.[0], selected.group, selected.equipment, selected.level].filter(Boolean).join(', ')}</p>
                <CorpoExercicio exercise={selected} />
                <p className="bl-ms"><span className="bl-tag p">Principais</span>{selected.primary.map((k) => MUSCLES[k]).join(', ') || 'não definidos'}</p>
                <p className="bl-ms"><span className="bl-tag">Secundários</span>{selected.secondary.map((k) => MUSCLES[k]).join(', ') || 'nenhum'}</p>
                {selected.instructions?.length > 0 && <ol className="bl-how">{selected.instructions.map((t, i) => <li key={i}>{t}</li>)}</ol>}
                <button type="button" className="rx-btn" style={{ width: '100%' }} onClick={() => add(selected)}><Plus size={16} />{counts[selected.id] ? 'Adicionar de novo à ficha' : 'Adicionar à ficha'}</button>
                {counts[selected.id] > 0 && <button type="button" className="rx-btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => onRemoveLast(selected.id)}>Tirar da ficha ({counts[selected.id]}×)</button>}
                <p className="tr-sub" style={{ marginTop: 10 }}>{selected.origin === 'personalizada' ? `Personalizado ${selected.scope === 'espaco' ? 'do seu espaço' : 'seu'}.` : `Base Free Exercise DB (domínio público), nome em português pelo Ethos${selected.reviewed ? '' : ', em revisão'}.`}{selected.originalName ? ` Nome original: ${selected.originalName}.` : ''}</p>
                {selected.origin === 'importada' && escopo === 'espaco' && lib?.podeEditarEspaco && (
                  fix?.id === selected.id ? (
                    <form className="bl-fix" onSubmit={async (ev) => { ev.preventDefault(); setBusy(true); try { await bibliotecaApi.corrigirNome(selected.id, fix.name); setLib(await loadBiblioteca({ force: true })); setFix(null); toast?.('Nome corrigido no seu espaço.'); } catch (err) { toast?.(err.message); } finally { setBusy(false); } }}>
                      <input className="tr-input" aria-label="Nome corrigido" maxLength={80} value={fix.name} onChange={(e) => setFix({ ...fix, name: e.target.value })} />
                      <button type="submit" className="rx-btn tiny" disabled={busy}>Salvar nome</button><button type="button" className="rx-btn ghost tiny" onClick={() => setFix(null)}>Cancelar</button>
                    </form>
                  ) : <button type="button" className="rx-link" onClick={() => setFix({ id: selected.id, name: selected.name })}>Corrigir o nome no meu espaço</button>
                )}
              </>
            )}
          </aside>
        </div>
      </div>

      {dup && (
        <div className="rx-overlay" onClick={() => setDup(null)}>
          <div className="rx-dialog" role="alertdialog" aria-modal="true" aria-labelledby="bl-dup-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="bl-dup-t">Este exercício já está nesta ficha.</h2>
            <p>{dup.name} aparece {counts[dup.id]}× em {fichaName}. Deseja adicioná-lo novamente? A nova ocorrência entra no fim, com posição própria.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setDup(null)}>Não, manter como está</button>
              <button type="button" className="rx-btn" onClick={() => { onAdd(dup); setDup(null); toast?.(`${dup.name} adicionado de novo.`); }}>Adicionar novamente</button>
            </div>
          </div>
        </div>
      )}

      {custom && (
        <div className="rx-overlay" onClick={() => setCustom(null)}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="bl-c-t" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onSubmit={async (ev) => {
            ev.preventDefault();
            setBusy(true);
            try {
              const r = await bibliotecaApi.criarPersonalizado({ escopo, name: custom.name, primary: custom.primary, secondary: custom.secondary, equipment: custom.equipment, metric: custom.metric, instructions: custom.instructions ? [custom.instructions] : [] });
              setLib(await loadBiblioteca({ force: true }));
              setSel(r.exercicio.id); setCustom(null); setGroup('Todos'); setQ('');
              toast?.('Exercício personalizado criado.');
            } catch (err) { toast?.(err.message); } finally { setBusy(false); }
          }}>
            <h2 id="bl-c-t">Exercício personalizado</h2>
            <p>{escopo === 'espaco' ? 'Fica no seu espaço' : 'Fica só com você'} Escolha ao menos um músculo principal.</p>
            <div className="tr-field"><label htmlFor="bl-cn">Nome</label><input id="bl-cn" className="tr-input" maxLength={80} placeholder="Ex.: Remada no TRX" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></div>
            <div className="tr-field"><span className="lbl">Músculos principais (obrigatório)</span>
              <div className="tr-chips">{MUSCLE_KEYS.map((k) => <button key={k} type="button" className="tr-chip" aria-pressed={custom.primary.includes(k)} onClick={() => setCustom((c) => ({ ...c, primary: c.primary.includes(k) ? c.primary.filter((x) => x !== k) : [...c.primary, k], secondary: c.secondary.filter((x) => x !== k) }))}>{MUSCLES[k]}</button>)}</div></div>
            <div className="tr-field"><span className="lbl">Secundários (opcional)</span>
              <div className="tr-chips">{MUSCLE_KEYS.filter((k) => !custom.primary.includes(k)).map((k) => <button key={k} type="button" className="tr-chip" aria-pressed={custom.secondary.includes(k)} onClick={() => setCustom((c) => ({ ...c, secondary: c.secondary.includes(k) ? c.secondary.filter((x) => x !== k) : [...c.secondary, k] }))}>{MUSCLES[k]}</button>)}</div></div>
            {custom.primary.length > 0 ? <div style={{ maxWidth: 260, margin: '0 auto 10px' }}><CorpoExercicio exercise={{ id: 'novo', name: custom.name, primary: custom.primary, secondary: custom.secondary }} /></div> : <p className="tr-sub">Sem músculo principal, o exercício não pode ser criado.</p>}
            <div className="tr-field"><label htmlFor="bl-ce">Equipamento (opcional)</label><input id="bl-ce" className="tr-input" maxLength={40} value={custom.equipment} onChange={(e) => setCustom({ ...custom, equipment: e.target.value })} /></div>
            <div className="tr-field"><span className="lbl">Medida</span><div className="tr-chips">{[['reps', 'Repetições'], ['tempo', 'Tempo (segundos)']].map(([k, l]) => <button key={k} type="button" className="tr-chip" aria-pressed={custom.metric === k} onClick={() => setCustom({ ...custom, metric: k })}>{l}</button>)}</div></div>
            <div className="tr-field"><label htmlFor="bl-ci">Instrução (opcional)</label><textarea id="bl-ci" className="tr-input" style={{ height: 70, paddingTop: 10 }} maxLength={300} value={custom.instructions} onChange={(e) => setCustom({ ...custom, instructions: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="rx-btn ghost" onClick={() => setCustom(null)}>Cancelar</button><button type="submit" className="rx-btn" disabled={busy || !custom.name.trim() || !custom.primary.length}>Criar exercício</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
