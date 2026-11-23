import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusTab } from '../components/FocusTab';

describe('FocusTab - Temporizador Pomodoro Personalizado', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const baseProps = {
    user: { id: 'u1', name: 'Ana' },
    tags: [{ id: 't1', name: 'Estudo', color: '#818cf8', has_subclasses: false, subclasses: [] }],
    onLogSubclassEffort: vi.fn(),
    onFocusComplete: vi.fn()
  };

  it('exibe os presets fixos de intensidade e a opção de tempo personalizado', () => {
    render(<FocusTab {...baseProps} />);
    expect(screen.getByRole('button', { name: /Sprint · 10 min/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Leve · 15 min/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Normal · 25 min/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Profunda · 50 min/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Personalizado/i })).toBeDefined();
  });

  it('permite escolher tempo personalizado digitando minutos desejados', () => {
    render(<FocusTab {...baseProps} />);

    // Clica no chip personalizado
    fireEvent.click(screen.getByRole('button', { name: /Personalizado/i }));

    // Deve exibir campo numérico para digitação direta
    const inputCustom = screen.getByLabelText(/Tempo personalizado/i);
    expect(inputCustom).toBeDefined();

    // Define 42 minutos
    fireEvent.change(inputCustom, { target: { value: '42' } });

    // O mostrador do timer reflete 42 min
    expect(screen.getAllByText(/42 min/).length).toBeGreaterThan(0);

    // Inicia sessão
    const btnComecar = screen.getByRole('button', { name: /Começar sessão/i });
    fireEvent.click(btnComecar);

    // Cronômetro exibe 42:00
    expect(screen.getByText(/42:00/)).toBeDefined();
  });
});
