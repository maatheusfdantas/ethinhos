import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { MODEL_OPTIONS, espacosApi, fmtDate, fmtUntil, initialsOf } from './espacosApi';
import '../../styles/espacos.css';

const EVENT_TEXT = {
  PRO_ACTIVATED: (h) => `ativou @${h.target} como ${MODEL_OPTIONS.find((m) => m.id === h.model)?.label || h.model} (espaço “${h.spaceName}”).`,
  PRO_SUSPENDED: (h) => `suspendeu @${h.target}.`,
  PRO_REACTIVATED: (h) => `reativou @${h.target}.`,
  PRO_MODEL_CHANGED: (h) => `trocou o modelo de @${h.target}: ${MODEL_OPTIONS.find((m) => m.id === h.de)?.label || h.de} para ${MODEL_OPTIONS.find((m) => m.id === h.para)?.label || h.para}.`
};

/**
 * Portal admin > Profissionais: quem pode abrir um espaço. O admin não vê dados de alunos nem de pacientes.
 */
export function AdminProfissionais({ showToast }) {
  const [data, setData] = useState({ profissionais: [], historico: [], loaded: false, error: '' });
  const [q, setQ] = useState('');
  const [found, setFound] = useState(undefined);
  const [model, setModel] = useState('personal');
  const [spaceName, setSpaceName] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = (m) => showToast?.(m);

  const load = useCallback(async () => {
    try {
      const r = await espacosApi.adminLista();
      setData({ ...r, loaded: true, error: '' });
    } catch (e) {
      setData({ profissionais: [], historico: [], loaded: true, error: e.code === 'espacos_indisponivel' ? 'Os espaços profissionais ainda não estão disponíveis (migração pendente).' : e.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    if (busy) return false;
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      await load();
      return true;
    } catch (e) {
      toast(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const search = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    try {
      const r = await espacosApi.adminBusca(q.trim());
      setFound(r.conta);
      if (r.conta) setSpaceName(r.conta.name || '');
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <div className="es es-admin">
      <div className="es-head"><div><h1>Profissionais</h1><p>Quem pode abrir um espaço no Ethos (Personal, Nutricionista ou Organização Clínica). O admin não vê dados de alunos nem de pacientes.</p></div></div>
      {data.error && <div className="es-error">{data.error}</div>}
      <div className="es-grid">
        <div className="es-stack">
          <article className="es-card">
            <h2>Contas com modo profissional</h2>
            {data.loaded && data.profissionais.length === 0 ? <p className="es-sub">Nenhuma ainda.</p> : (
              <table className="es-table resp" style={{ marginTop: 10 }}>
                <thead><tr><th>Conta</th><th>Modelo</th><th>Espaço</th><th>Situação</th><th /></tr></thead>
                <tbody>
                  {data.profissionais.map((p) => (
                    <tr key={p.userId}>
                      <td className="wide"><b>{p.name}</b><br /><small style={{ color: 'var(--rx-ink-3)' }}>@{p.username}</small></td>
                      <td data-l="Modelo">{p.modelLabel}</td>
                      <td data-l="Espaço">{p.spaceName} ({p.people} pessoas)</td>
                      <td><span className={`rx-pill ${p.status === 'ativo' ? 'es-pill-on' : 'es-pill-off'}`}>{p.status === 'ativo' ? `Ativo desde ${fmtDate(p.approvedAt)}` : 'Suspenso'}</span></td>
                      <td className="wide">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <select className="es-input" style={{ height: 34, width: 'auto', fontSize: 14 }} aria-label={`Trocar o modelo de ${p.name}`} value="" onChange={(e) => e.target.value && setConfirm({ type: 'model', p, to: e.target.value })}>
                            <option value="">Trocar modelo…</option>
                            {MODEL_OPTIONS.filter((m) => m.id !== p.model).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                          </select>
                          {p.status === 'ativo'
                            ? <button type="button" className="es-danger" onClick={() => setConfirm({ type: 'suspend', p })}>Suspender</button>
                            : <button type="button" className="rx-btn ghost tiny" onClick={() => run(() => espacosApi.adminAlterar(p.userId, { status: 'ativo' }), `${p.name} reativado.`)}>Reativar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="es-sub" style={{ marginTop: 10 }}>Suspender vale no próximo pedido do profissional. Os dados das pessoas continuam com elas.</p>
          </article>
          <article className="es-card">
            <h2>Histórico</h2>
            {data.historico.length === 0 ? <p className="es-sub">Nada registrado ainda.</p> : data.historico.map((h, i) => (
              <div className="es-row" key={i}><span className="rx-pill">{fmtUntil(h.at)}</span><div className="grow">Admin {(EVENT_TEXT[h.type] || (() => h.type))(h)}</div></div>
            ))}
          </article>
        </div>
        <aside className="es-card">
          <h2>Ativar modo profissional</h2>
          <p className="es-sub">A pessoa continua com a conta dela e ganha o contexto “Meu espaço”.</p>
          <form className="es-field" style={{ marginTop: 14 }} onSubmit={search}>
            <label htmlFor="es-ad-q">Conta (@ ou e-mail)</label>
            <div style={{ display: 'flex', gap: 8 }}><input id="es-ad-q" className="es-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="@usuario" /><button type="submit" className="rx-btn ghost" style={{ height: 46 }} aria-label="Buscar conta"><Search size={16} /></button></div>
          </form>
          {found === null && <p className="es-sub">Nenhuma conta com esse @ ou e-mail.</p>}
          {found && (
            <>
              <div className="es-row" style={{ paddingTop: 0 }}><span className="es-avatar on">{initialsOf(found.name)}</span><div className="grow"><b>{found.name}</b><small>@{found.username}, conta desde {fmtDate(found.createdAt)}</small></div></div>
              {found.pro ? <div className="es-note">Esta conta já é {MODEL_OPTIONS.find((m) => m.id === found.pro.model)?.label} ({found.pro.status}). Use a lista ao lado.</div> : (
                <>
                  <div className="es-field"><span className="lbl">Modelo</span><div className="es-chips">{MODEL_OPTIONS.map((m) => <button key={m.id} type="button" className="es-chip" aria-pressed={model === m.id} onClick={() => setModel(m.id)}>{m.label}</button>)}</div><span className="es-sub">Um modelo por conta.</span></div>
                  <div className="es-field"><label htmlFor="es-ad-s">Nome do espaço</label><input id="es-ad-s" className="es-input" value={spaceName} onChange={(e) => setSpaceName(e.target.value)} /></div>
                  <button type="button" className="rx-btn" style={{ width: '100%' }} disabled={busy} onClick={async () => { if (await run(() => espacosApi.adminAtivar({ userId: found.id, model, spaceName }), `${found.name} agora tem modo profissional.`)) setFound(undefined); }}>Ativar como {MODEL_OPTIONS.find((m) => m.id === model)?.label}</button>
                </>
              )}
            </>
          )}
        </aside>
      </div>

      {confirm && (
        <div className="rx-overlay" onClick={() => setConfirm(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            {confirm.type === 'suspend' ? (
              <><h2>Suspender {confirm.p.name}?</h2><p>O espaço fica inacessível para o profissional no próximo pedido. Vínculos, turmas e registros ficam guardados; reativar devolve tudo.</p></>
            ) : (
              <><h2>Trocar o modelo de {confirm.p.name}?</h2><p>De {confirm.p.modelLabel} para {MODEL_OPTIONS.find((m) => m.id === confirm.to)?.label}. Nada é convertido nem apagado: o que era do modelo anterior fica guardado, e as pessoas continuam com o que receberam.</p></>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
              <button type="button" className={confirm.type === 'suspend' ? 'es-danger' : 'rx-btn'} disabled={busy} onClick={async () => {
                const c = confirm;
                setConfirm(null);
                if (c.type === 'suspend') await run(() => espacosApi.adminAlterar(c.p.userId, { status: 'suspenso' }), `${c.p.name} suspenso.`);
                else await run(() => espacosApi.adminAlterar(c.p.userId, { model: c.to }), 'Modelo trocado.');
              }}>{confirm.type === 'suspend' ? 'Suspender' : 'Trocar modelo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
