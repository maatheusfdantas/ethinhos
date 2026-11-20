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

describe('LumoMascot Component 2.1 (Orbital & Cosmic Elements)', () => {
  it('renderiza com os estados idle, focus, paused e completed e aplica variáveis de energia', () => {
    const { rerender } = render(<LumoMascot progress={0} status="idle" size={280} />);
    let mascot = screen.getByRole('img');
    expect(mascot).toHaveClass('lumo--idle');
    expect(mascot).toHaveAttribute('aria-label', expect.stringContaining('0%'));

    rerender(<LumoMascot progress={50} status="focus" size={280} />);
    mascot = screen.getByRole('img');
    expect(mascot).toHaveClass('lumo--focus');
    expect(mascot).toHaveAttribute('aria-label', expect.stringContaining('50%'));

    rerender(<LumoMascot progress={100} status="completed" size={280} />);
    mascot = screen.getByRole('img');
    expect(mascot).toHaveClass('lumo--completed');
    expect(mascot).toHaveAttribute('aria-label', expect.stringContaining('100%'));

    rerender(<LumoMascot progress={25} status="paused" size={280} />);
    mascot = screen.getByRole('img');
    expect(mascot).toHaveClass('lumo--paused');
  });

  it('ativa as camadas visuais progressivamente conforme o progresso aumenta', () => {
    // 10% - nenhuma camada orbital secundária deve ter is-visible
    const { container, rerender } = render(<LumoMascot progress={10} status="focus" />);
    expect(container.querySelector('.lumo__orbit--inner.is-visible')).toBeNull();
    expect(container.querySelector('.lumo__shards.is-visible')).toBeNull();
    expect(container.querySelector('.lumo__constellation.is-visible')).toBeNull();

    // 20% - anel interno visível (>= 15%)
    rerender(<LumoMascot progress={20} status="focus" />);
    expect(container.querySelector('.lumo__orbit--inner.is-visible')).not.toBeNull();
    expect(container.querySelector('.lumo__shards.is-visible')).toBeNull();

    // 30% - shards visíveis (>= 25%)
    rerender(<LumoMascot progress={30} status="focus" />);
    expect(container.querySelector('.lumo__shards.is-visible')).not.toBeNull();

    // 45% - anel externo visível (>= 40%)
    rerender(<LumoMascot progress={45} status="focus" />);
    expect(container.querySelector('.lumo__orbit--outer.is-visible')).not.toBeNull();

    // 85% - constelação visível (>= 80%)
    rerender(<LumoMascot progress={85} status="focus" />);
    expect(container.querySelector('.lumo__constellation.is-visible')).not.toBeNull();
  });

  it('renderiza o sistema cósmico com asteroides, carrier orbital e flare, sem estrelas cadentes', () => {
    const { container } = render(<LumoMascot progress={50} status="focus" size={360} />);

    // Asteroides
    expect(container.querySelector('.lumo__asteroid--1')).not.toBeNull();
    expect(container.querySelector('.lumo__asteroid--2')).not.toBeNull();
    expect(container.querySelector('.lumo__asteroid--3')).not.toBeNull();

    // Estrelas cadentes não devem estar presentes
    expect(container.querySelector('.lumo__shooting-stars')).toBeNull();
    expect(container.querySelector('.lumo__shooting-star--1')).toBeNull();

    // Carrier orbital do Lumo (orbitando o timer)
    expect(container.querySelector('.lumo__orbital-carrier')).not.toBeNull();
    expect(container.querySelector('.lumo__flare')).not.toBeNull();
    expect(container.querySelector('.lumo__core-group')).not.toBeNull();
    expect(container.querySelector('.lumo__progress-arc')).not.toBeNull();
  });

  it('renderiza elementos filhos centralizados', () => {
    render(
      <LumoMascot progress={50} status="focus" size={300}>
        <span data-testid="timer-display">12:30</span>
      </LumoMascot>
    );

    expect(screen.getByTestId('timer-display')).toHaveTextContent('12:30');
  });

  it('renderiza o card Pomodo com reatividade ao timer e slider de progresso na aba Teste', async () => {
    render(<AdminPortalTab />);

    // Navega para a aba Teste
    const testeBtn = await screen.findByRole('button', { name: /teste/i });
    fireEvent.click(testeBtn);

    // O card Pomodo deve estar visível
    expect(screen.getByTestId('pomodo-card')).toBeInTheDocument();
    expect(screen.getByText(/^Pomodo$/i)).toBeInTheDocument();

    // Slider de teste de energia
    const slider = screen.getByRole('slider', { name: /ajustar energia do lumo/i });
    expect(slider).toBeInTheDocument();

    // Altera o slider para 85% (constelação ativa)
    fireEvent.change(slider, { target: { value: '85' } });
    expect(screen.getByText(/✦ Constelação Ativa/i)).toBeInTheDocument();

    // Testa seletor rápido de Concluído
    const conclBtn = screen.getByRole('button', { name: /concluído/i });
    fireEvent.click(conclBtn);
    expect(screen.getByText(/Finalizado/i)).toBeInTheDocument();

    // Testa reset para 25m
    const resetBtn = screen.getByRole('button', { name: /25m/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText(/25:00/)).toBeInTheDocument();
  });
});
