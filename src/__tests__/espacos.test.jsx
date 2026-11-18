/**
 * Espaços profissionais (lotes A e B): telas da pessoa, do profissional e o menu.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const calls = [];
let previa = null;
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url, method, body });
    const ok = (json, status = 200) => ({ ok: status < 400, status, json: async () => json });
    if (url === '/api/espacos/meus') return ok({ espacos: [] });
    if (url === '/api/espacos/convites/previa') return previa ? ok({ convite: previa }) : ok({ error: 'Este código não vale mais ou não existe. Peça um novo ao profissional.' }, 404);
    if (url === '/api/espacos/convites/aceitar') return body.adult ? ok({ success: true }, 201) : ok({ error: 'Confirme' }, 400);
    if (url === '/api/espacos/meu') return ok({ pro: { model: 'personal', modelLabel: 'Personal', peopleLabel: 'Alunos', status: 'ativo', spaceName: 'Studio Pulso' }, turmas: [{ id: 'g1', name: 'Força', description: '', status: 'ativa', members: 0, inviteUntil: null, inviteId: null }], pessoas: { total: 0, ultimos7dias: 0 } });
    if (url === '/api/espacos/pessoas') return ok({ pessoas: [] });
    if (url === '/api/espacos/turmas/g1') return ok({ turma: { id: 'g1', name: 'Força' }, membros: [] });
    if (url === '/api/espacos/turmas/g1/convite') return ok({ code: 'K7QM-2XRB', expiresAt: new Date(Date.now() + 86400000).toISOString() }, 201);
    return ok({});
  })
}));

const { EspacosTab } = await import('../components/espacos/EspacosTab');
const { ProEspaco } = await import('../components/espacos/ProEspaco');
const { DesktopSidebar } = await import('../components/Nav');

beforeEach(() => { calls.length = 0; previa = null; });

describe('Espaços (pessoa)', () => {
  it('código inválido mostra a mensagem única', async () => {
    render(<EspacosTab />);
    fireEvent.change(screen.getByLabelText(/Código ou link do convite/i), { target: { value: 'ZZZZ-ZZZZ' } });
    fireEvent.click(screen.getByRole('button', { name: /Ver convite/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não vale mais ou não existe/);
  });

  it('prévia não cria nada; entrar exige maioridade', async () => {
    previa = { spaceName: 'Studio Pulso', modelLabel: 'Personal', proName: 'Rafa', kind: 'turma', groupName: 'Força', hasLink: false, already: false };
    const toast = vi.fn();
    render(<EspacosTab showToast={toast} />);
    fireEvent.change(screen.getByLabelText(/Código ou link do convite/i), { target: { value: 'K7QM-2XRB' } });
    fireEvent.click(screen.getByRole('button', { name: /Ver convite/i }));
    const dlg = await screen.findByRole('dialog');
    expect(dlg).toHaveTextContent('Força');
    expect(calls.some((c) => c.url.endsWith('/aceitar'))).toBe(false);
    fireEvent.click(within(dlg).getByRole('button', { name: /Entrar na turma/i }));
    expect(calls.some((c) => c.url.endsWith('/aceitar'))).toBe(false);
    fireEvent.click(within(dlg).getByLabelText(/18 anos ou mais/i));
    fireEvent.click(within(dlg).getByRole('button', { name: /Entrar na turma/i }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/aceitar')).body).toEqual({ code: 'K7QM-2XRB', adult: true }));
  });
});

describe('Meu espaço (profissional)', () => {
  it('gera o código de 24 h e mostra uma vez', async () => {
    render(<ProEspaco view="pro-turmas" pro={{ status: 'ativo' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Gerar código de 24 h/i }));
    expect(await screen.findByTestId('es-code')).toHaveTextContent('K7QM-2XRB');
  });
});

describe('Menu', () => {
  const base = { activeTab: 'dashboard', setActiveTab: () => {}, user: { name: 'Lia' }, tags: [] };
  it('sem perfil profissional: tem Espaços e não tem o seletor de contexto', () => {
    render(<DesktopSidebar {...base} pro={null} />);
    expect(screen.getByRole('button', { name: 'Espaços' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Contexto' })).toBeNull();
  });
  it('profissional ativo: seletor; em Meu espaço o menu troca e as categorias somem', () => {
    const toggle = vi.fn();
    const pro = { status: 'ativo', spaceName: 'Studio Pulso', modelLabel: 'Personal', peopleLabel: 'Alunos' };
    const { rerender } = render(<DesktopSidebar {...base} pro={pro} proMode={false} onToggleProMode={toggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Meu espaço' }));
    expect(toggle).toHaveBeenCalledWith(true);
    rerender(<DesktopSidebar {...base} pro={pro} proMode onToggleProMode={toggle} />);
    expect(screen.getByRole('button', { name: 'Alunos' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Categorias' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hábitos e rotinas' })).toBeNull();
  });
  it('profissional suspenso: sem seletor', () => {
    render(<DesktopSidebar {...base} pro={{ status: 'suspenso' }} proMode />);
    expect(screen.queryByRole('group', { name: 'Contexto' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Hábitos e rotinas' })).toBeInTheDocument();
  });
});
