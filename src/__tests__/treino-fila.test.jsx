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

  it('mostra todos os exercícios previstos na ficha de treino e seu progresso', () => {
    render(<TreinoAtivo session={mockSession} onChange={vi.fn()} onFinished={vi.fn()} onDiscarded={vi.fn()} />);

    // Deve exibir todos os exercícios da ficha
    expect(screen.getAllByText('Crucifixo Inclinado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tríceps Corda').length).toBeGreaterThan(0);

    // Deve exibir o resumo de exercícios concluídos
    expect(screen.getByText(/1 de 3 concluídos/i)).toBeDefined();
    // Exibe seção de fila pendente e seção de concluídos no fim da fila
    expect(screen.getAllByText(/Fim da fila/i).length).toBeGreaterThan(0);
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
    const btnRefazer = screen.getByRole('button', { name: /Refazer Supino Reto|Refazer/i });
    expect(btnRefazer).toBeDefined();

    fireEvent.click(btnRefazer);

    await waitFor(() => {
      expect(treinoApi.desfazer).toHaveBeenCalledWith('sess_1', expect.objectContaining({ exerciseKey: 'ex_1', setNo: 2 }));
    });
  });
});
