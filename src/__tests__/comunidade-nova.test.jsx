/** Proposta 14 (22/11/2026): Comunidade no visual novo, com as mesmas chamadas ao servidor; sem feed, conquistas e ofensiva. */
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ComunidadeTab } from '../components/comunidade/ComunidadeTab';

const conexoes = [
  { friend_id: 'u2', friend_name: 'Ana Ribeiro', friend_username: 'ana', friend_bio: 'Corrida às terças', status: 'approved' },
  { friend_id: 'u3', friend_name: 'Diego Alves', friend_username: 'diego', status: 'pending_received' },
  { friend_id: 'u4', friend_name: 'Elisa Prado', friend_username: 'elisap', status: 'pending_sent' }
];
let rede;
beforeEach(() => {
  rede = [{ id: 'u5', name: 'Fernanda Melo', username: 'fe.melo', bio: '', status: 'none' }, { id: 'u2', name: 'Ana Ribeiro', username: 'ana', status: 'approved' }];
  global.fetch = vi.fn((url, opts = {}) => {
    const json = (b) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(b) });
    if (url.endsWith('/connections')) return json({ connections: conexoes });
    if (url.startsWith('/api/community/users')) return json({ users: rede });
    return json({ ok: true, method: opts.method });
  });
});

function Tela() {
  const [friends, setFriends] = useState([]);
  return <ComunidadeTab user={{ id: 'u1', name: 'Lia Aluna', username: 'lia.local' }} friends={friends} setFriends={setFriends} />;
}

describe('Comunidade nova', () => {
  it('mostra seu @, os números reais e as conexões; sem feed, conquistas nem ofensiva', async () => {
    render(<Tela />);
    await waitFor(() => expect(screen.getByText('Ana Ribeiro')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Copiar seu @lia.local' })).toBeTruthy();
    expect(document.querySelector('.cm-stats').textContent).toMatch(/1conexão1pedido novo/);
    expect(document.body.textContent).not.toMatch(/Feed|Conquista|Ofensiva/i);
  });

  it('pedidos: aceitar e recusar chamam o servidor; cancelar pedido enviado também', async () => {
    render(<Tela />);
    await waitFor(() => expect(screen.getByText('Ana Ribeiro')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Pedidos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/connect/u3/accept', { method: 'PUT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/connect/u3', { method: 'DELETE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/connect/u4', { method: 'DELETE' }));
  });

  it('busca mostra o estado de cada pessoa e conectar envia o pedido', async () => {
    render(<Tela />);
    await waitFor(() => expect(screen.getByText('Ana Ribeiro')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Buscar pessoas'), { target: { value: 'fe' } });
    await waitFor(() => expect(screen.getByText('Fernanda Melo')).toBeTruthy());
    expect(global.fetch).toHaveBeenCalledWith('/api/community/users?q=fe', expect.anything());
    const resultados = screen.getAllByTestId('cm-pessoa').filter((el) => el.closest('.cm-card') && el.textContent.includes('Fernanda'));
    fireEvent.click(within(resultados[0]).getByRole('button', { name: /Conectar/ }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/connect', expect.objectContaining({ method: 'POST', body: JSON.stringify({ targetUserId: 'u5', targetUsername: 'fe.melo' }) })));
    expect(screen.getAllByText('Conectado').length).toBeGreaterThan(0);
  });

  it('desconectar pede confirmação antes de chamar o servidor', async () => {
    render(<Tela />);
    await waitFor(() => expect(screen.getByText('Ana Ribeiro')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Desconectar' }));
    const dlg = screen.getByRole('alertdialog');
    expect(global.fetch).not.toHaveBeenCalledWith('/api/user/u1/connect/u2', { method: 'DELETE' });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Desconectar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/user/u1/connect/u2', { method: 'DELETE' }));
  });

  it('sem conexões: estado vazio com orientação', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ connections: [] }) }));
    render(<Tela />);
    await waitFor(() => expect(screen.getByText('Nenhuma conexão ainda')).toBeTruthy());
  });
});
