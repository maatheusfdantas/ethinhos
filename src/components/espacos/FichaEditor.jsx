import React, { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { EXERCISE_LIBRARY_CATALOG } from '../WorkoutTab';
import '../../styles/treino.css';

const blank = () => ({ id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: '', sets: 3, reps: 10, weightKg: 0, restSec: 60, showWeight: true, showRestTimer: true });

/**
 * Editor de exercícios de uma ficha (profissional e pessoa). Mesmos campos do Treino:
 * nome, séries, repetições, carga, descanso e "exibir carga". Biblioteca de 33 exercícios.
 * O servidor valida tudo de novo ao salvar.
 */
export function FichaEditor({ value, onChange }) {
  const exercises = Array.isArray(value?.exercises) ? value.exercises : [];
  const [q, setQ] = useState('');
  const set = (i, patch) => onChange({ exercises: exercises.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return EXERCISE_LIBRARY_CATALOG.filter((e) => `${e.name} ${e.muscle}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q]);
  const addLib = (c) => {
    onChange({ exercises: [...exercises, { id: `ex_lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: c.name, muscle: c.muscle, sets: c.sets || 3, reps: c.reps || 10, weightKg: c.weightKg || 0, restSec: c.restSec || 60, showWeight: (c.weightKg || 0) > 0, showRestTimer: true }] });
    setQ('');
  };
  return (
    <div className="tr">
      {exercises.length === 0 && <p className="tr-sub">Nenhum exercício ainda. Busque na biblioteca ou crie um personalizado.</p>}
      {exercises.map((e, i) => (
        <div className="tr-edit-ex" key={e.id || i}>
          <label>Exercício<input className="tr-input" value={e.name} maxLength={120} onChange={(ev) => set(i, { name: ev.target.value })} /></label>
          <label>Séries<input className="tr-input" inputMode="numeric" value={e.sets} onChange={(ev) => set(i, { sets: ev.target.value })} /></label>
          <label>Repetições<input className="tr-input" inputMode="numeric" value={e.reps} onChange={(ev) => set(i, { reps: ev.target.value })} /></label>
          <label>Carga (kg)<input className="tr-input" inputMode="decimal" value={e.weightKg} onChange={(ev) => set(i, { weightKg: ev.target.value })} /></label>
          <label>Descanso (s)<input className="tr-input" inputMode="numeric" value={e.restSec} onChange={(ev) => set(i, { restSec: ev.target.value })} /></label>
          <label className="chk"><input type="checkbox" checked={e.showWeight !== false} onChange={(ev) => set(i, { showWeight: ev.target.checked })} />Exibir carga</label>
          <button type="button" className="tr-x" aria-label={`Tirar ${e.name || 'exercício'}`} onClick={() => onChange({ exercises: exercises.filter((_, k) => k !== i) })}><X size={16} /></button>
        </div>
      ))}
      <div className="tr-field" style={{ marginTop: 14 }}>
        <label htmlFor="fe-q">Adicionar da biblioteca</label>
        <input id="fe-q" className="tr-input" placeholder="Busque por exercício ou músculo" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      {results.length > 0 && (
        <div className="tr-chips" style={{ marginBottom: 10 }}>
          {results.map((c) => <button key={c.id} type="button" className="tr-chip" onClick={() => addLib(c)}><Plus size={14} />{c.name}</button>)}
        </div>
      )}
      <button type="button" className="rx-btn ghost tiny" onClick={() => onChange({ exercises: [...exercises, blank()] })}><Plus size={15} />Exercício personalizado</button>
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

const isTempo = (e) => /prancha|isom[eé]tric|segundos/i.test(e?.name || '');
export const resumoExercicio = (e) => isTempo(e) ? `${e.sets} × ${e.reps} s` : `${e.sets} × ${e.reps}${e.showWeight !== false && Number(e.weightKg) > 0 ? `, ${String(e.weightKg).replace('.', ',')} kg` : ''}`;
