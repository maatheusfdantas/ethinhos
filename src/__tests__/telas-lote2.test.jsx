/**
 * Lote 2 (tirar a cara de IA, 21/11/2026): Hábitos, Análise e Perfil no visual atual,
 * com as mesmas ações das telas antigas, sem check-in de XP e só com números reais.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { HabitosTab } from '../components/habitos/HabitosTab';
import { AnaliseTab, resumoTreino } from '../components/analise/AnaliseTab';
import { PerfilTab } from '../components/perfil/PerfilTab';
import { ProfileModal } from '../components/ProfileModal';
import { SupportModal } from '../components/SupportModal';
import { NotesTab } from '../components/NotesTab';

const ok = (body = {}) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

function estado(inicial) {
  let state = inicial;
  const set = vi.fn((next) => { state = typeof next === 'function' ? next(state) : next; });
  return { get: () => state, set };
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn(() => ok({}));
});

describe('Hábitos (tela nova)', () => {
  const base = [
    { id: 'h1', title: 'Ler 10 páginas', category: 'Estudo', completed: false, current: 0, target: 1 },
    { id: 'h2', title: 'Beber água', category: 'Saúde', completed: false, current: 2, target: 8, unit: 'copos', completionStyle: 'numeric' },
    { id: 'h3', title: 'Correr', category: 'Saúde', completed: true, current: 5, target: 5, unit: 'km', trackingType: 'value' }
  ];

  it('marca, e o desfazer volta ao estado anterior (não marca de novo)', async () => {
    const s = estado(base);
    const showToast = vi.fn();
    render(<HabitosTab habits={base} setHabits={s.set} user={{ id: 'u1' }} showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Ler 10 páginas' }));
    expect(s.get().find((h) => h.id === 'h1').completed).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/habit/h1', expect.objectContaining({ method: 'PUT' }));
    showToast.mock.calls[0][1]();
    expect(s.get().find((h) => h.id === 'h1')).toMatchObject({ completed: false, current: 0 });
  });

  it('conta +1 e −1 no hábito de contagem', () => {
    const s = estado(base);
    render(<HabitosTab habits={base} setHabits={s.set} user={{ id: 'u1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mais 1 em Beber água' }));
    expect(s.get().find((h) => h.id === 'h2').current).toBe(3);
  });

  it('exclui com desfazer e filtra por situação e busca', () => {
    const s = estado(base);
    const showToast = vi.fn();
    const { rerender } = render(<HabitosTab habits={base} setHabits={s.set} user={{ id: 'u1' }} showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Correr' }));
    expect(s.get().map((h) => h.id)).toEqual(['h1', 'h2']);
    expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/habit/h3', { method: 'DELETE' });
    showToast.mock.calls[0][1]();
    expect(s.get().map((h) => h.id).sort()).toEqual(['h1', 'h2', 'h3']);

    rerender(<HabitosTab habits={base} setHabits={s.set} user={{ id: 'u1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pendentes' }));
    expect(screen.getAllByTestId('habito')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Buscar hábito'), { target: { value: 'água' } });
    expect(screen.getAllByTestId('habito')).toHaveLength(1);
  });
});

describe('Análise (tela nova)', () => {
  it('resumoTreino conta só sessões com série feita dentro do período', () => {
    const hoje = new Date(2026, 10, 21, 12);
    const d = (dias) => new Date(2026, 10, 21 - dias, 9).toISOString();
    const r = resumoTreino([{ startedAt: d(0), doneSets: 3 }, { startedAt: d(0), doneSets: 2 }, { startedAt: d(3), doneSets: 1 }, { startedAt: d(2), doneSets: 0 }, { startedAt: d(10), doneSets: 4 }], 7, hoje);
    expect(r).toEqual({ sessoes: 3, dias: 2 });
  });

  it('mostra hábitos de hoje e treino reais, sem índice inventado', async () => {
    const recente = new Date().toISOString();
    global.fetch = vi.fn(() => ok({ sessions: [{ startedAt: recente, doneSets: 4 }] }));
    const habits = [{ id: 'a', title: 'Ler', category: 'Estudo', completed: true }, { id: 'b', title: 'Correr', category: 'Saúde', completed: false }];
    render(<AnaliseTab habits={habits} health={{ waterGlasses: 4, waterTarget: 8, glassMl: 250 }} user={{ id: 'u1' }} />);
    expect(within(screen.getByTestId('an-habitos')).getByText('1')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('an-treino-7').textContent).toMatch(/^1/));
    expect(document.body.textContent).not.toMatch(/Índice|tendência|64,5|91,4/i);
  });
});

describe('Perfil (tela nova)', () => {
  const user = { id: 'u1', name: 'Lia Moreira', username: 'lia', bio: '', weight: 60, points: 0 };

  it('não tem mais o check-in diário de XP e mantém o XP já resgatado', () => {
    localStorage.setItem('ethos_bonus_xp_u1', '150');
    render(<PerfilTab user={user} setUser={vi.fn()} health={{ glassMl: 250 }} />);
    expect(screen.queryByText(/check-in/i)).toBeNull();
    expect(screen.getByText(/150 XP/)).toBeTruthy();
  });

  it('salva a bio no servidor', async () => {
    const setUser = vi.fn();
    render(<PerfilTab user={user} setUser={setUser} health={{}} showToast={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Treinando para os 10 km.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar bio' }));
    expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ bio: 'Treinando para os 10 km.' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/profile', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ bio: 'Treinando para os 10 km.' }) })));
  });

  it('exibe bio, objetivo e música escutada no Perfil, sem análise de progresso no rodapé nem formulários biométricos', () => {
    const onOpenSettings = vi.fn();
    render(<PerfilTab user={user} setUser={vi.fn()} health={{ glassMl: 250 }} onOpenSettings={onOpenSettings} />);
    expect(screen.getByTestId('pf-objetivo-card')).toBeTruthy();
    expect(screen.getByTestId('pf-musica-card')).toBeTruthy();
    expect(screen.queryByTestId('pf-analise-integrada')).toBeNull();
    expect(screen.queryByTestId('meta-agua')).toBeNull();
    expect(screen.queryByLabelText('Altura (cm)')).toBeNull();
    fireEvent.click(screen.getByTestId('pf-open-settings'));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('mantém Saúde (Peso e Altura) na edição do Perfil sem duplicar a seção de Água', async () => {
    let currentUser = { ...user, weight: 60 };
    const onUpdateUser = vi.fn((next) => { currentUser = next; });
    render(
      <ProfileModal
        isOpen
        onClose={vi.fn()}
        user={currentUser}
        onUpdateUser={onUpdateUser}
        health={{ glassMl: 250, waterGlasses: 0 }}
        setHealth={vi.fn()}
        showToast={vi.fn()}
      />
    );
    expect(screen.getByTestId('settings-account-sections')).toBeTruthy();
    expect(screen.queryByTestId('meta-agua')).toBeNull();

    // Seção Saúde continua com Peso (kg) e Altura (cm)
    const saude = screen.getByTestId('secao-saude');
    const pesoInput = within(saude).getByLabelText('Peso (kg)');
    const alturaInput = within(saude).getByLabelText('Altura (cm)');
    fireEvent.change(pesoInput, { target: { value: '80' } });
    fireEvent.change(alturaInput, { target: { value: '178' } });
    fireEvent.click(within(saude).getByRole('button', { name: /Salvar.*saúde/i }));
    await waitFor(() => expect(onUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ weight: 80 })));
  });

  it('Central de Ajuda & Suporte segue o sistema visual do Ethos e renderiza destaques do Guia Rápido sem falhas', () => {
    render(<SupportModal isOpen onClose={vi.fn()} user={user} showToast={vi.fn()} />);
    const modal = screen.getByTestId('support-modal');
    expect(modal.className).toMatch(/rx-dialog/);
    expect(modal.className).toMatch(/hlp-dialog/);

    // Navega para o Guia Rápido e verifica destaques formatados
    fireEvent.click(within(modal).getByRole('tab', { name: /Guia Rápido/i }));
    const guide = screen.getByTestId('support-guide-section');
    expect(guide.textContent).toMatch(/35 ml \/ kg/);
    expect(guide.textContent).toMatch(/Saúde e Hidratação Diária/);
    expect(guide.querySelectorAll('.hlp-highlight').length).toBeGreaterThanOrEqual(3);
  });

  it('Notas abre o modal de criação com o sistema de diálogo atual e persiste a nota criada', () => {
    const setUser = vi.fn();
    render(<NotesTab user={user} setUser={setUser} showToast={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Nova nota/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toMatch(/rx-dialog/);
    expect(dialog.className).toMatch(/nt-form/);

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Ideia de leitura' } });
    fireEvent.change(screen.getByLabelText(/^Nota$/i), { target: { value: 'Ler 20 páginas antes de dormir.' } });
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }));
    expect(screen.getByText('Ideia de leitura')).toBeTruthy();
  });
});
