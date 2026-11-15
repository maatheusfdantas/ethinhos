import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Eye } from 'lucide-react';

const SCOPE_LABELS = {
  habitos: 'Hábitos', agenda: 'Agenda', treinos: 'Treinos',
  saude: 'Saúde (peso, altura, objetivo, água e sono)', notas: 'Notas'
};
const HOURS = [[1, '1 hora'], [24, '24 horas'], [72, '3 dias']];
const fmt = (iso) => { try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

/**
 * Dentro de um chamado: o cliente libera ao suporte leitura temporária de áreas que ele escolher,
 * acompanha quando foi visto e revoga quando quiser. Sem isso, o suporte não vê dados da conta.
 */
export function SupportAccessPanel({ ticketId, resolved }) {
  const [grants, setGrants] = useState([]);
  const [open, setOpen] = useState(false);
  const [scopes, setScopes] = useState([]);
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/support-access');
      if (!r.ok) return;
      const d = await r.json();
      setGrants((d.grants || []).filter((g) => g.ticket_id === ticketId));
    } catch { /* sem rede: mantém o que está na tela */ }
  }, [ticketId]);
  useEffect(() => { load(); }, [load]);

  const grant = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch('/api/support-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId, scopes, hours }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || 'Não foi possível liberar agora.'); return; }
      setOpen(false); setScopes([]); load();
    } catch { setError('Não foi possível liberar agora.'); } finally { setBusy(false); }
  };
  const revoke = async (id) => {
    setBusy(true);
    try { await fetch(`/api/support-access/${id}`, { method: 'DELETE' }); load(); } finally { setBusy(false); }
  };

  const active = grants.filter((g) => g.active);
  const past = grants.filter((g) => !g.active);
  const toggle = (s) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="sa">
      {active.map((g) => (
        <div key={g.id} className="sa-grant" role="status">
          <ShieldCheck size={16} aria-hidden="true" />
          <div>
            <b>Suporte pode ver: {g.scopes.map((s) => SCOPE_LABELS[s] || s).join(', ')}</b>
            <span>Até {fmt(g.expires_at)} · {g.view_count ? `visto ${g.view_count} ${g.view_count === 1 ? 'vez' : 'vezes'} (último em ${fmt(g.last_viewed_at)})` : 'ainda não visto'}</span>
          </div>
          <button type="button" className="sa-btn ghost" onClick={() => revoke(g.id)} disabled={busy}>Revogar</button>
        </div>
      ))}

      {!resolved && !open && (
        <button type="button" className="sa-link" onClick={() => setOpen(true)}>
          <Eye size={15} aria-hidden="true" /> Liberar acesso temporário aos meus dados para este atendimento
        </button>
      )}

      {open && (
        <form className="sa-form" onSubmit={grant}>
          <p>O suporte <b>não vê seus dados</b> sem a sua autorização. Escolha o que ele pode ver, só para leitura e por tempo limitado. Você acompanha cada visualização e pode revogar quando quiser.</p>
          <fieldset>
            <legend>O que liberar</legend>
            {Object.entries(SCOPE_LABELS).map(([k, label]) => (
              <label key={k}><input type="checkbox" checked={scopes.includes(k)} onChange={() => toggle(k)} /> {label}</label>
            ))}
          </fieldset>
          <label className="sa-hours">Por quanto tempo
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {HOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {error && <p className="sa-error" role="alert">{error}</p>}
          <div className="sa-actions">
            <button type="submit" className="sa-btn" disabled={busy || scopes.length === 0}>{busy ? 'Liberando…' : 'Liberar acesso'}</button>
            <button type="button" className="sa-btn ghost" onClick={() => { setOpen(false); setError(''); }}>Cancelar</button>
          </div>
        </form>
      )}

      {past.length > 0 && (
        <details className="sa-past">
          <summary>Acessos anteriores ({past.length})</summary>
          <ul>{past.map((g) => (
            <li key={g.id}>{g.scopes.map((s) => SCOPE_LABELS[s] || s).join(', ')} · {g.revoked_at ? `revogado em ${fmt(g.revoked_at)}` : `expirou em ${fmt(g.expires_at)}`} · visto {g.view_count || 0}x</li>
          ))}</ul>
        </details>
      )}
    </div>
  );
}
