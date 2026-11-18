/**
 * Regressão: a lixeira da aba Hábitos chamava setHabitToDelete, que não existe, e a tela quebrava.
 * Agora exclui na hora, com "Desfazer" no aviso.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HabitsTab } from '../components/HabitsTab';

describe('Aba Hábitos: excluir', () => {
  it('a lixeira exclui o hábito sem quebrar a tela e oferece desfazer', () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    const habit = { id: 'h1', title: 'Beber água', category: 'Saúde', completed: false, current: 0, target: 1, repeatDays: [0, 1, 2, 3, 4, 5, 6] };
    let state = [habit];
    const setHabits = vi.fn((next) => { state = typeof next === 'function' ? next(state) : next; });
    const showToast = vi.fn();
    render(<HabitsTab habits={[habit]} setHabits={setHabits} user={{ id: 'u1' }} showToast={showToast} />);

    fireEvent.click(screen.getByTitle('Excluir hábito'));

    expect(state).toEqual([]);
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Beber água/), expect.any(Function));
    showToast.mock.calls[0][1]();
    expect(state.map((h) => h.id)).toEqual(['h1']);
  });
});
