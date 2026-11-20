/**
 * Lote E (telas): Alimentação da pessoa (dia, registro, extras) e plano da nutricionista (rascunho, prévia, publicação).
 * Limite: API simulada; o servidor é testado em tests/api/alimentacao.test.ts e no e2e local.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const calls = [];
const MEALS = [
  { key: 'cafe', time: '07:30', name: 'Café da manhã', options: [{ key: 'o1', name: 'Opção única', items: [{ qty: '2', unit: 'fatias', food: 'pão integral' }], subs: ['Pão por tapioca'] }] },
  { key: 'almoco', time: '23:59', name: 'Almoço', options: [{ key: 'o1', name: 'Opção 1', items: [{ qty: '120', unit: 'g', food: 'frango' }], subs: [] }, { key: 'o2', name: 'Opção 2', items: [{ qty: '', unit: 'à vontade', food: 'salada' }], subs: [] }] }
];
let state;
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (json, status = 200) => ({ ok: status < 400, status, json: async () => json });
    if (url.startsWith('/api/alimentacao?')) return ok({ planos: [{ id: 'p1', name: 'Reeducação', status: 'publicado', ativo: true, proName: 'Clara', spaceName: 'Clara Nutrição', vigente: { version: 1, startsOn: '2026-11-01' }, proxima: null, versoes: [{ version: 1, name: 'Reeducação', startsOn: '2026-11-01' }] }] });
    if (url.startsWith('/api/alimentacao/dia')) return ok({ plano: {}, date: state.date, versao: { version: 1, name: 'Reeducação', startsOn: '2026-11-01', notes: 'Beber água.' }, grupo: { key: 'todos', label: 'Todos os dias' }, refeicoes: MEALS, registros: { cafe: { status: 'alternativa', optionKey: 'o1', substitution: 'Pão por tapioca' } }, extras: [], numeros: { previstas: 2, registradas: 1, counts: { alternativa: 1 } }, podeRegistrar: true });
    if (url === '/api/alimentacao/registros') return ok({ success: true, numeros: {} });
    if (url.startsWith('/api/espacos/planos-modelo')) return ok({ modelos: [{ id: 'm1', name: 'Base 1800', version: 2, content: { layout: 'todos', days: [{ key: 'todos', meals: MEALS }] } }] });
    if (url.startsWith('/api/espacos/pessoas/l1/plano') && (opts.method || 'GET') === 'GET') return ok(state.planoPessoa);
    if (url === '/api/espacos/pessoas/l1/plano') return ok({ success: true, planId: 'p9' }, 201);
    if (url.includes('/rascunho')) return ok({ success: true, content: JSON.parse(opts.body).content });
    if (url.includes('/publicar')) return ok({ success: true, version: 1 });
    if (url === '/api/espacos/pessoas') return ok({ pessoas: [{ linkId: 'l1', name: 'Lia Moreira', username: 'lia', since: '2026-11-01', turmas: [] }] });
    return ok({ success: true });
  })
}));

const { AlimentacaoTab, Contagens } = await import('../components/alimentacao/AlimentacaoTab');
const { PlanoEditor } = await import('../components/alimentacao/PlanoEditor');
const { ProPlano } = await import('../components/alimentacao/ProAlimentacao');
const { localISO, starterContent } = await import('../components/alimentacao/planoModel');

beforeEach(() => {
  calls.length = 0;
  state = { date: localISO(), planoPessoa: { plano: null, anteriores: [], resumo7: null, pessoa: { name: 'Lia Moreira' } } };
});

describe('Alimentação da pessoa', () => {
  it('mostra o registro do dia (com registro ÷ previstas) e a alternativa autorizada junto com "conforme"', async () => {
    render(<AlimentacaoTab showToast={() => {}} />);
    expect(await screen.findByTestId('al-registro-dia')).toHaveTextContent('Registro do dia: 1 de 2 refeições');
    expect(screen.getAllByTestId('al-refeicao')).toHaveLength(2);
    expect(screen.getByText('Alternativa autorizada')).toBeInTheDocument();
    const { container } = render(<Contagens counts={{ alternativa: 3, parcial: 1 }} />);
    expect(container.querySelector('.es-count.in').textContent).toMatch(/0conforme/);
    expect([...container.querySelectorAll('.es-count.in')].map((e) => e.textContent)).toContain('3alternativa autorizada');
  });
  it('registrar: sem substituição na refeição, a opção "alternativa" não aparece; o pedido leva opção e situação', async () => {
    const toast = vi.fn();
    render(<AlimentacaoTab showToast={toast} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar Almoço' }));
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).queryByText('Alternativa autorizada')).toBeNull();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Opção 2' }));
    fireEvent.click(within(dlg).getByLabelText(/^Parcial/));
    fireEvent.click(within(dlg).getByRole('button', { name: 'Salvar registro' }));
    await waitFor(() => expect(calls.find((c) => c.url === '/api/alimentacao/registros')?.body).toMatchObject({ planId: 'p1', mealKey: 'almoco', status: 'parcial', optionKey: 'o2', substitution: null }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Registro salvo.'));
  });
});

describe('Editor do plano', () => {
  it('acrescenta item, substituição e opção; trocar a divisão cria os grupos de dias', () => {
    let content = starterContent();
    const onChange = (c) => { content = c; };
    const { rerender } = render(<PlanoEditor value={content} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Item/ })[0]);
    expect(content.days[0].meals[0].options[0].items).toHaveLength(2);
    rerender(<PlanoEditor value={content} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Substituição/ })[0]);
    expect(content.days[0].meals[0].options[0].subs).toEqual(['']);
    rerender(<PlanoEditor value={content} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Opção/ })[0]);
    expect(content.days[0].meals[0].options.map((o) => o.name)).toEqual(['Opção 1', 'Opção 2']);
    rerender(<PlanoEditor value={content} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dias úteis, sábado e domingo' }));
    expect(content.days.map((d) => d.key)).toEqual(['uteis', 'sab', 'dom']);
    expect(content.days[1].meals).toHaveLength(5);
  });
});

describe('Plano da nutricionista', () => {
  it('área individual: a aba Registros da nutricionista não mostra o bloco de treino do Personal', async () => {
    const { ProIndividual } = await import('../components/espacos/ProIndividual');
    render(<ProIndividual linkId="l1" pro={{ model: 'nutri', peopleLabel: 'Pacientes' }} toast={() => {}} onBack={() => {}} initialTab="Registros"
      extraTabs={[{ label: 'Plano', render: () => <p>plano-nutri</p> }, { label: 'Registros', render: () => <p>registros-nutri</p> }]} />);
    expect(await screen.findByText('registros-nutri')).toBeInTheDocument();
    expect(screen.queryByText(/Conta só treinos/)).toBeNull();
    expect(screen.queryByText('Fichas atribuídas')).toBeNull();
  });
  it('sem plano: cria o rascunho a partir de um modelo', async () => {
    render(<ProPlano linkId="l1" pessoa={{ name: 'Lia Moreira' }} toast={() => {}} />);
    fireEvent.change(await screen.findByLabelText('Nome do plano'), { target: { value: 'Fase 1' } });
    await screen.findByRole('option', { name: 'Modelo: Base 1800' });
    fireEvent.change(screen.getByLabelText('Começar de'), { target: { value: 'm1' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar rascunho/ }));
    await waitFor(() => expect(calls.find((c) => c.url === '/api/espacos/pessoas/l1/plano' && c.method === 'POST')?.body).toEqual({ name: 'Fase 1', modeloId: 'm1' }));
  });
  it('com rascunho: prévia como o paciente vê e publicar salva antes o que mudou', async () => {
    state.planoPessoa = { pessoa: { name: 'Lia Moreira' }, anteriores: [], resumo7: null, plano: { id: 'p1', name: 'Fase 1', status: 'rascunho', currentVersion: 0, versoes: [], vigente: null, proxima: null, endsOn: null, draft: { layout: 'todos', notes: '', days: [{ key: 'todos', meals: MEALS }] } } };
    render(<ProPlano linkId="l1" pessoa={{ name: 'Lia Moreira' }} toast={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /Ver como Lia vai ver/ }));
    expect(within(screen.getByTestId('pa-previa')).getAllByTestId('al-refeicao')).toHaveLength(2);
    expect(within(screen.getByTestId('pa-previa')).getByText('Pode trocar: Pão por tapioca')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    fireEvent.change(screen.getByLabelText('Nome do plano'), { target: { value: 'Fase 1, ajustada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar para Lia' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Publicar para/ }));
    await waitFor(() => expect(calls.find((c) => c.url.includes('/publicar'))?.body).toMatchObject({ startsOn: localISO(), endsOn: null }));
    const order = calls.filter((c) => c.method !== 'GET').map((c) => c.url);
    expect(order.indexOf('/api/espacos/planos/p1/rascunho')).toBeLessThan(order.indexOf('/api/espacos/planos/p1/publicar'));
    expect(calls.find((c) => c.url.includes('/rascunho')).body.name).toBe('Fase 1, ajustada');
  });
});
