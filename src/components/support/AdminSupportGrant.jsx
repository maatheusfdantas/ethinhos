import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';

const SCOPE_LABELS = { habitos: 'Hábitos', agenda: 'Agenda', treinos: 'Treinos', saude: 'Saúde', notas: 'Notas' };
const fmt = (iso) => { try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

function Section({ title, children }) {
  return <section className="asg-sec"><h4>{title}</h4>{children}</section>;
}
const Empty = () => <p className="asg-muted">Nada registrado.</p>;

/**
 * No Portal admin, dentro de um chamado: mostra se o cliente liberou acesso e permite ver
 * SOMENTE as áreas liberadas, enquanto o acesso estiver ativo. Cada visualização é registrada
 * e aparece para o cliente.
 */
export function AdminSupportGrant({ ticketId }) {
  const [grants, setGrants] = useState([]);
  const [view, setView] = useState(null); // { loading, error, data, grant }

  useEffect(() => {
    let alive = true;
    apiFetch('/api/admin/support-access').then((r) => (r.ok ? r.json() : { grants: [] })).then((d) => {
      if (alive) setGrants((d.grants || []).filter((g) => g.ticket_id === ticketId && g.active));
    }).catch(() => {});
    return () => { alive = false; };
  }, [ticketId]);

  if (!grants.length) {
    return <p className="asg-none">Sem acesso aos dados deste cliente. Se precisar, peça que ele libere pelo próprio chamado (Suporte, no app).</p>;
  }

  const open = async (g) => {
    setView({ loading: true, grant: g });
    try {
      const r = await apiFetch(`/api/admin/support-access/${g.id}/data`);
      const d = await r.json();
      if (!r.ok) { setView({ error: d.error || 'Acesso indisponível.', grant: g }); return; }
      setView({ data: d.data, grant: g });
    } catch { setView({ error: 'Não foi possível carregar agora.', grant: g }); }
  };

  const d = view?.data;
  return (
    <div className="asg">
      {grants.map((g) => (
        <div key={g.id} className="asg-row">
          <span>Cliente liberou: <b>{g.scopes.map((s) => SCOPE_LABELS[s] || s).join(', ')}</b> · até {fmt(g.expires_at)}</span>
          <button type="button" onClick={() => open(g)}>Ver dados autorizados</button>
        </div>
      ))}

      {view && (
        <div className="rx-overlay" onClick={() => setView(null)}>
          <div className="rx-dialog asg-dialog" role="dialog" aria-modal="true" aria-labelledby="asgTitle" onClick={(e) => e.stopPropagation()}>
            <h2 id="asgTitle">Dados autorizados pelo cliente</h2>
            <p className="asg-muted">Somente leitura. Esta visualização foi registrada e aparece para o cliente.</p>
            {view.loading && <p role="status">Carregando…</p>}
            {view.error && <p className="asg-error" role="alert">{view.error}</p>}
            {d && (
              <div className="asg-body">
                <p><b>{d.conta?.nome}</b> · @{d.conta?.usuario}</p>
                {d.habitos && <Section title="Hábitos">{d.habitos.length ? <ul>{d.habitos.map((h, i) => <li key={i}>{h.title} · {h.category} · {h.current}/{h.target} {h.unit}{h.completed ? ' · concluído' : ''}</li>)}</ul> : <Empty />}</Section>}
                {d.agenda && <Section title="Agenda">{d.agenda.length ? <ul>{d.agenda.map((e, i) => <li key={i}>{e.date} {e.all_day ? '(dia todo)' : `${e.start_time || ''}–${e.end_time || ''}`} · {e.title}</li>)}</ul> : <Empty />}</Section>}
                {d.treinos && <Section title="Treinos">{d.treinos.length ? <ul>{d.treinos.map((w, i) => <li key={i}>{w.name || w.title || 'Treino'}{Array.isArray(w.exercises) ? ` · ${w.exercises.length} exercícios` : ''}</li>)}</ul> : <Empty />}</Section>}
                {d.saude && <Section title="Saúde"><ul>
                  <li>Peso: {d.saude.peso ?? '—'} kg · Altura: {d.saude.altura ?? '—'} m</li>
                  {d.saude.perfil && <li>Objetivo: {d.saude.perfil.goal || '—'} · Atividade: {d.saude.perfil.activity_level || '—'}</li>}
                  {d.saude.aguaESono && <li>Água hoje: {d.saude.aguaESono.water_glasses}/{d.saude.aguaESono.water_target} copos · Sono: {d.saude.aguaESono.sleep_bed_time}–{d.saude.aguaESono.sleep_wake_time}</li>}
                </ul></Section>}
                {d.notas && <Section title="Notas">{d.notas.length ? <ul>{d.notas.map((n, i) => <li key={i}><b>{n.title}</b>: {n.content}</li>)}</ul> : <Empty />}</Section>}
              </div>
            )}
            <button type="button" className="asg-close" onClick={() => setView(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
