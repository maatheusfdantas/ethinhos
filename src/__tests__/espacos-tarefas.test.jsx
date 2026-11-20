/**
 * Lote F (tela): pendências administrativas da Clínica. Limite: API simulada; o servidor é testado em tests/api.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const calls = [];
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (json, status = 200) => ({ ok: status < 400, status, json: async () => json });
    if (url === '/api/espacos/tarefas?status=abertas') return ok({ tarefas: [{ id: 't1', title: 'Confirmar a sala de sábado', dueOn: '2020-01-02', status: 'aberta', note: '' }] });
    if (url === '/api/espacos/tarefas?status=concluidas') return ok({ tarefas: [] });
    return ok({ success: true, tarefa: {} });
  })
}));

const { TarefasPage } = await import('../components/espacos/ProTarefas');
const { proModules } = await import('../components/Nav');

beforeEach(() => { calls.length = 0; });

describe('Pendências administrativas', () => {
  it('só a Clínica tem o item no menu; Personal e Nutri não', () => {
    expect(proModules({ model: 'clinica' }).map((m) => m.id)).toContain('pro-tarefas');
    expect(proModules({ model: 'personal' }).map((m) => m.id)).not.toContain('pro-tarefas');
    expect(proModules({ model: 'nutri' }).map((m) => m.id)).not.toContain('pro-tarefas');
    expect(proModules({ model: 'clinica' }).map((m) => m.id)).not.toContain('pro-conteudo');
  });
  it('lista com prazo atrasado em destaque; concluir e criar chamam o servidor', async () => {
    render(<TarefasPage pro={{ spaceName: 'Espaço Integra' }} toast={() => {}} />);
    const row = await screen.findByTestId('tarefa');
    expect(row).toHaveTextContent('atrasada');
    fireEvent.click(within(row).getByRole('button', { name: 'Concluir: Confirmar a sala de sábado' }));
    await waitFor(() => expect(calls.find((c) => c.url === '/api/espacos/tarefas/t1')?.body).toEqual({ status: 'concluida' }));
    fireEvent.click(screen.getByRole('button', { name: /Nova tarefa/ }));
    fireEvent.change(screen.getByLabelText('O que fazer'), { target: { value: 'Ver quem não respondeu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    await waitFor(() => expect(calls.find((c) => c.url === '/api/espacos/tarefas' && c.method === 'POST')?.body).toEqual({ title: 'Ver quem não respondeu', dueOn: null, note: '' }));
  });
});
