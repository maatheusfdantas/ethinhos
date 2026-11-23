import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupportModal } from '../components/SupportModal';

describe('SupportModal (Central de Ajuda e Suporte)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renderiza o modal aberto com título, abas e categorias bem dimensionadas', () => {
    const onClose = vi.fn();
    render(<SupportModal isOpen onClose={onClose} user={{ id: 'u1', name: 'Ana', email: 'ana@teste.com' }} />);

    expect(screen.getByText('Central de Ajuda & Suporte')).toBeDefined();
    expect(screen.getByRole('button', { name: /\+ Abrir Novo Chamado/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Meus Chamados/i })).toBeDefined();

    // Categorias de ticket
    expect(screen.getByText('Bug / Erro no Sistema')).toBeDefined();
    expect(screen.getByText('Dúvida sobre Funcionalidade')).toBeDefined();
    expect(screen.getByText('Minha Conta & Acesso')).toBeDefined();
    expect(screen.getByText('Sugestão de Melhoria')).toBeDefined();
  });

  it('permite selecionar categoria, preencher assunto e enviar ticket', async () => {
    const showToast = vi.fn();
    const onClose = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    render(
      <SupportModal
        isOpen
        onClose={onClose}
        user={{ id: 'u1', name: 'Ana', email: 'ana@teste.com' }}
        showToast={showToast}
      />
    );

    // Selecionar categoria "Bug / Erro no Sistema"
    fireEvent.click(screen.getByText('Bug / Erro no Sistema'));

    // Preencher campos
    const inputAssunto = screen.getByLabelText(/Assunto Resumido/i);
    const textareaDesc = screen.getByLabelText(/Descrição Detalhada/i);
    fireEvent.change(inputAssunto, { target: { value: 'Erro ao sincronizar copo' } });
    fireEvent.change(textareaDesc, { target: { value: 'Ao registrar água no painel, o valor demorou para salvar.' } });

    // Enviar formulário
    const btnSubmit = screen.getByRole('button', { name: /Enviar Chamado ao Suporte/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Ticket de suporte enviado'));
    });

    // Salvo no localStorage
    const saved = JSON.parse(localStorage.getItem('ethos_support_tickets_v1') || '[]');
    expect(saved.length).toBe(1);
    expect(saved[0].subject).toBe('Erro ao sincronizar copo');
    expect(saved[0].category).toBe('bug');
  });

  it('permite visualizar a lista de chamados anteriores', async () => {
    localStorage.setItem(
      'ethos_support_tickets_v1',
      JSON.stringify([
        {
          id: 'tkt_123',
          user_id: 'u1',
          subject: 'Meu chamado anterior',
          category: 'duvida',
          module: 'Painel Principal & Categorias',
          priority: 'Alta',
          message: 'Como altero minha meta diária?',
          status: 'resolvido',
          admin_reply: 'Basta acessar as configurações no card.',
          created_at: new Date().toISOString()
        }
      ])
    );

    render(
      <SupportModal
        isOpen
        onClose={vi.fn()}
        user={{ id: 'u1', name: 'Ana', email: 'ana@teste.com' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Meus Chamados/i }));

    await waitFor(() => {
      expect(screen.getByText('Meu chamado anterior')).toBeDefined();
      expect(screen.getByText(/Como altero minha meta diária\?/i)).toBeDefined();
      expect(screen.getByText(/Resposta da Equipe Ethos/i)).toBeDefined();
      expect(screen.getByText(/Basta acessar as configurações no card/i)).toBeDefined();
    });
  });
});
