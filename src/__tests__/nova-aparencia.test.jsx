/**
 * Proposta 12 (22/11/2026): nova aparência e fluxo. Tema claro/escuro, menu lateral recolhível,
 * menu único do "+", notificações visíveis no Painel e ações de um toque.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TemaBotao } from '../components/rx/TemaBotao';
import { lerTema, aplicarTema } from '../components/rx/tema';
import { AcoesRapidas } from '../components/rx/AcoesRapidas';
import { DesktopSidebar } from '../components/Nav';
import { PainelTab } from '../components/PainelTab';
import { PendenciasDrawer } from '../components/pendencias/Pendencias';
import { Droplets, Timer } from 'lucide-react';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
});

describe('tema claro e escuro', () => {
  it('começa claro, alterna para escuro e lembra a escolha', () => {
    expect(lerTema()).toBe('claro');
    aplicarTema(lerTema());
    expect(document.documentElement.dataset.theme).toBeUndefined();
    render(<TemaBotao />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('ethos_tema')).toBe('escuro');
    fireEvent.click(screen.getByRole('button', { name: 'Usar tema claro' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(lerTema()).toBe('claro');
  });
});

describe('menu lateral', () => {
  const props = { activeTab: 'dashboard', setActiveTab: vi.fn(), user: { id: 'u1', name: 'Lia' }, tags: [] };
  it('recolhe para só ícones (com nome no title) e lembra a escolha', () => {
    const { container, unmount } = render(<DesktopSidebar {...props} />);
    const btn = screen.getByTestId('menu-recolher');
    expect(container.querySelector('.rx-side').className).not.toMatch(/mini/);
    fireEvent.click(btn);
    expect(container.querySelector('.rx-side').className).toMatch(/mini/);
    expect(screen.getByRole('button', { name: /Hábitos e rotinas/ }).getAttribute('title')).toBe('Hábitos e rotinas');
    expect(localStorage.getItem('ethos_menu_recolhido')).toBe('1');
    unmount();
    const outro = render(<DesktopSidebar {...props} />);
    expect(outro.container.querySelector('.rx-side').className).toMatch(/mini/);
  });
  it('cada módulo tem a sua cor no ícone', () => {
    render(<DesktopSidebar {...props} />);
    expect(screen.getByRole('button', { name: /Hábitos e rotinas/ }).style.getPropertyValue('--c')).toBe('var(--rx-m-habitos)');
    expect(screen.getByRole('button', { name: /Treino/ }).style.getPropertyValue('--c')).toBe('var(--rx-m-treino)');
  });
});

describe('menu do "+"', () => {
  it('mostra as ações, executa a escolhida e fecha; Esc fecha', () => {
    const onClose = vi.fn(); const agua = vi.fn();
    const itens = [{ id: 'agua', label: 'Copo de água', icon: Droplets, cor: 'red', onSelect: agua }, { id: 'foco', label: 'Foco', icon: Timer, cor: 'blue', onSelect: vi.fn() }];
    const { rerender } = render(<AcoesRapidas open onClose={onClose} itens={itens} />);
    expect(screen.getByRole('dialog', { name: 'O que você quer fazer?' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('acao-agua'));
    expect(agua).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    rerender(<AcoesRapidas open={false} onClose={onClose} itens={itens} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Painel novo', () => {
  const base = { habits: [], events: [], workouts: [], tags: [], user: { id: 'u1', name: 'Lia Aluna' } };

  it('mostra a saudação, as ações rápidas e "Beber água" registra com desfazer', () => {
    const setHealth = vi.fn(); const showToast = vi.fn();
    render(<PainelTab {...base} health={{ waterGlasses: 2, waterTarget: 8 }} setHealth={setHealth} showToast={showToast} />);
    expect(screen.getByText(/, Lia$/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('pn-acao-agua'));
    expect(setHealth).toHaveBeenCalledWith(expect.objectContaining({ waterGlasses: 3 }));
    expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/health', expect.objectContaining({ method: 'POST' }));
    expect(showToast).toHaveBeenCalledWith('+1 copo de água (3 de 8)', expect.any(Function));
  });

  it('as notificações reais aparecem no próprio Painel e abrem o painel completo', () => {
    const onOpenPendencias = vi.fn();
    const pendData = { convites: [{ inviteId: 'i1', title: 'Aula aberta', spaceName: 'Studio Pulso' }], avisos: [{ postId: 'p1', title: 'Semana mais leve', proName: 'Rafa', spaceName: 'Studio Pulso' }], outras: [], total: 2 };
    render(<PainelTab {...base} health={{}} setHealth={vi.fn()} pendencias={2} pendData={pendData} onOpenPendencias={onOpenPendencias} />);
    const card = screen.getByTestId('painel-notificacoes');
    expect(card.textContent).toMatch(/2 novas/);
    expect(card.textContent).toMatch(/Aula aberta/);
    expect(card.textContent).toMatch(/Semana mais leve/);
    fireEvent.click(within(card).getByRole('button', { name: 'Abrir notificações' }));
    expect(onOpenPendencias).toHaveBeenCalled();
  });

  it('sem notificações, diz que está tudo em dia', () => {
    render(<PainelTab {...base} health={{}} setHealth={vi.fn()} />);
    expect(screen.getByTestId('painel-notificacoes').textContent).toMatch(/Tudo em dia/);
  });

  it('pedidos do "+": água é registrada uma vez por pedido; sono abre o formulário', () => {
    const setHealth = vi.fn();
    const { rerender } = render(<PainelTab {...base} health={{ waterGlasses: 0, waterTarget: 8 }} setHealth={setHealth} showToast={vi.fn()} aguaRequest={111} />);
    expect(setHealth).toHaveBeenCalledTimes(1);
    rerender(<PainelTab {...base} health={{ waterGlasses: 1, waterTarget: 8 }} setHealth={setHealth} showToast={vi.fn()} aguaRequest={111} />);
    expect(setHealth).toHaveBeenCalledTimes(1);
    rerender(<PainelTab {...base} health={{ waterGlasses: 1, waterTarget: 8 }} setHealth={setHealth} showToast={vi.fn()} aguaRequest={111} sleepRequest={222} />);
    expect(screen.getByLabelText('Dormiu')).toBeTruthy();
  });

  it('sem acesso ao Foco, não oferece "Começar foco"', () => {
    render(<PainelTab {...base} health={{}} setHealth={vi.fn()} focoDisponivel={false} />);
    expect(screen.queryByTestId('pn-acao-foco')).toBeNull();
    expect(screen.getByTestId('pn-acao-agua')).toBeTruthy();
  });

  it('cartão Hoje alterna entre hábitos e agenda', () => {
    const hoje = new Date(); const p = (n) => String(n).padStart(2, '0');
    const iso = `${hoje.getFullYear()}-${p(hoje.getMonth() + 1)}-${p(hoje.getDate())}`;
    render(<PainelTab {...base} habits={[{ id: 'h1', title: 'Ler 20 páginas', completed: false }]} events={[{ id: 'e1', title: 'Reunião', date: iso, startTime: '23:58', endTime: '23:59' }]} health={{}} setHealth={vi.fn()} />);
    expect(screen.getByText('Ler 20 páginas')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Agenda/ }));
    expect(document.querySelector('.rx-spine').textContent).toMatch(/Reunião/);
  });
});

describe('notificações (painel completo)', () => {
  it('filtra por tipo e mostra a contagem', () => {
    const data = { convites: [{ inviteId: 'i1', title: 'Aula aberta', spaceName: 'S', startsAt: new Date(Date.now() + 864e5).toISOString() }], avisos: [{ postId: 'p1', title: 'Semana leve', proName: 'R', spaceName: 'S', createdAt: new Date().toISOString() }], outras: [], total: 2 };
    render(<PendenciasDrawer open data={data} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Notificações/ })).toBeTruthy();
    expect(screen.getAllByTestId('pend-convite')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Avisos/ }));
    expect(screen.queryByTestId('pend-convite')).toBeNull();
    expect(screen.getAllByTestId('pend-aviso')).toHaveLength(1);
  });
});
