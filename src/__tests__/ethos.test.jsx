import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  calculateDailyWaterTarget,
  calculateUserLevelAndXp,
  calculateConsistencyScore,
  calculateVitalityScore
} from '../utils/biometricsAndAnalytics';
import { ProfileTab } from '../components/ProfileTab';
import { WeeklyExecutionChart, CategoryAdherenceList } from '../components/ui/EthosDataViz';

describe('1. Biometria & Engine Analítica (Pure Domain Functions)', () => {
  it('calcula a quantidade diária ideal de água (Peso em kg × 35 ml)', () => {
    const res70 = calculateDailyWaterTarget(70, 250);
    expect(res70.weightKg).toBe(70);
    expect(res70.dailyMl).toBe(2450);
    expect(res70.dailyLiters).toBe('2,45');
    expect(res70.targetGlasses).toBe(10); // Math.ceil(2450 / 250) = 10

    const resComma = calculateDailyWaterTarget('60,5', 300);
    expect(resComma.weightKg).toBe(60.5);
    expect(resComma.dailyMl).toBe(2118); // Math.round(60.5 * 35)
    expect(resComma.targetGlasses).toBe(8); // Math.ceil(2118 / 300) = 8
  });

  it('retorna valores seguros quando o peso não é informado ou é zero', () => {
    const empty = calculateDailyWaterTarget('', 250);
    expect(empty.weightKg).toBe(0);
    expect(empty.dailyMl).toBe(0);
    expect(empty.targetGlasses).toBe(8);
  });

  it('garante que um novo usuário comece com 0 XP, Nível 1 e 0% de Vitalidade', () => {
    const xpState = calculateUserLevelAndXp({
      basePoints: 0,
      habits: [],
      streakDays: 0,
      workouts: [],
      postIts: [],
      playlists: [],
      bonusXp: 0
    });
    expect(xpState.totalXp).toBe(0);
    expect(xpState.currentLevel).toBe(1);
    expect(xpState.xpProgressPercent).toBe(0);
    expect(xpState.levelTitle).toBe('Iniciante Consciente');

    const vitality = calculateVitalityScore({ habits: [], health: { water: 0, sleep: 0 } });
    expect(vitality).toBe(0);
  });

  it('calcula o Consistency Score ponderado com precisão', () => {
    const score = calculateConsistencyScore({
      completionRate: 90,
      regularityRate: 80,
      recoveryRate: 70,
      loggingReliability: 100,
      trendScore: 80,
      categoryBalance: 90
    });
    // 27 + 16 + 10.5 + 15 + 8 + 9 = 85.5
    expect(score).toBe(85.5);
  });
});

describe('2. Integração de Componentes — Calculadora de Água no Perfil (ProfileTab)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );
  });

  it('atualiza o cálculo Peso × 35 ml ao vivo e persiste no backend ao salvar', async () => {
    const mockSetUser = vi.fn();
    const mockSetHealth = vi.fn();
    const mockToast = vi.fn();

    render(
      <ProfileTab
        user={{ id: 'usr_real_1', name: 'Ana Clara', username: 'anaclara', weight: 60, points: 0, streak_days: 0 }}
        setUser={mockSetUser}
        habits={[]}
        workouts={[]}
        health={{ water: 2, waterTarget: 8, glassMl: 250 }}
        setHealth={mockSetHealth}
        showToast={mockToast}
      />
    );

    // Verifica cálculo inicial para 60 kg (60 * 35 = 2.100 ml)
    expect(screen.getByText(/60 kg × 35 ml = 2\.100 ml/i)).toBeInTheDocument();

    // Altera o peso para 80 kg (80 * 35 = 2.800 ml -> 12 copos de 250 ml)
    const weightInput = screen.getByPlaceholderText(/Ex: 70/i);
    fireEvent.change(weightInput, { target: { value: '80' } });

    expect(screen.getByText(/80 kg × 35 ml = 2\.800 ml/i)).toBeInTheDocument();

    // Submete o formulário de salvar peso e meta de água
    const saveBtn = screen.getByRole('button', { name: /Salvar Peso & Meta de Água/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ weight: 80 }));
      expect(mockSetHealth).toHaveBeenCalledWith(
        expect.objectContaining({ waterTarget: 12, glassMl: 250 })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/usr_real_1/profile',
        expect.objectContaining({ method: 'PUT' })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/usr_real_1/health',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});

describe('3. DataViz & Estados Vazios (WeeklyExecutionChart & CategoryAdherenceList)', () => {
  it('exibe Empty State editorial quando o usuário ainda não possui registros na semana', () => {
    render(
      <WeeklyExecutionChart
        weeklyData={[]}
        todayCompletedHabitsCount={0}
        todayTotalHabitsCount={0}
      />
    );
    expect(screen.getByTestId('dataviz-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma execução registrada nesta semana/i)).toBeInTheDocument();
  });

  it('exibe Empty State quando não há categorias e renderiza barras quando há categorias', () => {
    const { rerender } = render(<CategoryAdherenceList categories={[]} />);
    expect(screen.getByText(/Sem categorias mapeadas ainda/i)).toBeInTheDocument();

    rerender(
      <CategoryAdherenceList
        categories={[
          { category: 'Saúde & Hidratação', adherence: 88, total_completed: 7, total_expected: 8, habits_count: 2 }
        ]}
      />
    );
    expect(screen.getByText('Saúde & Hidratação')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });
});
