import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileModal } from '../components/ProfileModal';

describe('ProfileModal — consistência de tema claro e escuro (tokens --rx-*)', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
  });

  it('usa tokens --rx-* nos botões e rótulos de todas as seções sem cores claras fixas sobre fundo claro', () => {
    render(
      <ProfileModal
        isOpen
        onClose={vi.fn()}
        user={{ id: 'u1', name: 'Ana', username: 'ana', email: 'ana@ethos.dev' }}
        onUpdateUser={vi.fn()}
        onLogout={vi.fn()}
        health={{ glassMl: 250, waterTarget: 8 }}
        setHealth={vi.fn()}
        showToast={vi.fn()}
      />
    );

    const alterarFotoBtn = screen.getByRole('button', { name: /Alterar Foto/i });
    const alterarSenhaBtn = screen.getByRole('button', { name: /Alterar Senha/i });
    const personalizarModulosBtn = screen.getByRole('button', { name: /Personalizar Módulos do Menu Lateral/i });
    const exportarDadosBtn = screen.getByRole('button', { name: /Exportar Dados/i });
    const desativarSessaoBtn = screen.getByRole('button', { name: /Desativar Sessão/i });
    const excluirContaBtn = screen.getByRole('button', { name: /Excluir Conta Permanentemente/i });

    expect(alterarFotoBtn.style.color).toBe('var(--rx-ink)');
    expect(alterarSenhaBtn.style.color).toBe('var(--rx-ink)');
    expect(personalizarModulosBtn.style.color).toBe('var(--rx-ink)');
    expect(exportarDadosBtn.style.color).toBe('var(--rx-ink)');
    expect(desativarSessaoBtn.style.color).toBe('var(--rx-ink-2)');
    expect(excluirContaBtn.style.color).toBe('var(--rx-bad)');

    // Expande os módulos do menu lateral e verifica que o texto usa --rx-ink
    fireEvent.click(personalizarModulosBtn);
    const moduloPainel = screen.getByText('Painel Principal');
    expect(moduloPainel.style.color).toBe('var(--rx-ink)');
  });
});
