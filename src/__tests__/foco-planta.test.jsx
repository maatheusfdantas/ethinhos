/**
 * Proposta 10 (22/11/2026): Foco com planta. Tempo por horários (sobrevive a segundo plano, troca de tela e recarga),
 * estágios por progresso, troca de estágio com entrada curta e murcha só ao descartar.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import {
  criarSessao, restanteMs, progresso, pausar, retomar, minutosFeitos, pausaUsadaMs, carregarSessao, salvarSessao
} from '../components/foco/planta/sessaoFoco';
import { ESPECIES, estagioPara, especiePorId } from '../components/foco/planta/especies';
import { urlDoAsset } from '../components/foco/planta/assets';
import { Planta } from '../components/foco/planta/Planta';
import { FocusTab } from '../components/FocusTab';

const MIN = 60000;
const T0 = new Date(2026, 10, 22, 10, 0, 0).getTime();

describe('sessaoFoco: tempo a partir de horários', () => {
  it('restante e progresso saem do relógio, mesmo com saltos (aba em segundo plano)', () => {
    const s = criarSessao({ minutos: 25, agora: T0 });
    expect(restanteMs(s, T0)).toBe(25 * MIN);
    expect(progresso(s, T0 + 5 * MIN)).toBeCloseTo(0.2);
    expect(minutosFeitos(s, T0 + 12.5 * MIN)).toBe(12);
    // salto grande, sem nenhum tick no meio
    expect(restanteMs(s, T0 + 3 * 3600000)).toBe(0);
    expect(progresso(s, T0 + 3 * 3600000)).toBe(1);
  });

  it('pausa congela o tempo; retomar empurra o fim pela duração da pausa', () => {
    let s = criarSessao({ minutos: 10, agora: T0 });
    s = pausar(s, T0 + 4 * MIN);
    expect(restanteMs(s, T0 + 9 * MIN)).toBe(6 * MIN);
    expect(pausaUsadaMs(s, T0 + 5 * MIN)).toBe(MIN);
    s = retomar(s, T0 + 7 * MIN);
    expect(restanteMs(s, T0 + 7 * MIN)).toBe(6 * MIN);
    expect(restanteMs(s, T0 + 13 * MIN)).toBe(0);
    expect(pausaUsadaMs(s, T0 + 13 * MIN)).toBe(3 * MIN);
  });

  it('guarda e carrega por usuário; dado inválido é ignorado', () => {
    const s = criarSessao({ minutos: 25, agora: T0, meta: { mins: 25 } });
    salvarSessao('u1', s);
    expect(carregarSessao('u1')).toEqual(s);
    expect(carregarSessao('u2')).toBeNull();
    localStorage.setItem('ethos_foco_sessao_v1_u3', '{"v":1,"tipo":"focus","inicio":"x"}');
    expect(carregarSessao('u3')).toBeNull();
    salvarSessao('u1', null);
    expect(carregarSessao('u1')).toBeNull();
  });
});

describe('especies: estágio por progresso', () => {
  const esp = especiePorId('lirio-lunar');
  it('troca nos limites configurados e murcha só no estado de falha', () => {
    expect(estagioPara(esp, 0).stageId).toBe('semente');
    expect(estagioPara(esp, 0.099).stageId).toBe('semente');
    expect(estagioPara(esp, 0.1).stageId).toBe('broto');
    expect(estagioPara(esp, 0.5).stageId).toBe('muda');
    expect(estagioPara(esp, 0.8).stageId).toBe('jovem');
    expect(estagioPara(esp, 1).stageId).toBe('florida');
    expect(estagioPara(esp, 0.8, 'murcha').stageId).toBe('murcha');
  });
  it('todo estágio, a murcha e o chão têm arquivo de desenho', () => {
    for (const e of ESPECIES) {
      for (const k of [...e.estagios.map((x) => x.assetKey), e.murcha.assetKey, e.chao]) expect(urlDoAsset(e.id, k), `${e.id}/${k}`).toBeTruthy();
    }
  });
});

describe('Planta', () => {
  const esp = ESPECIES[0];
  it('sem entrada no primeiro desenho; entrada curta quando o estágio muda; balanço por atributo', () => {
    const { container, rerender } = render(<Planta especie={esp} estagio={esp.estagios[0]} balanco="on" />);
    const raiz = container.querySelector('.rf-planta');
    expect(raiz.dataset.sway).toBe('on');
    expect(container.querySelector('img.est').className).not.toMatch(/entra/);
    const antes = container.querySelector('img.est');
    rerender(<Planta especie={esp} estagio={esp.estagios[0]} balanco="on" />);
    expect(container.querySelector('img.est')).toBe(antes); // mesmo estágio: a imagem não é recriada
    rerender(<Planta especie={esp} estagio={esp.estagios[1]} balanco="pause" />);
    expect(container.querySelector('img.est').className).toMatch(/entra/);
    expect(raiz.dataset.stage).toBe('broto');
    expect(raiz.dataset.sway).toBe('pause');
  });
});

describe('FocusTab com planta', () => {
  const user = { id: 'u1', name: 'Lia' };
  const tags = [{ id: 'tag_facul', name: 'Faculdade', color: '#A78BFA', subclasses: [] }];
  const estagio = (c) => c.querySelector('.rf-planta')?.dataset.stage;
  const tick = (ms = 300) => act(() => { vi.advanceTimersByTime(ms); });
  const pular = (min) => { vi.setSystemTime(Date.now() + min * MIN); tick(); };

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(T0);
    // sem poeira em canvas (o jsdom não desenha)
    localStorage.setItem('ethos_foco_v1_u1', JSON.stringify({ reduce: true }));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('a planta cresce pelo tempo real e floresce ao concluir, registrando a espécie e o estágio', () => {
    const onFocusComplete = vi.fn();
    const { container } = render(<FocusTab user={user} tags={tags} onFocusComplete={onFocusComplete} />);
    expect(estagio(container)).toBe('semente');
    fireEvent.click(screen.getByRole('button', { name: 'Começar sessão' }));
    expect(container.querySelector('.rf-planta').dataset.sway).toBe('on');
    pular(3); expect(estagio(container)).toBe('broto');
    pular(7); expect(estagio(container)).toBe('muda');
    pular(7); expect(estagio(container)).toBe('jovem');
    pular(9);
    expect(estagio(container)).toBe('florida');
    expect(onFocusComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sessão concluída')).toBeTruthy();
    const salvo = JSON.parse(localStorage.getItem('ethos_foco_v1_u1'));
    expect(salvo.sessions[0]).toMatchObject({ mins: 25, full: true, plant: { especie: 'lirio-lunar', estagio: 'florida' } });
    expect(localStorage.getItem('ethos_foco_sessao_v1_u1')).toBeNull();
  });

  it('a sessão sobrevive a sair da aba e voltar (desmontar e montar) e conclui se o tempo acabou fora', () => {
    const onFocusComplete = vi.fn();
    const primeira = render(<FocusTab user={user} tags={tags} onFocusComplete={onFocusComplete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar sessão' }));
    primeira.unmount();
    vi.setSystemTime(T0 + 12 * MIN);
    const { container, unmount } = render(<FocusTab user={user} tags={tags} onFocusComplete={onFocusComplete} />);
    expect(screen.getByRole('timer').textContent).toBe('13:00');
    expect(estagio(container)).toBe('muda');
    unmount();
    vi.setSystemTime(T0 + 40 * MIN);
    const terceira = render(<FocusTab user={user} tags={tags} onFocusComplete={onFocusComplete} />);
    tick();
    expect(onFocusComplete).toHaveBeenCalledTimes(1);
    expect(estagio(terceira.container)).toBe('florida');
  });

  it('pausa congela a planta e o tempo; guardar o tempo mantém o estágio alcançado', () => {
    const { container } = render(<FocusTab user={user} tags={tags} />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar sessão' }));
    pular(10);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(container.querySelector('.rf-planta').dataset.sway).toBe('pause');
    pular(5);
    expect(screen.getByRole('timer').textContent).toBe('15:00');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Parar sessão' }));
    const d = screen.getByRole('dialog');
    expect(d.textContent).toMatch(/faz ela murchar/);
    fireEvent.click(within(d).getByRole('button', { name: /Guardar 10 min/ }));
    expect(estagio(container)).toBe('muda');
    expect(screen.getByText(/A planta ficou no estágio muda/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('ethos_foco_v1_u1')).sessions[0]).toMatchObject({ full: false, mins: 10, plant: { estagio: 'muda' } });
  });

  it('descartar faz a planta murchar (sem tirar pontos); a próxima sessão recomeça da semente', () => {
    const { container } = render(<FocusTab user={user} tags={tags} />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar sessão' }));
    pular(8);
    fireEvent.click(screen.getByRole('button', { name: 'Parar sessão' }));
    fireEvent.click(screen.getByRole('button', { name: 'Parar sem guardar' }));
    expect(estagio(container)).toBe('murcha');
    expect(screen.getByText(/A planta murchou/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('ethos_foco_v1_u1')).foco || 0).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Começar sessão' }));
    expect(estagio(container)).toBe('semente');
  });

  it('o botão Planta volta ao anel com planeta (visual atual)', () => {
    const { container } = render(<FocusTab user={user} tags={tags} />);
    expect(container.querySelector('.rf-planta')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: 'Planta' }));
    expect(container.querySelector('.rf-planta')).toBeNull();
    expect(container.querySelector('.rf-orbit .center').className).toBe('center');
    expect(container.querySelectorAll('.rf-orbit .moon')).toHaveLength(5);
  });

  it('card de cultivo fica acima do timer recolhido por padrão e expande as opções abaixo ao clicar', () => {
    render(<FocusTab user={user} tags={tags} />);
    // Por padrão, as opções ficam recolhidas (não aparecem na tela)
    expect(screen.queryByTestId('rf-catalogo-modal')).toBeNull();
    const toggleBtn = screen.getByTestId('rf-open-catalogo');
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    // Ao clicar no card acima do timer, expande as opções logo abaixo
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    const drawer = screen.getByTestId('rf-catalogo-modal');
    expect(drawer).toBeTruthy();

    fireEvent.click(screen.getByTestId('rf-cat-tab-foguetes'));
    fireEvent.click(screen.getByTestId('rf-cat-item-fog-apollo'));
    fireEvent.click(within(drawer).getByRole('button', { name: /Cultivar Apollo Astral/i }));

    expect(screen.queryByTestId('rf-catalogo-modal')).toBeNull();
    expect(screen.getByTestId('rf-cultivo-selector').textContent).toMatch(/Apollo Astral/);

    fireEvent.click(screen.getByRole('button', { name: 'Começar sessão' }));
    pular(26);
    const salvo = JSON.parse(localStorage.getItem('ethos_foco_v1_u1'));
    expect(salvo.sessions[0]).toMatchObject({ full: true, plant: { especie: 'fog-apollo', estagio: 'florida' } });
  });

  it('exibe acompanhamento de evolução dos cultivos por Semana e Mês vinculado às sessões reais', () => {
    render(<FocusTab user={user} tags={tags} />);
    const jardim = screen.getByTestId('rf-jardim-evolucao');
    expect(within(jardim).getByTestId('rf-cultivos-vazio')).toBeTruthy();
    expect(within(jardim).getByTestId('rf-jardim-concluidos').textContent).toBe('0');

    // Conclui uma sessão real de foco (25 min)
    fireEvent.click(screen.getByRole('button', { name: 'Começar sessão' }));
    pular(26);

    expect(within(jardim).queryByTestId('rf-cultivos-vazio')).toBeNull();
    expect(within(jardim).getByTestId('rf-jardim-concluidos').textContent).toBe('1');
    expect(within(jardim).getByTestId('rf-jardim-tempo').textContent).toBe('25 min');
    const items = within(jardim).getAllByTestId('rf-cultivo-item');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toMatch(/Lírio-lunar/);
    expect(items[0].textContent).toMatch(/Florida/);

    // Alterna para visão Mensal (30 dias)
    fireEvent.click(within(jardim).getByTestId('rf-jardim-periodo-mes'));
    expect(within(jardim).getAllByTestId('rf-cultivo-item')).toHaveLength(1);
  });
});
