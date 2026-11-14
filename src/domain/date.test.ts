// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { addDays, diffDays, isLocalDate, isTimeZone, toLocalDate } from './date';

describe('domain/date', () => {
  it('valida datas locais YYYY-MM-DD de calendário', () => {
    expect(isLocalDate('2026-11-14')).toBe(true);
    expect(isLocalDate('2024-02-29')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('14/11/2026')).toBe(false);
    expect(isLocalDate(20261114)).toBe(false);
  });

  it('valida fusos IANA', () => {
    expect(isTimeZone('America/Sao_Paulo')).toBe(true);
    expect(isTimeZone('Asia/Tokyo')).toBe(true);
    expect(isTimeZone('Marte/Olympus')).toBe(false);
    expect(isTimeZone('')).toBe(false);
  });

  it('calcula a data local respeitando o fuso (virada do dia)', () => {
    // 02:30 UTC de 15/11 ainda é 14/11 em São Paulo (UTC-3) e já é 15/11 em Tóquio.
    const instant = '2026-11-15T02:30:00.000Z';
    expect(toLocalDate(instant, 'America/Sao_Paulo')).toBe('2026-11-14');
    expect(toLocalDate(instant, 'Asia/Tokyo')).toBe('2026-11-15');
    expect(toLocalDate(instant, 'UTC')).toBe('2026-11-15');
  });

  it('soma e diferença de dias atravessam meses e anos', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-11-01', '2026-11-14')).toBe(13);
    expect(diffDays('2026-11-14', '2026-11-01')).toBe(-13);
  });
});
