/**
 * Proposta 07 (telas): biblioteca (busca pt/en, indicador, duplicado, voltar), mapa corporal, aviso de saída e card da turma.
 * Limite: API simulada; o servidor é testado em tests/api/exercicios.test.ts e no e2e local.
 */
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const LIB = [
  { id: 'fe_barbell_squat', name: 'Agachamento livre com barra', aliases: ['Barbell Squat'], group: 'Pernas', primary: ['quadriceps'], secondary: ['gluteos', 'posteriores'], equipment: 'Barra', metric: 'reps', instructions: ['Desça e suba.'], origin: 'importada' },
  { id: 'fe_romanian_deadlift', name: 'Levantamento terra romeno', aliases: ['Romanian Deadlift'], group: 'Pernas', primary: ['posteriores'], secondary: ['gluteos', 'lombar'], equipment: 'Barra', metric: 'reps', instructions: [], origin: 'importada' }
];
const calls = [];
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (json) => ({ ok: true, status: 200, json: async () => json });
    if (url === '/api/exercicios') return ok({ exercicios: LIB, personalizados: [], podeEditarEspaco: true });
    return ok({ success: true });
  })
}));

const { FichaEditor } = await import('../components/espacos/FichaEditor');
const { aggregateMuscles } = await import('../components/treino/musculos');
const { useUnsavedGuard, UnsavedHost, requestLeave } = await import('../hooks/useUnsavedGuard');
const { TurmaCard } = await import('../components/espacos/TurmaAluno');

function Harness() {
  const [v, setV] = useState({ exercises: [] });
  return <FichaEditor value={v} onChange={setV} fichaName="Treino A" />;
}
const quadClass = () => document.querySelector('[data-testid="mapa-corporal"] [data-m="quadriceps"]').getAttribute('class');

beforeEach(() => { calls.length = 0; });

describe('Biblioteca e mapa na ficha', () => {
  it('busca em inglês, adiciona, mostra ✓, pede confirmação ao repetir e o mapa recalcula', async () => {
    render(<Harness />);
    await waitFor(() => expect(calls.some((c) => c.url === '/api/exercicios')).toBe(true));
    expect(quadClass()).toMatch(/l0/);
    fireEvent.click(screen.getByRole('button', { name: /Abrir biblioteca/ }));
    const bib = await screen.findByRole('dialog', { name: 'Biblioteca de exercícios' });
    fireEvent.change(within(bib).getByLabelText('Buscar exercício'), { target: { value: 'squat' } });
    await waitFor(() => expect(within(bib).getAllByTestId('bl-item')).toHaveLength(1));
    fireEvent.click(within(bib).getByTestId('bl-item'));
    fireEvent.click(within(bib).getByRole('button', { name: /Adicionar à ficha/ }));
    expect(within(bib).getByTestId('bl-mark')).toHaveAttribute('aria-label', 'Já está na ficha');
    expect(quadClass()).toMatch(/l2/);
    fireEvent.click(within(bib).getByRole('button', { name: /Adicionar de novo/ }));
    expect(screen.getByText('Este exercício já está nesta ficha.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Não, manter como está' }));
    expect(within(bib).getByTestId('bl-mark')).toHaveAttribute('aria-label', 'Já está na ficha');
    fireEvent.click(within(bib).getByRole('button', { name: /Adicionar de novo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar novamente' }));
    expect(within(bib).getByTestId('bl-mark')).toHaveTextContent('2');
  });
  it('Voltar fecha a biblioteca e volta para a ficha', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Abrir biblioteca/ }));
    await screen.findByRole('dialog', { name: 'Biblioteca de exercícios' });
    fireEvent.click(screen.getByRole('button', { name: /Voltar para Treino A/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Biblioteca de exercícios' })).toBeNull());
  });
  it('principal prevalece sobre secundário', () => {
    const agg = aggregateMuscles([{ id: 'a', name: 'A', primary: ['gluteos'], secondary: [] }, { id: 'b', name: 'B', primary: ['quadriceps'], secondary: ['gluteos'] }]);
    expect(agg.gluteos.lv).toBe(2);
    expect(agg.gluteos.ex.map((x) => x.name)).toEqual(['A', 'B']);
  });
});

describe('Aviso de saída', () => {
  function Editor({ dirty, onSave }) { useUnsavedGuard(dirty, { label: 'a ficha', onSave }); return null; }
  it('sem alteração não pergunta; com alteração mostra as três opções', async () => {
    const go = vi.fn();
    const { rerender } = render(<><Editor dirty={false} /><UnsavedHost /></>);
    act(() => requestLeave(go));
    expect(go).toHaveBeenCalledTimes(1);
    const save = vi.fn(async () => true);
    rerender(<><Editor dirty onSave={save} /><UnsavedHost /></>);
    act(() => requestLeave(go));
    expect(screen.getByText('Deseja sair sem salvar alterações?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(go).toHaveBeenCalledTimes(1);
    act(() => requestLeave(go));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e sair' }));
    await waitFor(() => expect(go).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenCalled();
    act(() => requestLeave(go));
    fireEvent.click(screen.getByRole('button', { name: 'Descartar alterações' }));
    expect(go).toHaveBeenCalledTimes(3);
  });
});

describe('Card da turma (aluno)', () => {
  it('mostra capa, foto, profissional, treino e novidades', () => {
    const open = vi.fn();
    render(<TurmaCard espaco={{ proName: 'Rafa Torres', modelLabel: 'Personal', spaceName: 'Studio Pulso', fotoUrl: '/api/midia/m_x', avisosNovos: 1, notificacoes: 1 }} turma={{ name: 'Força', capaUrl: '/api/midia/m_y', treino: 'Treino A' }} onOpen={open} onLeave={() => {}} />);
    expect(screen.getByAltText('Foto de Rafa Torres')).toHaveAttribute('src', '/api/midia/m_x');
    expect(screen.getByText('2 novidades')).toBeInTheDocument();
    expect(screen.getByText('Treino A')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Abrir turma/ }));
    expect(open).toHaveBeenCalled();
  });
});
