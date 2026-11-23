import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

describe('LumoMascot Component 3.0 (Organic Morphing Mascot)', () => {
  it('renderiza com os estados idle, focus, paused e completed e aplica aria-label e data-status', () => {
    const { rerender } = render(<LumoMascot progress={0} status="idle" size={280} />);
    let mascot = screen.getByRole('img');
    expect(mascot).toHaveAttribute('data-status', 'idle');
    expect(mascot).toHaveAttribute('aria-label', expect.stringContaining('0%'));

    rerender(<LumoMascot progress={50} status="focus" size={280} />);
    mascot = screen.getByRole('img');
    expect(mascot).toHaveAttribute('data-status', 'focus');
    expect(mascot).toHaveAttribute('aria-label', expect.stringContaining('50%'));

    rerender(<LumoMascot progress={100} status="completed" size={280} />);
    mascot = screen.getByRole('img');
    expect(mascot).toHaveAttribute('data-status', 'completed');
    expect(mascot).toHaveAttribute('aria-label', expect.stringContaining('concluída'));

    rerender(<LumoMascot progress={25} status="paused" size={280} />);
    mascot = screen.getByRole('img');
    expect(mascot).toHaveAttribute('data-status', 'paused');
    expect(mascot).toHaveAttribute('aria-label', expect.stringContaining('25%'));
  });

  it('renderiza os elementos visuais orgânicos do mascote (fenda de energia, corpo e aura)', () => {
    const { container } = render(<LumoMascot progress={50} status="focus" size={360} />);

    // Fenda de energia interna
    expect(container.querySelector('.lumo-mascot__energy')).not.toBeNull();

    // SVG root
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 400 400');
  });

  it('ativa shockwave e partículas de conclusão ao transitar para completed', () => {
    const { container, rerender } = render(<LumoMascot progress={80} status="focus" />);
    expect(container.querySelector('.lumo-mascot__shockwave')).toBeNull();

    act(() => {
      rerender(<LumoMascot progress={100} status="completed" />);
    });

    expect(container.querySelector('.lumo-mascot__shockwave')).not.toBeNull();
    expect(container.querySelectorAll('.lumo-mascot__burst-particle').length).toBe(8);
  });

  it('renderiza elementos filhos quando fornecidos', () => {
    render(
      <LumoMascot progress={50} status="focus" size={300}>
        <span data-testid="timer-display">12:30</span>
      </LumoMascot>
    );

    expect(screen.getByTestId('timer-display')).toHaveTextContent('12:30');
  });

  it('mantém o LumoMascot funcional isoladamente e confirma que o laboratório experimental foi removido do AdminPortalTab', async () => {
    render(<AdminPortalTab />);
    expect(await screen.findByText(/Total de Contas/i)).toBeInTheDocument();
    expect(screen.queryByTestId('pomodo-card')).toBeNull();
    expect(screen.queryByText(/Mascote Lumo 2\.0/i)).toBeNull();
  });
});
