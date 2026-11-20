/**
 * Lote D2 (telas): atribuir com prévia, "Do seu personal" no Treino e área individual.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const calls = [];
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url, method, body });
    const ok = (json, status = 200) => ({ ok: status < 400, status, json: async () => json });
    if (url === '/api/espacos/fichas') return ok({ fichas: [{ id: 'tpl1', name: 'Treino A', status: 'ativa', version: 2, content: { exercises: [] }, activeAssignments: 1 }], config: {} });
    if (url === '/api/espacos/atribuir') return body.preview ? ok({ previa: { ficha: 'Treino A', version: 2, total: 2, novos: 1, pessoas: [{ name: 'Lia', already: true, adapted: true }, { name: 'Bruno', already: false, adapted: false }] } }) : ok({ created: 1, skipped: 1 }, 201);
    if (url === '/api/espacos/pessoas/lnk1/acompanhamento') return ok({ pessoa: { linkId: 'lnk1', name: 'Lia Moreira', username: 'lia', since: '2026-11-03T00:00:00Z' }, atribuicoes: [{ id: 'a1', name: 'Treino A', templateVersion: 2, adapted: true, allowClientEdit: null, status: 'ativa', content: { exercises: [{ id: 'e1', name: 'Agachamento', sets: 2, reps: 8, weightKg: 40 }] } }], sessoes: [{ id: 's1', name: 'Treino A', status: 'incompleta', startedAt: '2026-11-19T21:00:00Z', elapsedMs: 1800000, plannedSets: 2, doneSets: 1 }], config: { allowClientEdit: false } });
    if (url === '/api/espacos/sessoes/s1') return ok({ sessao: { name: 'Treino A', status: 'incompleta', startedAt: '2026-11-19T21:00:00Z', elapsedMs: 1800000, content: { exercises: [{ id: 'e1', name: 'Agachamento', sets: 2, reps: 8, weightKg: 40 }] }, sets: [{ exerciseKey: 'e1', setNo: 1, metric: 'kg', weightKg: 42.5, reps: 8 }] } });
    return ok({});
  })
}));

const { AtribuirDialog } = await import('../components/espacos/AtribuirDialog');
const { ProIndividual } = await import('../components/espacos/ProIndividual');
const { DoSeuPersonal } = await import('../components/treino/DoSeuPersonal');

beforeEach(() => { calls.length = 0; });

describe('Atribuir', () => {
  it('mostra quem recebe (e quem já tem, adaptada) antes de confirmar', async () => {
    const done = vi.fn();
    render(<AtribuirDialog groupId="g1" alvo="a turma Força" onClose={() => {}} onDone={done} toast={() => {}} />);
    const previa = await screen.findByTestId('atr-previa');
    expect(previa).toHaveTextContent('1 de 2');
    expect(previa).toHaveTextContent('Lia: já tem, adaptada (não muda)');
    expect(calls.filter((c) => c.url === '/api/espacos/atribuir' && !c.body.preview)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Atribuir a 1' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(calls.find((c) => c.url === '/api/espacos/atribuir' && !c.body.preview).body).toEqual({ templateId: 'tpl1', groupId: 'g1' });
  });
});

describe('Área individual (Personal)', () => {
  it('planejamento com a ficha adaptada e registros com planejado x realizado', async () => {
    render(<ProIndividual linkId="lnk1" pro={{ model: 'personal', peopleLabel: 'Alunos' }} onBack={() => {}} toast={() => {}} />);
    expect(await screen.findByText(/adaptada para esta pessoa/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registros' }));
    fireEvent.click(await screen.findByRole('button', { name: /Planejado x realizado/ }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText('2 × 8, 40 kg')).toBeInTheDocument();
    expect(within(dlg).getByText('42,5 kg × 8')).toBeInTheDocument();
  });
  it('Nutri/Clínica não veem as abas de treino', async () => {
    render(<ProIndividual linkId="lnk1" pro={{ model: 'clinica', peopleLabel: 'Pessoas' }} onBack={() => {}} toast={() => {}} />);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Planejamento' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Registros' })).toBeNull();
  });
});

describe('Do seu personal', () => {
  const a = { id: 'a1', name: 'Treino A', proName: 'Rafa', spaceName: 'Studio Pulso', status: 'ativa', canEdit: false, adapted: true, templateVersion: 2, content: { exercises: [{ id: 'e1', name: 'Agachamento', sets: 2, reps: 8, weightKg: 40 }] } };
  it('iniciar passa a atribuição; editar só aparece quando liberado; copiar sempre', () => {
    const onStart = vi.fn(); const onCopy = vi.fn();
    render(<DoSeuPersonal atribuidos={[a, { ...a, id: 'a2', name: 'Antiga', status: 'encerrada' }]} onStart={onStart} onCopy={onCopy} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Iniciar treino/ })[0]);
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
    expect(screen.queryByRole('button', { name: /^Editar$/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /Iniciar treino/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar Treino A para minhas fichas' }));
    expect(onCopy).toHaveBeenCalled();
  });
});
