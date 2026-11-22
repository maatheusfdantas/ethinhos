/** Proposta 13 (22/11/2026): criar hábito ou evento no visual novo, gravando os mesmos campos do modal antigo. */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CriarModal } from '../components/criar/CriarModal';

const tags = [
  { id: 'tag_saude', name: 'Saúde', color: '#16A34A' },
  { id: 'tag_facul', name: 'Faculdade', color: '#7C3AED', has_subclasses: true, subclasses: [{ id: 's1', name: 'Redes' }, { id: 's2', name: 'TCC' }] }
];
const abrir = (props = {}) => {
  const onAddHabit = vi.fn(); const onAddEvent = vi.fn(); const onClose = vi.fn();
  render(<CriarModal isOpen tags={tags} onAddHabit={onAddHabit} onAddEvent={onAddEvent} onClose={onClose} {...props} />);
  return { onAddHabit, onAddEvent, onClose };
};

describe('Criar hábito', () => {
  it('padrão: marcar como feito, todo dia, primeira categoria; mesmo formato de antes', () => {
    const { onAddHabit, onClose } = abrir({ initialMode: 'habit' });
    const criar = screen.getByRole('button', { name: 'Criar hábito' });
    expect(criar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Nome do hábito'), { target: { value: 'Beber água' } });
    expect(criar.disabled).toBe(false);
    fireEvent.click(criar);
    expect(onAddHabit).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Beber água', category: 'Saúde', tagId: 'tag_saude', target: 1, unit: 'vez', current: 0, completed: false,
      trackingType: 'done', completionStyle: 'quick', periodType: 'day', repeatDays: [0, 1, 2, 3, 4, 5, 6],
      priority: 'Média', effort: 'Médio', subclassId: null
    }));
    expect(onAddHabit.mock.calls[0][0].periodConfig).toMatchObject({ dayFrequency: 'daily', timesPerWeek: 3, customIntervalDays: 2 });
    expect(onClose).toHaveBeenCalled();
  });

  it('contador com meta, unidade, dias da semana, subcategoria e prioridade', () => {
    const { onAddHabit } = abrir({ initialMode: 'habit' });
    fireEvent.change(screen.getByLabelText('Nome do hábito'), { target: { value: 'Ler' } });
    fireEvent.click(screen.getByRole('button', { name: /Contador/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar a meta' }));
    fireEvent.click(screen.getByRole('button', { name: 'páginas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dias da semana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sex' }));
    fireEvent.click(screen.getByRole('button', { name: /Faculdade/ }));
    fireEvent.click(screen.getByRole('button', { name: 'TCC' }));
    fireEvent.click(screen.getByRole('button', { name: /Alta/ }));
    expect(document.querySelector('.cr-sum').textContent).toMatch(/Seg, Ter, Qua, Qui · 4 páginas · Faculdade › TCC/);
    fireEvent.click(screen.getByRole('button', { name: 'Criar hábito' }));
    expect(onAddHabit).toHaveBeenCalledWith(expect.objectContaining({
      trackingType: 'counter', completionStyle: 'increment', target: 4, unit: 'páginas', repeatDays: [1, 2, 3, 4],
      category: 'Faculdade', tagId: 'tag_facul', subclassId: 's2', subclassName: 'TCC', priority: 'Alta', periodType: 'day'
    }));
    expect(onAddHabit.mock.calls[0][0].periodConfig.dayFrequency).toBe('weekdays');
  });

  it('intervalo vira período personalizado', () => {
    const { onAddHabit } = abrir({ initialMode: 'habit' });
    fireEvent.change(screen.getByLabelText('Nome do hábito'), { target: { value: 'Regar plantas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Intervalo' }));
    fireEvent.change(screen.getByLabelText('Intervalo em dias'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar hábito' }));
    expect(onAddHabit.mock.calls[0][0]).toMatchObject({ periodType: 'custom', periodConfig: { customIntervalType: 'every_x_days', customIntervalDays: 3 } });
  });

  it('sem categorias: aviso e atalho para criar', () => {
    const onCreateCategory = vi.fn();
    abrir({ initialMode: 'habit', tags: [], onCreateCategory });
    expect(screen.getByRole('note').textContent).toMatch(/sem categoria/);
    fireEvent.click(screen.getByRole('button', { name: 'Criar categoria' }));
    expect(onCreateCategory).toHaveBeenCalled();
  });
});

describe('Criar evento', () => {
  it('por padrão horário não vem marcado (dia inteiro); semanal por número de vezes; campos fora da tela seguem com os valores padrão', () => {
    const { onAddEvent } = abrir({ initialMode: 'event' });
    fireEvent.change(screen.getByLabelText('Nome do evento'), { target: { value: 'Aula de inglês' } });
    const sw = screen.getByRole('switch', { name: 'Atribuir horário' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText('Início')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Semanal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Número de vezes' }));
    fireEvent.change(screen.getByLabelText('Número de vezes'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar evento' }));
    expect(onAddEvent).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Aula de inglês', allDay: true, isFloating: true, startTime: '00:00', endTime: '23:59', category: 'Saúde', repeat: 'Semanal',
      reminders: [{ id: 'rem_1', time: '15 min antes', channel: 'app' }], visibility: 'private', conflictPolicy: 'allow',
      energyLevel: 'deep_focus', bufferBefore: 0, bufferAfter: 0, participants: [], completed: false
    }));
    expect(onAddEvent.mock.calls[0][0].repeatConfig).toMatchObject({ repeatEndType: 'count', repeatCount: 8, repeatDays: [1, 2, 3, 4, 5], repeatInterval: 1, blackoutDates: [] });
  });

  it('ao marcar Atribuir horário permite alterar a hora; data de hoje é a local; detalhes opcionais e datas a pular entram no evento', () => {
    const { onAddEvent } = abrir({ initialMode: 'event' });
    const d = new Date(); const p = (n) => String(n).padStart(2, '0');
    expect(screen.getByLabelText('Data').value).toBe(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    fireEvent.change(screen.getByLabelText('Nome do evento'), { target: { value: 'Reunião' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Atribuir horário' }));
    expect(screen.getByLabelText('Início').value).toBe('09:00');
    fireEvent.click(screen.getByRole('button', { name: 'Diário' }));
    fireEvent.change(screen.getByLabelText(/Local/), { target: { value: 'Sala 2' } });
    fireEvent.change(screen.getByLabelText('Data a pular'), { target: { value: '2026-12-25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    fireEvent.change(screen.getByLabelText(/Participantes/), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar evento' }));
    expect(onAddEvent.mock.calls[0][0]).toMatchObject({ location: 'Sala 2', participantsText: 'Ana', startTime: '09:00', endTime: '10:00', allDay: false, repeat: 'Diário', repeatConfig: { blackoutDates: ['2026-12-25'] } });
  });

  it('não mostra lembretes, e-mail, visibilidade nem conflitos; Esc fecha; troca para hábito', () => {
    const { onClose } = abrir({ initialMode: 'event' });
    expect(document.body.textContent).not.toMatch(/Resend|Lembrete|Visibilidade|Conflito|Buffer|Energia/i);
    fireEvent.click(screen.getByRole('button', { name: 'Hábito' }));
    expect(screen.getByRole('heading', { name: 'Novo hábito' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
