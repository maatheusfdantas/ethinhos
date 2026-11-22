/** Planta do Foco na aba Teste do administrador (22/11/2026). */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlantaLaboratorio } from '../components/foco/planta/PlantaLaboratorio';
import { ESPECIES, especiesPorTema } from '../components/foco/planta/especies';
import { AdminPortalTab } from '../components/AdminPortalTab';

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async () => ({ ok: true, json: async () => ({ users: [], waitlist: [], tickets: [], logs: [] }) }))
}));

const estagio = (c) => c.querySelector('.rf-planta').dataset.stage;

describe('Planta do Foco na aba Teste', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('aparece na aba Teste junto com o card do Lumo', async () => {
    render(<AdminPortalTab />);
    fireEvent.click(await screen.findByRole('button', { name: /teste/i }));
    expect(screen.getByTestId('pomodo-card')).toBeTruthy();
    expect(screen.getByTestId('planta-lab')).toBeTruthy();
  });

  it('o progresso escolhe o estágio; murchar e os cartões de estágio funcionam; nada é gravado', () => {
    const { container } = render(<PlantaLaboratorio />);
    expect(estagio(container)).toBe('semente');
    fireEvent.change(screen.getByLabelText('Progresso da sessão'), { target: { value: '50' } });
    expect(estagio(container)).toBe('muda');
    fireEvent.click(screen.getByRole('button', { name: 'Ver estágio Florida' }));
    expect(estagio(container)).toBe('florida');
    fireEvent.click(screen.getByRole('button', { name: 'Murchar' }));
    expect(estagio(container)).toBe('murcha');
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(estagio(container)).toBe('semente');
    expect(localStorage.length).toBe(0);
  });

  it('a simulação cresce pelo relógio, pausa congelando e balança só quando ligado', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(new Date(2026, 10, 22, 10, 0, 0));
    const { container } = render(<PlantaLaboratorio />);
    fireEvent.click(screen.getByRole('button', { name: '10 s' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simular sessão' }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(estagio(container)).toBe('muda');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(container.querySelector('.rf-planta').dataset.sway).toBe('pause');
    act(() => { vi.advanceTimersByTime(20000); });
    expect(estagio(container)).toBe('muda');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    act(() => { vi.advanceTimersByTime(5200); });
    expect(estagio(container)).toBe('florida');
    fireEvent.click(screen.getByLabelText('Balanço contínuo'));
    expect(container.querySelector('.rf-planta').dataset.sway).toBe('off');
  });

  it('oferece no mínimo 20 variações de cada tema (Plantas, Mundos e Elementos) com paletas alternadas e preserva o Lírio-lunar padrão', () => {
    const plantas = especiesPorTema('plantas');
    const mundos = especiesPorTema('mundos');
    const elementos = especiesPorTema('elementos');

    expect(ESPECIES[0].id).toBe('lirio-lunar');
    expect(plantas.length).toBeGreaterThanOrEqual(21); // Lírio-lunar + 20 novas plantas
    expect(mundos.length).toBeGreaterThanOrEqual(20);
    expect(elementos.length).toBeGreaterThanOrEqual(20);

    // Verifica que as paletas se alternam (dois itens vizinhos nunca têm a mesma paleta)
    for (const lista of [plantas, mundos, elementos]) {
      for (let i = 1; i < lista.length; i++) {
        expect(lista[i].paleta.id).not.toBe(lista[i - 1].paleta.id);
      }
    }

    const { container } = render(<PlantaLaboratorio />);
    fireEvent.click(screen.getByTestId('planta-lab-tema-mundos'));
    expect(screen.getByTestId('planta-lab-estagio').textContent).toBe('Núcleo');
    fireEvent.change(screen.getByLabelText('Progresso da sessão'), { target: { value: '100' } });
    expect(estagio(container)).toBe('florida');
    expect(screen.getByTestId('planta-lab-estagio').textContent).toBe('Mundo Pleno');

    fireEvent.click(screen.getByTestId('planta-lab-tema-elementos'));
    expect(screen.getByTestId('planta-lab-estagio').textContent).toBe('Manifestação');
  });
});
