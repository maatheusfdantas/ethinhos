import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PainelTab } from '../components/PainelTab';

describe('PainelTab - Gestão e sugestão de água no painel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const baseProps = {
    habits: [],
    setHabits: vi.fn(),
    events: [],
    workouts: [],
    health: { waterGlasses: 3, waterTarget: 8, glassMl: 250 },
    setHealth: vi.fn(),
    tags: [],
    user: { id: 'u1', name: 'Ana', weight: 70 },
    showToast: vi.fn()
  };

  it('exibe botão para editar a meta de água no card do painel', () => {
    render(<PainelTab {...baseProps} />);
    const btnEditar = screen.getByRole('button', { name: /Editar meta de água/i });
    expect(btnEditar).toBeDefined();
  });

  it('abre modal/painel de edição e exibe a sugestão baseada no peso da pessoa (70kg x 35ml = 2.45L)', () => {
    render(<PainelTab {...baseProps} />);
    const btnEditar = screen.getByRole('button', { name: /Editar meta de água/i });
    fireEvent.click(btnEditar);

    // Modal deve estar aberto
    expect(screen.getByText(/Meta de Hidratação Diária/i)).toBeDefined();
    // Exibe cálculo de sugestão por pessoa (70 * 35 = 2450ml = 10 copos de 250ml)
    expect(screen.getByText(/Sugestão personalizada/i)).toBeDefined();
    expect(screen.getByText(/2,45 L por dia/i)).toBeDefined();
  });

  it('permite aplicar a sugestão calculada e salvar a nova meta', () => {
    const setHealth = vi.fn();
    const showToast = vi.fn();
    render(<PainelTab {...baseProps} setHealth={setHealth} showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: /Editar meta de água/i }));

    // Clica no botão para usar sugestão calculada
    const btnUsarSugestao = screen.getByRole('button', { name: /Aplicar sugestão/i });
    fireEvent.click(btnUsarSugestao);

    // Clica em salvar
    const btnSalvar = screen.getByRole('button', { name: /Salvar meta/i });
    fireEvent.click(btnSalvar);

    expect(setHealth).toHaveBeenCalledWith(
      expect.objectContaining({
        waterTarget: 10,
        glassMl: 250
      })
    );
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Meta de água atualizada'));
  });

  it('mantém sugestões rápidas de copo, permite digitar ml personalizados e recalcula automaticamente quantos copos são', () => {
    const setHealth = vi.fn();
    render(<PainelTab {...baseProps} setHealth={setHealth} />);

    fireEvent.click(screen.getByRole('button', { name: /Editar meta de água/i }));

    // Sugestões rápidas de tamanho do copo continuam disponíveis
    expect(screen.getByRole('button', { name: '200 ml' })).toBeDefined();
    expect(screen.getByRole('button', { name: '250 ml' })).toBeDefined();
    expect(screen.getByRole('button', { name: '500 ml' })).toBeDefined();

    // Usuário digita um tamanho personalizado de copo (400 ml)
    const inputCopoMl = screen.getByLabelText(/Tamanho do copo personalizado \(ml\)/i);
    fireEvent.change(inputCopoMl, { target: { value: '400' } });

    // 70 kg * 35 ml = 2450 ml / 400 ml = 6,125 -> 7 copos
    expect(screen.getByTestId('painel-agua-sugestao').textContent).toMatch(/7 copos/);
    expect(screen.getByTestId('painel-agua-resumo').textContent).toMatch(/7 copos/);
    expect(screen.getByTestId('painel-agua-resumo').textContent).toMatch(/400 ml/);

    fireEvent.click(screen.getByRole('button', { name: /Salvar meta/i }));

    expect(setHealth).toHaveBeenCalledWith(
      expect.objectContaining({
        waterTarget: 7,
        waterTargetMl: 2800,
        glassMl: 400
      })
    );
  });
});
