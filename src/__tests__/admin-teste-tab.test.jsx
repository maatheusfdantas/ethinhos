import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('Portal do Administrador — Remoção do Laboratório Experimental', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não exibe o Laboratório Experimental nem o Mascote Lumo 2.0 e mantém as seções administrativas funcionando', async () => {
    render(<AdminPortalTab />);

    // Aguarda carregar dados iniciais
    expect(await screen.findByText(/Total de Contas/i)).toBeInTheDocument();

    // Não deve exibir botão de aba Teste nem Laboratório Experimental / Lumo 2.0
    expect(screen.queryByRole('button', { name: /^teste$/i })).toBeNull();
    expect(screen.queryByText(/Laboratório Experimental/i)).toBeNull();
    expect(screen.queryByText(/Mascote Lumo 2\.0/i)).toBeNull();
    expect(screen.queryByTestId('pomodo-card')).toBeNull();

    // Demais abas administrativas continuam funcionando
    const tokensTabBtn = screen.getByRole('button', { name: /Tokens \(48h\)/i });
    fireEvent.click(tokensTabBtn);
    expect(screen.getByText(/Total de Contas/i)).toBeInTheDocument();
  });
});
