import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusTab } from '../components/FocusTab';
import { ESPECIES, especiePorId } from '../components/foco/planta/especies';
import {
  avaliarDesafiosCultivo,
  especieDesbloqueada,
  tempoMinimoDaEspecie
} from '../components/foco/planta/desbloqueiosCultivo';

const MIN = 60000;
const T0 = new Date(2026, 10, 23, 10, 0, 0).getTime();

describe('Desbloqueios de cultivo, tempo mínimo e Modo Foco Total', () => {
  const user = { id: 'u_unlock', name: 'Ana' };
  const tags = [{ id: 'tag_est', name: 'Estudos', color: '#A78BFA', subclasses: [] }];

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(T0);
    localStorage.setItem('ethos_foco_v1_u_unlock', JSON.stringify({ reduce: true }));
  });

  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    vi.useRealTimers();
  });

  it('mantém cultivos padrão liberados e desbloqueia novos conforme desafios de tempo (10m, 15m, 25m, etc.)', () => {
    const semSessoes = avaliarDesafiosCultivo({ sessions: [] }, ESPECIES);
    expect(especieDesbloqueada(especiePorId('lirio-lunar'), semSessoes)).toBe(true);
    expect(especieDesbloqueada(especiePorId('lotus-aurora'), semSessoes)).toBe(true); // indiceTema 1 (padrão)
    expect(especieDesbloqueada(especiePorId('cerejeira-solar'), semSessoes)).toBe(false); // indiceTema 2 (10 min)
    expect(especieDesbloqueada(especiePorId('orquidea-nebulosa'), semSessoes)).toBe(false); // indiceTema 3 (15 min)

    const apos10Min = avaliarDesafiosCultivo({ sessions: [{ date: '2026-11-23', mins: 10, full: true }] }, ESPECIES);
    expect(especieDesbloqueada(especiePorId('cerejeira-solar'), apos10Min)).toBe(true);
    expect(especieDesbloqueada(especiePorId('orquidea-nebulosa'), apos10Min)).toBe(false);

    const apos15Min = avaliarDesafiosCultivo({ sessions: [{ date: '2026-11-23', mins: 15, full: true }] }, ESPECIES);
    expect(especieDesbloqueada(especiePorId('orquidea-nebulosa'), apos15Min)).toBe(true);
    expect(tempoMinimoDaEspecie(especiePorId('orquidea-nebulosa'))).toBe(15);
  });

  it('bloqueia seleção de cultivo ainda trancado e exige tempo mínimo para cultivos avançados', () => {
    // Pré-desbloqueia desafio de 25 min (libera orquidea-nebulosa com mínimo de 15 min)
    localStorage.setItem(
      'ethos_foco_v1_u_unlock',
      JSON.stringify({
        reduce: true,
        sessions: [{ id: 's1', date: '2026-11-23', mins: 25, full: true }]
      })
    );

    render(<FocusTab user={user} tags={tags} />);
    fireEvent.click(screen.getByTestId('rf-open-catalogo'));

    // Item de indiceTema 5 (exige 35 min) continua bloqueado
    const bloqueado = screen.getByTestId('rf-cat-item-rosa-estelar');
    expect(bloqueado.dataset.locked).toBe('true');
    fireEvent.click(bloqueado);
    expect(screen.getByTestId('rf-bloqueio-aviso').textContent).toMatch(/Bloqueado/i);

    // Item desbloqueado com tempo mínimo de 15 min (orquidea-nebulosa)
    const liberado = screen.getByTestId('rf-cat-item-orquidea-nebulosa');
    expect(liberado.dataset.locked).toBe('false');
    fireEvent.click(liberado);
    fireEvent.click(screen.getByRole('button', { name: /Cultivar Orquídea Nebulosa/i }));

    // Tenta reduzir o timer para 10 min (abaixo do mínimo de 15 min)
    fireEvent.click(screen.getByRole('button', { name: /Sprint · 10 min/i }));
    expect(screen.getByTestId('rf-tempo-minimo-aviso').textContent).toMatch(/15 min/);
    expect(screen.getByRole('button', { name: 'Começar sessão' }).disabled).toBe(true);

    // Ajusta para o mínimo e volta a liberar o botão iniciar
    fireEvent.click(screen.getByRole('button', { name: /Ajustar para 15 min/i }));
    expect(screen.getByRole('button', { name: 'Começar sessão' }).disabled).toBe(false);
  });

  it('Modo Foco Total reseta a sessão imediatamente ao trocar de aba (visibilitychange hidden)', () => {
    render(<FocusTab user={user} tags={tags} />);

    fireEvent.click(screen.getByTestId('rf-switch-foco-total'));
    expect(screen.getByTestId('rf-foco-total-badge')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Começar sessão' }));
    expect(screen.getByTestId('rf-foco-total-running')).toBeTruthy();

    // Avança 5 minutos
    vi.setSystemTime(T0 + 5 * MIN);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('timer').textContent).toBe('20:00');

    // Simula o usuário trocando de aba do navegador
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Sessão foi resetada, cronômetro voltou para 25:00 e alerta apareceu
    expect(screen.getByTestId('rf-foco-total-reset-banner')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('25:00');
    expect(localStorage.getItem('ethos_foco_sessao_v1_u_unlock')).toBeNull();
  });
});
