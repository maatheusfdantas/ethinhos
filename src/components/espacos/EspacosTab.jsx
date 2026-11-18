import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Lock, ShieldCheck, Ticket } from 'lucide-react';
import { espacosApi, fmtDate, initialsOf } from './espacosApi';
import '../../styles/espacos.css';

/**
 * Espaços (pessoa): profissionais que acompanham você, entrar com código e sair.
 * Abrir um link ou digitar o código não muda nada: só a confirmação (com maioridade) cria o vínculo.
 */
export function EspacosTab({ showToast, initialCode = '' }) {
  const [data, setData] = useState({ loaded: false, espacos: [], error: '' });
  const [code, setCode] = useState(initialCode);
  const [codeErr, setCodeErr] = useState('');
  const [preview, setPreview] = useState(null);
  const [adult, setAdult] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = (m) => showToast?.(m);

  const load = useCallback(async () => {
    try {
      const r = await espacosApi.meus();
      setData({ loaded: true, espacos: r.espacos || [], error: '' });
    } catch (e) {
      setData({ loaded: true, espacos: [], error: e.code === 'espacos_indisponivel' ? 'Os espaços profissionais ainda não estão disponíveis.' : 'Não foi possível carregar seus espaços agora.' });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const askPreview = async (e) => {
    e?.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setCodeErr('');
    try {
      const r = await espacosApi.previa(code);
      if (r.convite.already) setCodeErr(r.convite.groupName ? 'Você já está nesta turma.' : 'Você já tem vínculo com este espaço.');
      else { setAdult(false); setPreview(r.convite); }
    } catch (err) {
      setCodeErr(err.message);
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (!adult) { toast('Confirme que você tem 18 anos ou mais para entrar.'); return; }
    setBusy(true);
    try {
      await espacosApi.aceitar(code, true);
      toast(preview.groupName ? `Você entrou na turma ${preview.groupName}.` : `Você entrou no espaço ${preview.spaceName}.`);
      setPreview(null);
      setCode('');
      load();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    setBusy(true);
    try {
      if (confirm.type === 'turma') { await espacosApi.sairTurma(confirm.id); toast('Você saiu da turma. O vínculo com o profissional continua.'); }
      else { await espacosApi.encerrarMeu(confirm.id); toast('Vínculo encerrado. Seus registros continuam com você.'); }
      setConfirm(null);
      load();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="es">
      <div className="es-head"><div><h1>Espaços</h1><p>Profissionais que acompanham você no Ethos. Cada um vê só o que atribuir e os registros disso.</p></div></div>
      <div className="es-grid">
        <div className="es-stack">
          {data.error && <div className="es-note">{data.error}</div>}
          {data.loaded && !data.error && data.espacos.length === 0 && (
            <section className="es-card"><div className="es-empty"><h3>Nenhum espaço ainda</h3><p>Quando um personal, nutricionista ou organização convidar você, use o código ao lado para entrar.</p></div></section>
          )}
          {data.espacos.map((s) => (
            <article className="es-card" key={s.linkId}>
              <h2>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="es-avatar on">{initialsOf(s.proName)}</span>
                  <span>{s.spaceName}<span className="es-sub" style={{ display: 'block', fontWeight: 450, margin: 0 }}>{s.proName}, {s.modelLabel}. Vínculo desde {fmtDate(s.since)}</span></span>
                </span>
                <span className={`rx-pill ${s.proSuspended ? 'es-pill-off' : 'es-pill-on'}`}>{s.proSuspended ? 'Pausado pelo Ethos' : 'Ativo'}</span>
              </h2>
              {s.turmas.length > 0 && <hr className="es-sep" />}
              {s.turmas.map((t) => (
                <div className="es-row" key={t.memberId}>
                  <span className="es-avatar"><Ticket size={15} /></span>
                  <div className="grow"><b>{t.name}</b><small>Turma{t.description ? `, ${t.description}` : ''}</small></div>
                  <button type="button" className="rx-btn ghost tiny" onClick={() => setConfirm({ type: 'turma', id: t.memberId, name: t.name })}>Sair da turma</button>
                </div>
              ))}
              <div className="es-share">
                <div><h4><Eye size={15} />{s.proName} vê</h4><ul><li>Seu nome, @ e foto</li><li>O que ele atribuir a você e os registros disso</li><li>Suas respostas a convites e avisos</li></ul></div>
                <div><h4><Lock size={15} />{s.proName} não vê</h4><ul><li>Hábitos, notas, foco e saúde</li><li>Sua agenda pessoal e seus treinos próprios</li><li>Ninguém da turma vê você</li></ul></div>
              </div>
              <button type="button" className="es-danger" onClick={() => setConfirm({ type: 'vinculo', id: s.linkId, name: s.spaceName })}>Encerrar vínculo</button>
            </article>
          ))}
        </div>
        <aside className="es-stack">
          <form className="es-card" onSubmit={askPreview}>
            <h2>Entrar com código</h2>
            <p className="es-sub">Peça o código ao profissional. Ele vale por 24 horas.</p>
            <div className="es-field" style={{ margin: '14px 0 10px' }}><label htmlFor="es-code">Código ou link do convite</label><input id="es-code" className="es-input" placeholder="Ex.: K7QM-2XRB" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} /></div>
            {codeErr && <div className="es-error" role="alert">{codeErr}</div>}
            <button type="submit" className="rx-btn" style={{ width: '100%' }} disabled={busy || !code.trim()}>Ver convite</button>
          </form>
          <section className="es-note"><ShieldCheck size={16} /><span>Abrir um convite não muda nada. Você só entra depois de ver os detalhes e confirmar.</span></section>
        </aside>
      </div>

      {preview && (
        <div className="rx-overlay" onClick={() => setPreview(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="es-prev-t" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="es-prev-t">{preview.groupName ? 'Convite para uma turma' : 'Convite para um espaço'}</h2>
            <p>Confira antes de entrar. Nada muda até você confirmar.</p>
            <div className="es-row"><span className="es-avatar on">{initialsOf(preview.proName)}</span><div className="grow"><b>{preview.groupName || preview.spaceName}</b><small>{preview.spaceName}, {preview.proName}, {preview.modelLabel}</small></div></div>
            {preview.hasLink && <div className="es-note" style={{ margin: '6px 0' }}>Você já tem vínculo com este espaço. Entrar só adiciona a turma.</div>}
            <div className="es-share">
              <div><h4><Eye size={15} />Fica visível para {preview.proName}</h4><ul><li>Que você entrou{preview.groupName ? ' na turma' : ''}</li><li>O que ele atribuir a você e os registros disso</li></ul></div>
              <div><h4><Lock size={15} />Continua só seu</h4><ul><li>Hábitos, notas, agenda pessoal, saúde</li><li>Ninguém da turma vê você</li></ul></div>
            </div>
            <label className="es-check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> <span>Tenho 18 anos ou mais.</span></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setPreview(null)}>Cancelar</button>
              <button type="button" className="rx-btn" onClick={join} disabled={busy}>{preview.groupName ? 'Entrar na turma' : 'Entrar no espaço'}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="rx-overlay" onClick={() => setConfirm(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            {confirm.type === 'turma' ? (
              <><h2>Sair da turma {confirm.name}?</h2><p>O que for desta turma para de chegar. O vínculo com o profissional continua, e seus registros ficam com você.</p></>
            ) : (
              <><h2>Encerrar vínculo com {confirm.name}?</h2><p>O profissional perde o acesso aos seus registros na hora. As turmas deste espaço acabam. Nada é apagado. Para voltar, é preciso um convite novo.</p></>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
              <button type="button" className={confirm.type === 'turma' ? 'rx-btn' : 'es-danger'} onClick={doConfirm} disabled={busy}>{confirm.type === 'turma' ? 'Sair da turma' : 'Encerrar vínculo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
