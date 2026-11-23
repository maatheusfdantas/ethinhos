import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BadHabitsTab } from '../components/BadHabitsTab';

describe('BadHabitsTab - Temporizador de maus hábitos em tempo real', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicia o temporizador no momento da criação e exibe contagem viva incluindo segundos', () => {
    const showToast = vi.fn();
    render(<BadHabitsTab user={{ id: 'u1', name: 'Ana' }} showToast={showToast} />);

    // Clica para adicionar mau hábito
    const btnAdd = screen.getByRole('button', { name: /Novo Mau Hábito/i });
    fireEvent.click(btnAdd);

    // Preenche título
    const inputTitle = screen.getByPlaceholderText(/Ex: Cigarro, Álcool, Automutilação/i);
    fireEvent.change(inputTitle, { target: { value: 'Redes Sociais' } });

    // Salva
    const btnSalvar = screen.getByRole('button', { name: /Iniciar Acompanhamento/i });
    fireEvent.click(btnSalvar);

    expect(screen.getByText('Redes Sociais')).toBeDefined();
    // Verifica que unidades aparecem na tela
    expect(screen.getAllByText(/dias/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/horas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/min/i).length).toBeGreaterThan(0);
    expect(screen.getByText('seg')).toBeDefined();

    // Avança 5 segundos no tempo
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // O contador de segundos deve refletir o tempo decorrido
    expect(screen.getByText('5')).toBeDefined();
  });
});
