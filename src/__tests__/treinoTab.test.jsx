/**
 * Treino redesenhado (lote D1): o que o módulo antigo fazia continua funcionando na tela nova.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const calls = [];
const state = { open: null, sets: [] };
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url, method, body });
    const ok = (json) => ({ ok: true, status: 200, json: async () => json });
    const session = () => ({ ...state.open, sets: state.sets, elapsedMs: 1000 });
    if (url.startsWith('/api/treino/historico')) return ok({ sessions: [], exercises: [] });
    if (url === '/api/treino/sessao-aberta') return ok({ session: state.open ? session() : null });
    if (url.startsWith('/api/treino/ultimas')) return ok({ last: { ex_1: { weightKg: 42.5, reps: 8 } } });
    if (url === '/api/treino/sessoes' && method === 'POST') {
      state.open = { id: body.id, name: body.name, workoutRef: body.workoutRef, content: body.content, plannedSets: 2, status: 'em_andamento', startedAt: new Date().toISOString(), pausedAt: null, pausedMs: 0 };
      return ok({ session: session() });
    }
    if (url.endsWith('/series') && method === 'PUT') {
      state.sets = [...state.sets.filter((s) => !(s.exerciseKey === body.exerciseKey && s.setNo === body.setNo)), body];
      return ok({ session: session() });
    }
    if (url.endsWith('/finalizar')) {
      const s = { ...session(), status: state.sets.length >= 2 ? 'concluida' : 'incompleta' };
      state.open = null;
      return ok({ session: s });
    }
    return ok({});
  })
}));

const { TreinoTab } = await import('../components/treino/TreinoTab');

const FICHA = { id: 'wo_1', name: 'Treino A', subtitle: 'Pernas', theme: 'blue', scheduledDays: [1, 3], scheduledTime: '18:30', exercises: [{ id: 'ex_1', name: 'Agachamento', sets: 2, reps: 8, weightKg: 40, restSec: 0, showWeight: true, showRestTimer: true }] };

function Harness({ initial, onComplete }) {
  const [workouts, setWorkouts] = useState(initial);
  return <><TreinoTab workouts={workouts} setWorkouts={setWorkouts} onCompleteWorkout={onComplete} user={{ id: 'u1' }} showToast={() => {}} /><output data-testid="state">{JSON.stringify(workouts)}</output></>;
}
const saved = () => JSON.parse(screen.getByTestId('state').textContent);

beforeEach(() => {
  calls.length = 0;
  state.open = null;
  state.sets = [];
});

describe('Treino redesenhado', () => {
  it('conta nova: estado vazio leva a criar a primeira ficha', () => {
    render(<Harness initial={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Criar primeira ficha/i }));
    fireEvent.change(screen.getByLabelText('Nome da ficha'), { target: { value: 'Minha ficha' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar ficha/i }));
    expect(saved()[0]).toMatchObject({ name: 'Minha ficha', theme: 'orange', scheduledDays: [1], scheduledTime: '18:30' });
  });

  it('editar: dias, horário, estilo do card e exercício personalizado são salvos', () => {
    render(<Harness initial={[FICHA]} />);
    fireEvent.click(screen.getByRole('button', { name: /^Editar$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Sex' }));
    fireEvent.click(screen.getByRole('button', { name: /Verde Foco/i }));
    fireEvent.click(screen.getByRole('button', { name: /Exercício personalizado/i }));
    const inputs = screen.getAllByLabelText('Exercício');
    fireEvent.change(inputs[1], { target: { value: 'Prancha' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar ficha/i }));
    const w = saved()[0];
    expect(w.scheduledDays).toEqual([1, 3, 5]);
    expect(w.theme).toBe('green');
    expect(w.exercises.map((e) => e.name)).toEqual(['Agachamento', 'Prancha']);
  });

  it('excluir ficha pede confirmação e funciona mesmo com uma só', () => {
    render(<Harness initial={[FICHA]} />);
    fireEvent.click(screen.getByTitle('Excluir ficha de treino'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Excluir ficha/i }));
    expect(saved()).toEqual([]);
  });

  it('biblioteca: busca e coloca o exercício na ficha', () => {
    render(<Harness initial={[FICHA]} />);
    fireEvent.click(screen.getByRole('button', { name: /Biblioteca/i }));
    fireEvent.change(screen.getByLabelText(/Buscar exercício ou músculo/i), { target: { value: 'Supino Reto' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Colocar na ficha/i })[0]);
    expect(saved()[0].exercises.map((e) => e.name)).toContain('Supino Reto com Barra');
  });

  it('treino ativo: inicia no servidor, sugere a última carga, salva a série e finaliza com +50 pts', async () => {
    const onComplete = vi.fn();
    render(<Harness initial={[FICHA]} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /Iniciar treino/i }));
    await screen.findByText(/Em andamento/);
    expect(calls.find((c) => c.url === '/api/treino/sessoes').body.content.exercises[0].id).toBe('ex_1');
    const kg = screen.getByLabelText('Carga (kg)');
    expect(kg.value).toBe('42,5');
    expect(kg.className).toMatch(/sug/);
    fireEvent.click(screen.getByRole('button', { name: /Concluir série 1/i }));
    await waitFor(() => expect(screen.getByTestId('tr-sets-done').textContent).toBe('1'));
    expect(calls.find((c) => c.url.endsWith('/series')).body).toMatchObject({ exerciseKey: 'ex_1', setNo: 1, weightKg: 42.5, reps: 8, metric: 'kg' });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar treino/i }));
    fireEvent.click(screen.getByRole('button', { name: /Finalizar agora/i }));
    await screen.findByText(/registrado como incompleto/i);
    expect(onComplete).toHaveBeenCalledWith('Treino A');
  });
});
