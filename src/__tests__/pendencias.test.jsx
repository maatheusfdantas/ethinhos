/**
 * Lote C (telas): pendências sem bloquear, evento aceito só para leitura no Painel e na Agenda.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const calls = [];
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (json, status = 200) => ({ ok: status < 400, status, json: async () => json });
    if (url.startsWith('/api/avisos/p1')) return ok({ aviso: { postId: 'p1', title: 'Horários de dezembro', body: 'Mudamos para 19:30.', createdAt: '2026-11-20T10:00:00Z', spaceName: 'Espaço Integra', proName: 'Marta', allowComments: true }, conversa: [] });
    return ok({ success: true });
  })
}));

const { PendenciasDrawer, PendenciasBell } = await import('../components/pendencias/Pendencias');
const { toCalendarEvents } = await import('../hooks/usePendencias');
const { CalendarTab } = await import('../components/CalendarTab');

const DATA = {
  convites: [{ inviteId: 'i1', title: 'Grupo de respiração', startsAt: '2030-01-10T22:00:00Z', spaceName: 'Espaço Integra', proName: 'Marta', changed: true, lembrete: true }],
  avisos: [{ postId: 'p1', title: 'Horários de dezembro', createdAt: '2026-11-20T10:00:00Z', spaceName: 'Espaço Integra', proName: 'Marta' }],
  outras: [], total: 2
};

beforeEach(() => { calls.length = 0; });

describe('Pendências', () => {
  it('o sino mostra a contagem; o painel lista convite (com horário mudado e lembrete) e aviso', () => {
    render(<PendenciasBell total={2} onOpen={() => {}} />);
    expect(screen.getByTestId('pend-bell')).toHaveTextContent('2');
    render(<PendenciasDrawer open data={DATA} onClose={() => {}} onChanged={() => {}} />);
    expect(screen.getByTestId('pend-convite')).toHaveTextContent('Horário mudou');
    expect(screen.getByTestId('pend-convite')).toHaveTextContent('Lembrete de Marta');
    expect(screen.getByTestId('pend-aviso')).toHaveTextContent('Horários de dezembro');
  });
  it('aceitar chama o servidor e atualiza; abrir aviso permite comentar em privado', async () => {
    const changed = vi.fn();
    render(<PendenciasDrawer open data={DATA} onClose={() => {}} onChanged={changed} toast={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    await waitFor(() => expect(calls.find((c) => c.url === '/api/eventos/convites/i1/responder').body).toEqual({ resposta: 'aceito' }));
    expect(changed).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir aviso' }));
    fireEvent.change(await screen.findByLabelText(/Comentar/), { target: { value: 'Combinado!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(calls.find((c) => c.url === '/api/avisos/p1/comentarios').body).toEqual({ body: 'Combinado!' }));
  });
});

describe('Eventos dos espaços na Agenda', () => {
  it('viram itens só de leitura no fuso local (cancelado marcado no título)', () => {
    const [e] = toCalendarEvents([{ inviteId: 'i1', title: 'Grupo', startsAt: '2030-01-10T22:00:00Z', endsAt: '2030-01-10T23:00:00Z', status: 'cancelado', spaceName: 'Integra' }]);
    const local = new Date('2030-01-10T22:00:00Z');
    expect(e).toMatchObject({ id: 'space_i1', readOnly: true, cancelled: true, title: 'Grupo (cancelado)', customColor: '#E2E4F0', startTime: `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}` });
    const [ativo] = toCalendarEvents([{ inviteId: 'i2', title: 'Grupo', startsAt: '2030-01-10T22:00:00Z', endsAt: '2030-01-10T23:00:00Z', status: 'ativo', spaceName: 'Integra' }]);
    expect(ativo).toMatchObject({ title: 'Grupo', cancelled: false, customColor: '#B3C3F3' });
  });
  it('na Agenda, abrir um evento do espaço não abre o editor', () => {
    const toast = vi.fn();
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    render(<CalendarTab events={[]} friends={[]} tags={[]} showToast={toast} spaceEvents={[{ id: 'space_i1', title: 'Grupo de respiração', date: iso, endDate: iso, startTime: '19:00', endTime: '20:00', readOnly: true, spaceName: 'Integra', category: 'Integra' }]} />);
    const item = screen.getAllByText('Grupo de respiração')[0];
    // Sem o menu de concluir/editar/excluir no cartão do evento do espaço.
    expect(item.getAttribute('title')).toBe('Evento do espaço (só leitura)');
    expect(item.parentElement.querySelector('button[title="Opções do evento"]')).toBeNull();
    fireEvent.click(item);
    expect(screen.queryByText(/Editar Evento/i)).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Evento do espaço Integra'));
  });
});
