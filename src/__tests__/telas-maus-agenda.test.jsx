/**
 * Proposta 09 (21/11/2026): Maus hábitos e Agenda no visual atual, com as mesmas ações das telas antigas,
 * sem números inventados e sem o botão simulado do Google Agenda.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MausHabitosTab, tempoLimpo, marcos } from '../components/maus/MausHabitosTab';
import { AgendaTab, expandirRecorrencias, isoDia } from '../components/agenda/AgendaTab';

const ok = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
const DIA = 24 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
  global.fetch = vi.fn(ok);
});

describe('Maus hábitos (tela nova)', () => {
  const user = { id: 'u1' };
  const guardar = (lista) => localStorage.setItem('ethos_bad_habits_u1', JSON.stringify(lista));
  const habito = (dias, extra = {}) => ({ id: 'bh1', title: 'Refrigerante', category: 'Saúde', started_at: new Date(Date.now() - dias * DIA - 60000).toISOString(), cost_per_day: 6, best_streak_days: 0, relapse_count: 0, relapses: [], motivational_reason: 'Menos açúcar.', ...extra });

  it('tempo e marcos são calculados a partir do início', () => {
    const agora = Date.UTC(2026, 10, 21, 12);
    expect(tempoLimpo(new Date(agora - (12 * DIA + 4 * 3600000 + 31 * 60000)).toISOString(), agora)).toEqual({ dias: 12, horas: 4, minutos: 31 });
    expect(marcos(12)).toMatchObject({ atual: '1 semana', proximo: 14, falta: 2 });
    expect(marcos(0)).toMatchObject({ atual: 'Primeiro dia', proximo: 1 });
  });

  it('mostra contagem, recorde e economia reais, sem "ganho de foco" inventado, e não grava ao abrir', () => {
    guardar([habito(40)]);
    render(<MausHabitosTab user={user} />);
    const card = screen.getByTestId('mau-habito');
    expect(within(card).getByLabelText(/40 dias/)).toBeTruthy();
    expect(card.textContent).toMatch(/Recorde 40 dias/);
    expect(card.textContent).toMatch(/R\$ 240,00/);
    expect(document.body.textContent).not.toMatch(/Recuperação de Foco|clareza cognitiva|%/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('recaída recomeça a contagem, guarda o recorde e a anotação, e salva no perfil', () => {
    guardar([habito(12, { best_streak_days: 19 })]);
    const showToast = vi.fn();
    render(<MausHabitosTab user={user} showToast={showToast} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recaída' }));
    fireEvent.change(screen.getByLabelText('O que puxou a vontade?'), { target: { value: 'Tédio' } });
    fireEvent.change(screen.getByLabelText(/O que você quer tentar/), { target: { value: 'Celular fora do quarto.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar a contagem' }));
    const salvo = JSON.parse(localStorage.getItem('ethos_bad_habits_u1'))[0];
    expect(salvo.best_streak_days).toBe(19);
    expect(salvo.relapse_count).toBe(1);
    expect(salvo.relapses[0]).toMatchObject({ days_achieved: 12, trigger: 'Tédio', lesson: 'Celular fora do quarto.' });
    expect(tempoLimpo(salvo.started_at).dias).toBe(0);
    expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/profile', expect.objectContaining({ method: 'PUT' }));
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/recorde de 19 dias/));
  });

  it('cria com sugestão, inicia a contagem exatamente no instante da criação (0 dias, 0h, 0min) e exclui com confirmação', () => {
    const antes = Date.now();
    render(<MausHabitosTab user={user} showToast={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Novo acompanhamento|Começar um acompanhamento/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Apostas' }));
    fireEvent.change(screen.getByLabelText(/Quanto gastava/), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Período do gasto'), { target: { value: 'week' } });
    fireEvent.click(screen.getByRole('button', { name: 'Começar a contar' }));
    const depois = Date.now();
    let lista = JSON.parse(localStorage.getItem('ethos_bad_habits_u1'));
    expect(lista[0]).toMatchObject({ title: 'Apostas / Jogos de Azar (Bets)', cost_per_day: 10, cost_period: 'week', cost_value: 70 });

    // O timestamp started_at deve corresponder ao exato instante da criação (e nunca 00:00 do dia)
    const inicioMs = new Date(lista[0].started_at).getTime();
    expect(inicioMs).toBeGreaterThanOrEqual(antes);
    expect(inicioMs).toBeLessThanOrEqual(depois);
    expect(tempoLimpo(lista[0].started_at, depois)).toEqual({ dias: 0, horas: 0, minutos: 0 });
    expect(screen.getByLabelText(/0 dias, 0 horas e 0 minutos sem recaída/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Excluir Apostas/ }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));
    lista = JSON.parse(localStorage.getItem('ethos_bad_habits_u1'));
    expect(lista).toEqual([]);
  });

  it('o apoio imediato tem o CVV 188 e os quatro exercícios', () => {
    render(<MausHabitosTab user={user} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preciso de ajuda agora' }));
    const d = screen.getByRole('dialog');
    expect(within(d).getByRole('link', { name: /Ligar 188/ }).getAttribute('href')).toBe('tel:188');
    for (const n of ['Respiração', '5-4-3-2-1', 'Onda de 15 min', 'Água fria']) expect(within(d).getByRole('button', { name: n })).toBeTruthy();
    fireEvent.click(within(d).getByRole('button', { name: 'Onda de 15 min' }));
    expect(within(d).getByText('15:00')).toBeTruthy();
  });

  it('permite editar o nome após criado e abandonar com mensagem acolhedora sem culpar o usuário', () => {
    guardar([habito(5)]);
    const showToast = vi.fn();
    render(<MausHabitosTab user={user} showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: /Editar nome de Refrigerante/i }));
    fireEvent.change(screen.getByLabelText('Novo nome do mau hábito'), { target: { value: 'Refrigerante Zero e Comum' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));

    let lista = JSON.parse(localStorage.getItem('ethos_bad_habits_u1'));
    expect(lista[0].title).toBe('Refrigerante Zero e Comum');

    fireEvent.click(screen.getByRole('button', { name: /Abandonar Refrigerante Zero e Comum/i }));
    const dialog = screen.getByTestId('mh-abandonar-dialog');
    expect(dialog.textContent).toMatch(/Não se culpe/i);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abandonar sem culpa' }));

    lista = JSON.parse(localStorage.getItem('ethos_bad_habits_u1'));
    expect(lista).toEqual([]);
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/sem culpa/i));
  });
});

describe('Agenda (tela nova)', () => {
  const hoje = isoDia(new Date());

  it('expande eventos semanais nos dias escolhidos', () => {
    const base = [{ id: 'e1', title: 'Inglês', date: '2026-11-03', repeat: 'Semanal', repeatConfig: { repeatDays: [2, 4] } }];
    const r = expandirRecorrencias(base, new Date(2026, 10, 15));
    const datas = r.filter((e) => e.isRecurrence).map((e) => e.date);
    expect(datas).toContain('2026-11-05');
    expect(datas).toContain('2026-11-10');
    expect(datas).not.toContain('2026-11-06');
  });

  it('mostra eventos do dia, conclui e exclui com confirmação; sem botão do Google', () => {
    const onToggleEvent = vi.fn(); const onDeleteEvent = vi.fn();
    const events = [{ id: 'e1', title: 'Revisão do TCC', date: hoje, endDate: hoje, startTime: '14:00', endTime: '16:00', category: 'Estudo' }];
    render(<AgendaTab events={events} tags={[{ name: 'Estudo', color: '#A78BFA' }]} onToggleEvent={onToggleEvent} onDeleteEvent={onDeleteEvent} showToast={vi.fn()} />);
    expect(screen.getAllByTestId('ag-evento')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Concluir Revisão do TCC' }));
    expect(onToggleEvent).toHaveBeenCalledWith('e1', true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Revisão do TCC' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));
    expect(onDeleteEvent).toHaveBeenCalledWith('e1');
    expect(document.body.textContent).not.toMatch(/Conectar com o Google/i);
  });

  it('editar mantém "concluído" e envia o evento completo', () => {
    const setEvents = vi.fn();
    const events = [{ id: 'e1', title: 'Dentista', date: hoje, endDate: hoje, startTime: '08:30', endTime: '09:00', category: '', completed: true, allDay: false, repeatConfig: {} }];
    render(<AgendaTab user={{ id: 'u1' }} events={events} setEvents={setEvents} showToast={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Dentista' }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Dentista (retorno)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar evento' }));
    const atualizado = setEvents.mock.calls[0][0](events)[0];
    expect(atualizado).toMatchObject({ title: 'Dentista (retorno)', completed: true });
    const [url, opts] = global.fetch.mock.calls.find(([u]) => u === '/api/user/u1/event');
    expect(url).toBe('/api/user/u1/event');
    expect(JSON.parse(opts.body)).toMatchObject({ id: 'e1', completed: true });
  });

  it('cria evento novo pela ação de adicionar', () => {
    const onAddEvent = vi.fn();
    render(<AgendaTab events={[]} onAddEvent={onAddEvent} showToast={vi.fn()} />);
    expect(screen.getByText('Nada marcado para este dia.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Novo evento' }));
    expect(screen.getByTestId('cal-sem-categoria')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Mercado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar evento' }));
    expect(onAddEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mercado', date: hoje, completed: false }));
  });

  it('evento de espaço é só leitura (sem concluir, editar nem excluir)', () => {
    const showToast = vi.fn();
    render(<AgendaTab events={[]} showToast={showToast} spaceEvents={[{ id: 'space_i1', title: 'Grupo de respiração', date: hoje, endDate: hoje, startTime: '19:00', endTime: '20:00', readOnly: true, spaceName: 'Integra', category: 'Integra' }]} />);
    const linha = screen.getByTestId('ag-evento');
    expect(linha.textContent).toMatch(/Integra, só leitura/);
    expect(within(linha).queryByRole('button')).toBeNull();
  });
});

describe('Agenda: mês em blocos e próximos em cartões (proposta 11)', () => {
  const hoje = isoDia(new Date());
  const ev = (id, title, startTime, extra = {}) => ({ id, title, date: hoje, endDate: hoje, startTime, endTime: '23:00', category: 'Estudo', ...extra });

  it('dia com até 2 eventos mostra título e horário; com mais, o primeiro e pontos para o resto', () => {
    const { container, rerender } = render(<AgendaTab events={[ev('e1', 'Inglês', '08:00'), ev('e2', 'Revisão', '09:00')]} tags={[{ name: 'Estudo', color: '#A78BFA' }]} showToast={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));
    let dia = container.querySelector('.ag-day.today');
    expect([...dia.querySelectorAll('.ag-tick b')].map((b) => b.textContent)).toEqual(['Inglês', 'Revisão']);
    expect(dia.querySelector('.ag-tick small').textContent).toBe('08:00');
    expect(dia.querySelector('.ag-dots.rest')).toBeNull();
    rerender(<AgendaTab events={[ev('e1', 'Inglês', '08:00'), ev('e2', 'Revisão', '09:00'), ev('e3', 'Grupo', '19:00')]} tags={[{ name: 'Estudo', color: '#A78BFA' }]} showToast={vi.fn()} />);
    dia = container.querySelector('.ag-day.today');
    expect(dia.querySelectorAll('.ag-tick')).toHaveLength(1);
    expect(dia.querySelectorAll('.ag-dots.rest i')).toHaveLength(2);
    expect(dia.getAttribute('aria-label')).toMatch(/3 eventos/);
  });

  it('próximos eventos aparecem em cartões com data, título, horário e categoria', () => {
    render(<AgendaTab events={[ev('e1', 'Dentista', '08:30', { endTime: '09:00', category: 'Saúde', location: 'Clínica' })]} showToast={vi.fn()} />);
    const card = screen.getByTestId('ag-proximo');
    expect(card.textContent).toMatch(/^Hoje/);
    expect(card.textContent).toMatch(/Dentista/);
    expect(card.textContent).toMatch(/08:30 às 09:00/);
    expect(card.textContent).toMatch(/Saúde, Clínica/);
  });
});
