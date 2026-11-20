import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LumoMascot } from '../components/LumoMascot';
import { AdminPortalTab } from '../components/AdminPortalTab';

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({
      users: [],
      waitlist: [],
      tickets: [],
      logs: []
    })
  }))
}));

describe('LumoMascot Component', () => {
  it('renderiza com os estados focus, paused e completed', () => {
    const { rerender } = render(<LumoMascot status="focus" size={200} />);
    let mascot = screen.getByRole('img');
    expect(mascot).toHaveClass('lumo--focus');
    expect(mascot).toHaveStyle({ width: '200px', height: '200px' });

    rerender(<LumoMascot status="paused" size={240} />);
    mascot = screen.getByRole('img');
    expect(mascot).toHaveClass('lumo--paused');

    rerender(<LumoMascot status="completed" size={240} />);
    mascot = screen.getByRole('img');
    expect(mascot).toHaveClass('lumo--completed');
  });

  it('renderiza elementos filhos envolvidos pelo mascote', () => {
    render(
      <LumoMascot status="focus" size={260}>
        <span data-testid="timer-display">25:00</span>
      </LumoMascot>
    );

    expect(screen.getByTestId('timer-display')).toHaveTextContent('25:00');
  });

  it('renderiza o card Pomodo com timer interativo na aba Teste do Admin', async () => {
    render(<AdminPortalTab />);

    // Navega para a aba Teste
    const testeBtn = await screen.findByRole('button', { name: /teste/i });
    fireEvent.click(testeBtn);

    // O card Pomodo deve estar visível
    expect(screen.getByTestId('pomodo-card')).toBeInTheDocument();
    expect(screen.getByText(/^Pomodo$/i)).toBeInTheDocument();
    expect(screen.getByText(/25:00/)).toBeInTheDocument();

    // Testa seletor rápido de estados (Pausa e Concluído)
    const pausaBtn = screen.getByRole('button', { name: /pausa/i });
    fireEvent.click(pausaBtn);
    expect(screen.getByText(/Em Pausa/i)).toBeInTheDocument();

    const conclBtn = screen.getByRole('button', { name: /concluído/i });
    fireEvent.click(conclBtn);
    expect(screen.getByText(/Finalizado/i)).toBeInTheDocument();

    // Testa botão 25m reset
    const resetBtn = screen.getByRole('button', { name: /25m/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText(/25:00/)).toBeInTheDocument();
  });
});
