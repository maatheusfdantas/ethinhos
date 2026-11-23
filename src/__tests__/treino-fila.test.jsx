import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TreinoAtivo } from '../components/treino/TreinoAtivo';
import { treinoApi } from '../components/treino/treinoApi';

describe('TreinoAtivo - Fila de exercícios e visão geral da ficha', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockSession = {
    id: 'sess_1',
    name: 'Treino A - Peito e Tríceps',
    elapsedMs: 120000,
    sets: [
      // Exercício 1 já completou suas 2 séries
      { id: 's1', exerciseKey: 'ex_1', exerciseName: 'Supino Reto', setNo: 1, reps: 10, weightKg: 60, metric: 'kg' },
      { id: 's2', exerciseKey: 'ex_1', exerciseName: 'Supino Reto', setNo: 2, reps: 10, weightKg: 60, metric: 'kg' }
    ],
    content: {
      exercises: [
        { id: 'ex_1', name: 'Supino Reto', sets: 2, reps: 10, weightKg: 60, restSec: 60 },
        { id: 'ex_2', name: 'Crucifixo Inclinado', sets: 2, reps: 12, weightKg: 20, restSec: 60 },
        { id: 'ex_3', name: 'Tríceps Corda', sets: 3, reps: 12, weightKg: 25, restSec: 45 }
      ]
    }
  };

  it('mostra a ficha completa com todos os exercícios previstos abertos para marcar e seção de já feitos', () => {
    render(<TreinoAtivo session={mockSession} onChange={vi.fn()} onFinished={vi.fn()} onDiscarded={vi.fn()} />);

    // Todos os exercícios previstos aparecem simultaneamente na ficha completa (sem precisar passar pro lado)
    expect(screen.getByTestId('tr-ex-card-ex_2')).toBeDefined();
    expect(screen.getByTestId('tr-ex-card-ex_3')).toBeDefined();
    expect(screen.getByRole('button', { name: /Concluir série 1 de Crucifixo Inclinado/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Concluir série 1 de Tríceps Corda/i })).toBeDefined();

    // Deve exibir o resumo de exercícios concluídos e a seção de já feitos
    expect(screen.getAllByText(/1 de 3 concluídos/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('tr-ex-concluidos')).toBeDefined();
    expect(screen.getByTestId('tr-done-card-ex_1')).toBeDefined();
  });

  it('permite repetir um exercício já feito adicionando uma série extra real', async () => {
    const onChange = vi.fn();
    vi.spyOn(treinoApi, 'serie').mockResolvedValue({
      session: {
        ...mockSession,
        sets: [
          ...mockSession.sets,
          { id: 's3', exerciseKey: 'ex_1', exerciseName: 'Supino Reto', setNo: 3, reps: 10, weightKg: 60, metric: 'kg' }
        ]
      }
    });

    render(<TreinoAtivo session={mockSession} onChange={onChange} onFinished={vi.fn()} onDiscarded={vi.fn()} showToast={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Repetir Supino Reto/i }));
    expect(screen.getByTestId('tr-repeat-form-ex_1')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Concluir série extra de Supino Reto/i }));

    await waitFor(() => {
      expect(treinoApi.serie).toHaveBeenCalledWith(
        'sess_1',
        expect.objectContaining({ exerciseKey: 'ex_1', setNo: 3, weightKg: 60, reps: 10, metric: 'kg' })
      );
    });
  });

  it('exibe opção de refazer para exercício concluído caso o usuário tenha clicado errado', async () => {
    const onChange = vi.fn();
    vi.spyOn(treinoApi, 'desfazer').mockResolvedValue({
      session: {
        ...mockSession,
        sets: [mockSession.sets[0]] // Desfez a última série
      }
    });

    render(<TreinoAtivo session={mockSession} onChange={onChange} onFinished={vi.fn()} onDiscarded={vi.fn()} showToast={vi.fn()} />);

    // Encontra o botão de refazer no exercício concluído
    const btnRefazer = screen.getByRole('button', { name: /Refazer Supino Reto/i });
    expect(btnRefazer).toBeDefined();

    fireEvent.click(btnRefazer);

    await waitFor(() => {
      expect(treinoApi.desfazer).toHaveBeenCalledWith('sess_1', expect.objectContaining({ exerciseKey: 'ex_1', setNo: 2 }));
    });
  });
});
