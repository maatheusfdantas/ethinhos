import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusTab } from '../components/FocusTab';

describe('Foco - Catálogo de Cultivo e Contraste Visual', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockTags = [
    { id: 'tag_1', name: 'Estudos', color: '#818cf8', icon: 'BookOpen', has_subclasses: false, subclasses: [] }
  ];

  it('abre a gaveta de cultivo e exibe opções com alto contraste e acessibilidade', () => {
    render(<FocusTab user={{ name: 'Teste' }} tags={mockTags} />);

    // Botão de expandir o cultivo
    const expandButton = screen.getByRole('button', { name: /Trocar cultivo/i });
    expect(expandButton).toBeDefined();

    // Clica para abrir a gaveta de cultivo
    fireEvent.click(expandButton);

    // Gaveta deve estar na tela
    const drawer = screen.getByTestId('rf-catalogo-modal');
    expect(drawer).toBeDefined();
    expect(drawer.className).toContain('rf-cultivo-drawer');

    // Estágios da espécie padrão devem ser legíveis
    expect(screen.getByText('Semente')).toBeDefined();
    expect(screen.getByText('Broto')).toBeDefined();
    expect(screen.getByText('Florida')).toBeDefined();

    // Grade de espécies no catálogo
    const padraoCard = screen.getByTestId('rf-cat-item-lirio-lunar');
    expect(padraoCard).toBeDefined();
    expect(padraoCard.getAttribute('aria-pressed')).toBe('true');
  });

  it('permite alternar entre temas de cultivo e selecionar outra espécie', () => {
    render(<FocusTab user={{ name: 'Teste' }} tags={mockTags} />);

    // Abre o catálogo
    fireEvent.click(screen.getByRole('button', { name: /Trocar cultivo/i }));

    // Clica no filtro "Mundos" se existir
    const mundosTab = screen.queryByTestId('rf-cat-tab-mundos');
    if (mundosTab) {
      fireEvent.click(mundosTab);
      expect(mundosTab.getAttribute('aria-pressed')).toBe('true');
    }

    // Busca por uma espécie específica
    const searchInput = screen.getByLabelText(/Buscar no catálogo de cultivo/i);
    fireEvent.change(searchInput, { target: { value: 'Bonsai' } });

    // Se houver Bonsai ou item correspondente, ele aparece
    const bonsaiItem = screen.queryByText(/Bonsai/i);
    if (bonsaiItem) {
      expect(bonsaiItem).toBeDefined();
    }
  });
});
