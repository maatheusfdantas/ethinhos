import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AdminPortalTab } from '../components/AdminPortalTab';

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({
      users: [
        { id: 'u1', name: 'Admin Teste', username: 'admin', email: 'admin@ethos.test', role: 'admin', is_active: 1, permissions: [] }
      ],
      waitlist: [],
      tickets: [],
      logs: []
    })
  }))
}));

describe('Aba Teste no Portal do Administrador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe a aba Teste na navegação e ao acessá-la mostra apenas o botão Voltar', async () => {
    render(<AdminPortalTab />);

    // Aguarda carregar dados iniciais e renderizar a navegação
    const testeTabBtn = await screen.findByRole('button', { name: /teste/i });
    expect(testeTabBtn).toBeInTheDocument();

    // Inicialmente, na aba 'users', as estatísticas aparecem
    expect(screen.getByText(/Total de Contas/i)).toBeInTheDocument();

    // Clica na aba Teste
    fireEvent.click(testeTabBtn);

    // Na aba Teste: o botão Voltar deve estar visível
    const voltarBtn = screen.getByRole('button', { name: /voltar/i });
    expect(voltarBtn).toBeInTheDocument();

    // Estatísticas (Bento Grid) e seções não devem aparecer
    expect(screen.queryByText(/Total de Contas/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Buscar por nome/i)).not.toBeInTheDocument();

    // Clica no botão Voltar para retornar
    fireEvent.click(voltarBtn);

    // Retorna para a aba anterior (Usuários) com as estatísticas de volta
    await waitFor(() => {
      expect(screen.getByText(/Total de Contas/i)).toBeInTheDocument();
    });
  });
});
