import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Link2, Plus, X } from 'lucide-react';
import { Biblioteca } from '../treino/Biblioteca';
import { MapaCorporal } from '../treino/MapaCorporal';
import { findExercise, loadBiblioteca } from '../treino/bibliotecaApi';
import { MUSCLES, normalizeSearch } from '../treino/musculos';
import '../../styles/treino.css';

const newId = () => `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const blank = () => ({ id: newId(), name: '', sets: 3, reps: 10, weightKg: 0, restSec: 60, showWeight: true, showRestTimer: true });

/**
 * Editor de exercícios de uma ficha (profissional e pessoa), proposta 07:
 * - Biblioteca própria em tela separada (com Voltar), indicador de "já está na ficha" e confirmação de repetição.
 * - Mapa corporal da ficha ao lado: recalcula ao adicionar, tirar ou reordenar.
 * - Cada item guarda `libraryId` (fe_* ou pz_*); itens antigos só com nome continuam valendo e aparecem como
 *   "sem músculos definidos", com atalho para ligar à biblioteca quando o nome corresponde exatamente.
 * Mesmos campos do Treino (séries, repetições, carga, descanso, exibir carga). O servidor valida tudo ao salvar.
 */
export function FichaEditor({ value, onChange, escopo = 'espaco', fichaName = 'a ficha', toast }) {
  const exercises = Array.isArray(value?.exercises) ? value.exercises : [];
  const [lib, setLib] = useState(null);
  const [aberta, setAberta] = useState(false);
  useEffect(() => { loadBiblioteca().then(setLib, () => setLib({ exercicios: [], personalizados: [] })); }, [aberta]);

  const set = (i, patch) => onChange({ exercises: exercises.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  const move = (i, d) => { const arr = [...exercises]; [arr[i], arr[i + d]] = [arr[i + d], arr[i]]; onChange({ exercises: arr }); };
  const counts = useMemo(() => exercises.reduce((m, e) => { if (e.libraryId) m[e.libraryId] = (m[e.libraryId] || 0) + 1; return m; }, {}), [exercises]);
  const resolved = exercises.map((e) => findExercise(lib, e.libraryId));
  const semMusculos = resolved.filter((r) => !r || !r.primary?.length).length;
  const byName = useMemo(() => {
    const m = new Map();
    for (const x of [...(lib?.exercicios || []), ...(lib?.personalizados || [])]) for (const n of [x.name, ...(x.aliases || [])]) m.set(normalizeSearch(n).trim(), x);
    return m;
  }, [lib]);

  const addFromLib = (x) => onChange({ exercises: [...exercises, {
    id: newId(), libraryId: x.id, name: x.name, muscle: x.primary?.[0] ? MUSCLES[x.primary[0]] : '',
    sets: 3, reps: x.metric === 'tempo' ? 30 : 10, weightKg: 0, restSec: 60, showWeight: x.metric !== 'tempo', showRestTimer: true
  }] });
  const removeLast = (libId) => { const i = exercises.map((e) => e.libraryId).lastIndexOf(libId); if (i >= 0) onChange({ exercises: exercises.filter((_, k) => k !== i) }); };

  return (
    <div className="tr fi-grid">
      <div>
        {exercises.length === 0 && <p className="tr-sub">Nenhum exercício ainda. Abra a biblioteca para adicionar.</p>}
        {exercises.map((e, i) => {
          const x = resolved[i];
          const rep = e.libraryId && counts[e.libraryId] > 1;
          const sugest = !x && e.name ? byName.get(normalizeSearch(e.name).trim()) : null;
          return (
            <div className="fi-row" key={e.id || i} data-testid="fi-row">
              <span className="n">{i + 1}</span>
              <div>
                {x ? <b>{e.name || x.name}</b> : <input className="tr-input" style={{ height: 38 }} aria-label={`Nome do exercício ${i + 1}`} value={e.name} maxLength={120} placeholder="Nome do exercício" onChange={(ev) => set(i, { name: ev.target.value })} />}
                {rep && <span className="fi-tag">repetido</span>}
                <small>{x?.primary?.length ? x.primary.map((k) => MUSCLES[k]).join(', ') : 'Sem músculos definidos (fora do mapa)'}</small>
                {sugest && <button type="button" className="rx-link" onClick={() => set(i, { libraryId: sugest.id })}><Link2 size={13} /> Ligar a “{sugest.name}” da biblioteca</button>}
                <div className="fi-nums">
                  <label>Séries<input inputMode="numeric" value={e.sets} onChange={(ev) => set(i, { sets: ev.target.value })} aria-label={`Séries de ${e.name || 'exercício'}`} /></label>
                  <label>{x?.metric === 'tempo' ? 'Segundos' : 'Repetições'}<input inputMode="numeric" value={e.reps} onChange={(ev) => set(i, { reps: ev.target.value })} aria-label={`${x?.metric === 'tempo' ? 'Segundos' : 'Repetições'} de ${e.name || 'exercício'}`} /></label>
                  <label>Carga (kg)<input inputMode="decimal" value={e.weightKg} onChange={(ev) => set(i, { weightKg: ev.target.value })} aria-label={`Carga de ${e.name || 'exercício'}`} /></label>
                  <label>Descanso (s)<input inputMode="numeric" value={e.restSec} onChange={(ev) => set(i, { restSec: ev.target.value })} aria-label={`Descanso de ${e.name || 'exercício'}`} /></label>
                  <label className="chk"><input type="checkbox" checked={e.showWeight !== false} onChange={(ev) => set(i, { showWeight: ev.target.checked })} />Exibir carga</label>
                </div>
              </div>
              <div className="fi-acts">
                <button type="button" aria-label={`Subir ${e.name || 'exercício'}`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
                <button type="button" aria-label={`Descer ${e.name || 'exercício'}`} disabled={i === exercises.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
                <button type="button" aria-label={`Tirar ${e.name || 'exercício'}`} onClick={() => onChange({ exercises: exercises.filter((_, k) => k !== i) })}><X size={16} /></button>
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" className="rx-btn" onClick={() => setAberta(true)}><BookOpen size={16} />Abrir biblioteca de exercícios</button>
          <button type="button" className="rx-btn ghost tiny" onClick={() => onChange({ exercises: [...exercises, blank()] })}><Plus size={15} />Exercício só com nome</button>
        </div>
      </div>
      <MapaCorporal exercises={resolved.filter(Boolean).map((x) => ({ id: x.id, name: x.name, primary: x.primary, secondary: x.secondary }))} semMusculos={semMusculos} />
      {aberta && <Biblioteca fichaName={fichaName} counts={counts} escopo={escopo} toast={toast} onAdd={addFromLib} onRemoveLast={removeLast} onClose={() => setAberta(false)} />}
    </div>
  );
}

/** Para enviar ao servidor: números de verdade e sem linhas vazias. */
export function normalizeFicha(value) {
  return {
    exercises: (value?.exercises || []).filter((e) => String(e.name || '').trim()).map((e) => ({
      ...e,
      name: String(e.name).trim(),
      sets: Number(e.sets) || 1,
      reps: Number(e.reps) || 0,
      weightKg: Number(String(e.weightKg).replace(',', '.')) || 0,
      restSec: Number(e.restSec) || 0
    }))
  };
}

const isTempo = (e) => /prancha|isom[eé]tric|segundos|alongamento/i.test(e?.name || '');
export const resumoExercicio = (e) => isTempo(e) ? `${e.sets} × ${e.reps} s` : `${e.sets} × ${e.reps}${e.showWeight !== false && Number(e.weightKg) > 0 ? `, ${String(e.weightKg).replace('.', ',')} kg` : ''}`;
