/**
 * Correções A–D (20/11/2026), na tela e nas regras compartilhadas.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { normalizeHealthForToday, todayLocal } from '../utils/healthDay';
import { cleanText, formatPhone, validateDate, validateEmail, validatePersonName, validatePhone, validateTime } from '../domain/validation';
import { CalendarTab } from '../components/CalendarTab';

describe('A: água por dia', () => {
  it('valor de outro dia começa em 0 e não leva os copos do dia anterior', () => {
    const h = normalizeHealthForToday({ waterGlasses: 4, waterHistory: [{ id: 1 }], waterDate: '2026-11-17', waterTarget: 10 }, '2026-11-20');
    expect(h).toMatchObject({ waterGlasses: 0, waterHistory: [], waterDate: '2026-11-20', waterTarget: 10 });
  });
  it('linha antiga sem dia também começa em 0; valor de hoje fica', () => {
    expect(normalizeHealthForToday({ waterGlasses: 4 }, '2026-11-20').waterGlasses).toBe(0);
    expect(normalizeHealthForToday({ waterGlasses: 3, waterDate: '2026-11-20' }, '2026-11-20').waterGlasses).toBe(3);
  });
  it('o dia é o local (não UTC): 23:30 do dia 20 ainda é dia 20', () => {
    expect(todayLocal(new Date(2026, 10, 20, 23, 30))).toBe('2026-11-20');
    expect(todayLocal(new Date(2026, 10, 21, 0, 5))).toBe('2026-11-21');
  });
});

describe('C: regras de campo', () => {
  it('nome: letras, acentos, hífen e apóstrofo; sem números ou símbolos', () => {
    for (const ok of ['Ana Clara', "Joana D'Ávila", 'José-Maria', 'Lia']) expect(validatePersonName(ok).error).toBeUndefined();
    for (const bad of ['Ana2', 'Ana!', '@ana', '1', '<b>Ana</b>x1']) expect(validatePersonName(bad).error).toBeTruthy();
    expect(validatePersonName('  Ana    Clara  ').value).toBe('Ana Clara');
  });
  it('e-mail sem espaço e com formato válido', () => {
    expect(validateEmail(' Ana@Exemplo.com ').value).toBe('ana@exemplo.com');
    expect(validateEmail('ana @exemplo.com').error).toBeTruthy();
    expect(validateEmail('ana@exemplo').error).toBeTruthy();
  });
  it('telefone só com dígitos e formatação na exibição', () => {
    expect(validatePhone('(11) 98765-4321').value).toBe('11987654321');
    expect(validatePhone('11 9876a').error).toBeTruthy();
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
  });
  it('data e horário reais', () => {
    expect(validateDate('2026-02-30').error).toBeTruthy();
    expect(validateDate('2028-02-29').value).toBe('2028-02-29');
    expect(validateTime('24:00').error).toBeTruthy();
  });
  it('texto livre: sem HTML, sem caracteres invisíveis, espaços normalizados e tamanho limitado', () => {
    expect(cleanText('<i>oi</i>​   mundo', { max: 50 })).toBe('oi mundo');
    expect(cleanText('a'.repeat(400), { max: 280 })).toHaveLength(280);
  });
});

describe('B: sem categorias fantasma na Agenda', () => {
  const FAKE = ['Faculdade', 'Trabalho', 'Pessoal', 'Casa', 'Leitura'];
  it('sem categorias da pessoa: nenhuma categoria de exemplo, aviso claro', () => {
    render(<CalendarTab events={[]} friends={[]} tags={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Novo Evento/i }));
    expect(screen.getByTestId('cal-sem-categoria')).toBeInTheDocument();
    for (const f of FAKE) expect(screen.queryByRole('button', { name: new RegExp(`^${f}$`) })).toBeNull();
  });
  it('com categorias: só as da pessoa', () => {
    render(<CalendarTab events={[]} friends={[]} tags={[{ id: 't1', name: 'Estudos', color: '#A78BFA' }]} />);
    fireEvent.click(screen.getByRole('button', { name: /Novo Evento/i }));
    expect(screen.getByRole('button', { name: /^Estudos$/ })).toBeInTheDocument();
    for (const f of FAKE) expect(screen.queryByRole('button', { name: new RegExp(`^${f}$`) })).toBeNull();
  });
});
