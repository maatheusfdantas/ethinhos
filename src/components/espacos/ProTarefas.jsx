import React, { useCallback, useEffect, useState } from 'react';
import { Check, Lock, Plus } from 'lucide-react';
import { espacosApi } from './espacosApi';

const fmt = (d) => { if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * Pendências administrativas da Organização Clínica (prévia 04): tarefas internas do espaço.
 * Não aparecem para os participantes e não guardam dado clínico. Concluir é reversível; arquivar tira da lista sem apagar.
 */
export function TarefasPage({ pro, toast }) {
  const [abertas, setAbertas] = useState(null);
  const [feitas, setFeitas] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [a, f] = await Promise.all([espacosApi.tarefas('abertas'), espacosApi.tarefas('concluidas')]);
      setAbertas(a.tarefas || []);
      setFeitas(f.tarefas || []);
    } catch (e) { setAbertas([]); toast?.(e.message); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    if (busy) return false;
    setBusy(true);
    try { await fn(); if (ok) toast?.(ok); await load(); return true; } catch (e) { toast?.(e.message); return false; } finally { setBusy(false); }
  };
  const hoje = todayISO();
  const row = (t) => {
    const done = t.status === 'concluida';
    const late = !done && t.dueOn && t.dueOn < hoje;
    return (
      <div className="es-row es-task" key={t.id} data-testid="tarefa">
        <button type="button" className="rx-check" aria-pressed={done} aria-label={`${done ? 'Reabrir' : 'Concluir'}: ${t.title}`} disabled={busy}
          onClick={() => run(() => espacosApi.editarTarefa(t.id, { status: done ? 'aberta' : 'concluida' }), done ? 'Tarefa reaberta.' : 'Tarefa concluída.')}><Check strokeWidth={2.6} /></button>
        <div className="grow">
          <b style={done ? { color: 'var(--rx-ink-2)', fontWeight: 520 } : undefined}>{t.title}</b>
          <small style={late ? { color: 'var(--rx-amber)' } : undefined}>{done ? `feita em ${new Date(t.doneAt).toLocaleDateString('pt-BR')}` : t.dueOn ? `${late ? 'atrasada, era ' : 'até '}${fmt(t.dueOn)}` : 'sem prazo'}{t.note ? `. ${t.note}` : ''}</small>
        </div>
        {!done && <button type="button" className="rx-btn ghost tiny" onClick={() => setForm({ id: t.id, title: t.title, dueOn: t.dueOn || '', note: t.note || '' })}>Editar</button>}
        <button type="button" className="rx-btn ghost tiny" disabled={busy} onClick={() => run(() => espacosApi.arquivarTarefa(t.id), 'Tarefa arquivada.')}>Arquivar</button>
      </div>
    );
  };

  return (
    <>
      <div className="es-head"><div><h1>Pendências administrativas</h1><p>Tarefas internas de {pro?.spaceName || 'seu espaço'}. Não ficam visíveis para os participantes.</p></div>
        <div className="acts"><button type="button" className="rx-btn" onClick={() => setForm({ id: null, title: '', dueOn: '', note: '' })}><Plus size={16} />Nova tarefa</button></div></div>
      <article className="es-card" style={{ maxWidth: 760 }}>
        <h2>Abertas <span className="rx-pill">{abertas?.length ?? 0}</span></h2>
        {abertas === null ? <p className="es-sub">Carregando…</p> : abertas.length === 0 ? <div className="es-empty"><p>Nenhuma pendência aberta.</p></div> : abertas.map(row)}
        {feitas.length > 0 && (
          <>
            <hr className="es-sep" />
            <h3>Concluídas recentemente</h3>
            {feitas.slice(0, 20).map(row)}
          </>
        )}
      </article>
      <div className="es-note" style={{ marginTop: 16, maxWidth: 760 }}><Lock size={16} /><span>Só organização: agenda, convites, avisos e tarefas. Sem prontuário, sem diagnóstico e sem dados clínicos.</span></div>

      {form && (
        <div className="rx-overlay" onClick={() => setForm(null)}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="tk-t" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
            e.preventDefault();
            const body = { title: form.title, dueOn: form.dueOn || null, note: form.note };
            if (await run(() => (form.id ? espacosApi.editarTarefa(form.id, body) : espacosApi.criarTarefa(body)), form.id ? 'Tarefa atualizada.' : 'Tarefa criada.')) setForm(null);
          }}>
            <h2 id="tk-t">{form.id ? 'Editar tarefa' : 'Nova tarefa'}</h2>
            <p>Para a organização do espaço. Os participantes não veem.</p>
            <div className="es-field"><label htmlFor="tk-n">O que fazer</label><input id="tk-n" className="es-input" maxLength={140} placeholder="Ex.: confirmar a sala de sábado" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="es-field"><label htmlFor="tk-d">Prazo <span style={{ color: 'var(--rx-ink-3)', fontWeight: 450 }}>(opcional)</span></label><input id="tk-d" className="es-input" type="date" value={form.dueOn} onChange={(e) => setForm({ ...form, dueOn: e.target.value })} /></div>
            <div className="es-field"><label htmlFor="tk-o">Observação <span style={{ color: 'var(--rx-ink-3)', fontWeight: 450 }}>(opcional, sem dados clínicos)</span></label><textarea id="tk-o" className="es-input" style={{ height: 70, paddingTop: 10 }} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="rx-btn ghost" onClick={() => setForm(null)}>Cancelar</button><button type="submit" className="rx-btn" disabled={busy || !form.title.trim()}>{form.id ? 'Salvar' : 'Criar tarefa'}</button></div>
          </form>
        </div>
      )}
    </>
  );
}
