import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Lock, Plus, Ticket, User, Users } from 'lucide-react';
import { espacosApi, fmtDate, fmtUntil, initialsOf } from './espacosApi';
import '../../styles/espacos.css';

/**
 * Meu espaço (profissional): visão geral, turmas e convites, pessoas.
 * O servidor confere o perfil ativo e o vínculo a cada pedido; esta tela só mostra o que ele devolve.
 */
export function ProEspaco({ view = 'pro-visao', pro, onNavigate, showToast }) {
  const [meu, setMeu] = useState(null);
  const [pessoas, setPessoas] = useState(null);
  const [sel, setSel] = useState('');
  const [turma, setTurma] = useState(null);
  const [nova, setNova] = useState(null);
  const [code, setCode] = useState(null); // { code, expiresAt, title }
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = (m) => showToast?.(m);
  const peopleLabel = meu?.pro?.peopleLabel || pro?.peopleLabel || 'Pessoas';

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([espacosApi.meu(), espacosApi.pessoas()]);
      setMeu(m);
      setPessoas(p.pessoas || []);
      setSel((s) => s || m.turmas?.[0]?.id || '');
    } catch (e) {
      toast(e.message);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!sel) { setTurma(null); return; }
    let alive = true;
    espacosApi.turma(sel).then((r) => alive && setTurma(r), () => alive && setTurma(null));
    return () => { alive = false; };
  }, [sel, meu]);

  const act = async (fn, ok) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      if (ok) toast(ok);
      await load();
      return r;
    } catch (e) {
      toast(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (!meu) return <div className="es"><p className="es-sub">Carregando seu espaço…</p></div>;
  if (!meu.pro || meu.pro.status !== 'ativo') {
    return <div className="es"><section className="es-card" style={{ maxWidth: 560 }}><div className="es-empty"><h3>Espaço indisponível</h3><p>{meu.pro?.status === 'suspenso' ? 'Seu espaço está suspenso. Fale com o suporte do Ethos.' : 'Esta conta não tem modo profissional.'}</p></div></section></div>;
  }
  const turmas = meu.turmas || [];
  const g = turmas.find((t) => t.id === sel);

  const codeDialog = code && (
    <div className="rx-overlay" onClick={() => setCode(null)}>
      <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="es-code-t" onClick={(e) => e.stopPropagation()}>
        <h2 id="es-code-t">{code.title}</h2>
        <p>{code.kind === 'turma' ? 'Qualquer pessoa com o código pode pedir para entrar nas próximas 24 horas. Ela vê a turma e o espaço, nunca a lista de participantes.' : 'Cria um vínculo com uma pessoa, sem turma. Vale por 24 horas e só pode ser usado uma vez.'}</p>
        <div className="es-code" data-testid="es-code">{code.code}</div>
        <p className="es-sub" style={{ textAlign: 'center' }}>Vale até {fmtUntil(code.expiresAt)}. Por segurança, o código aparece só agora: anote ou copie.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" className="rx-btn ghost" onClick={() => { navigator.clipboard?.writeText(code.code).then(() => toast('Código copiado.'), () => toast('Não foi possível copiar. Selecione o código e copie.')); }}><Copy size={15} />Copiar código</button>
          <button type="button" className="rx-btn" onClick={() => setCode(null)}>Pronto</button>
        </div>
      </div>
    </div>
  );

  const confirmDialog = confirm && (
    <div className="rx-overlay" onClick={() => setConfirm(null)}>
      <div className="rx-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{confirm.title}</h2>
        <p>{confirm.text}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="rx-btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
          <button type="button" className="es-danger" disabled={busy} onClick={async () => { await act(confirm.run, confirm.ok); setConfirm(null); }}>{confirm.button}</button>
        </div>
      </div>
    </div>
  );

  const novaDialog = nova && (
    <div className="rx-overlay" onClick={() => setNova(null)}>
      <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="es-nova-t" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
        e.preventDefault();
        const r = await act(() => espacosApi.criarTurma(nova), 'Turma criada.');
        if (r?.turma) { setSel(r.turma.id); setNova(null); onNavigate?.('pro-turmas'); }
      }}>
        <h2 id="es-nova-t">Nova turma</h2>
        <p>Turmas organizam grupos. Quem participa não vê os outros participantes.</p>
        <div className="es-field"><label htmlFor="es-tn">Nome da turma</label><input id="es-tn" className="es-input" value={nova.name} onChange={(e) => setNova({ ...nova, name: e.target.value })} /></div>
        <div className="es-field"><label htmlFor="es-td">Descrição <span style={{ color: 'var(--rx-ink-3)', fontWeight: 450 }}>(opcional)</span></label><input id="es-td" className="es-input" placeholder="Ex.: terças e quintas, 18:30" value={nova.description} onChange={(e) => setNova({ ...nova, description: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="rx-btn ghost" onClick={() => setNova(null)}>Cancelar</button><button type="submit" className="rx-btn" disabled={busy}>Criar turma</button></div>
      </form>
    </div>
  );

  const individual = async () => {
    const r = await act(() => espacosApi.conviteIndividual());
    if (r) setCode({ ...r, kind: 'individual', title: 'Convite individual' });
  };

  let body;
  if (view === 'pro-turmas') {
    body = (
      <>
        <div className="es-head"><div><h1>Turmas e convites</h1><p>Turmas organizam grupos. Quem participa de uma turma não vê os outros participantes.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={individual}><User size={16} />Convite individual</button><button type="button" className="rx-btn" onClick={() => setNova({ name: '', description: '' })}><Plus size={16} />Nova turma</button></div></div>
        {turmas.length === 0 ? (
          <section className="es-card" style={{ maxWidth: 640 }}><div className="es-empty"><h3>Nenhuma turma ainda</h3><p>Crie uma turma e gere um código de 24 horas para as pessoas entrarem. Para atender alguém sem turma, use o convite individual.</p><button type="button" className="rx-btn" onClick={() => setNova({ name: '', description: '' })}><Plus size={16} />Criar turma</button></div></section>
        ) : (
          <div className="es-grid list">
            <section className="es-card" style={{ padding: 10 }}>
              {turmas.map((t) => (
                <button key={t.id} type="button" className="es-sel" aria-current={t.id === sel ? 'true' : undefined} onClick={() => setSel(t.id)}>
                  <span className="grow"><b>{t.name}</b><small>{t.description || 'Sem descrição'}</small></span>
                  <span className={`rx-pill ${t.status === 'ativa' ? 'es-pill-on' : ''}`}>{t.status === 'ativa' ? `${t.members} pessoas` : 'Rascunho'}</span>
                </button>
              ))}
            </section>
            {g && (
              <div className="es-stack">
                <article className="es-card">
                  <h2>{g.name} <span className={`rx-pill ${g.status === 'ativa' ? 'es-pill-on' : ''}`}>{g.status === 'ativa' ? 'Ativa' : 'Rascunho'}</span></h2>
                  {g.description && <p className="es-sub">{g.description}</p>}
                  <hr className="es-sep" />
                  <h3>Convite da turma</h3>
                  {g.inviteId ? (
                    <div className="es-row"><div className="grow"><b>Código válido até {fmtUntil(g.inviteUntil)}</b><small>Pode ser usado por várias pessoas. Para ver o código de novo, gere um novo (o anterior deixa de valer).</small></div>
                      <button type="button" className="rx-btn ghost tiny" onClick={async () => { const r = await act(() => espacosApi.gerarConvite(g.id)); if (r) setCode({ ...r, kind: 'turma', title: `Código da turma ${g.name}` }); }}>Gerar novo</button>
                      <button type="button" className="es-danger" onClick={() => setConfirm({ title: 'Revogar o código?', text: 'Ninguém mais entra com ele. Quem já entrou continua na turma.', button: 'Revogar código', ok: 'Código revogado.', run: () => espacosApi.revogar(g.inviteId) })}>Revogar</button></div>
                  ) : g.status === 'ativa' ? (
                    <div className="es-row"><div className="grow"><small>Nenhum código válido agora.</small></div><button type="button" className="rx-btn tiny" onClick={async () => { const r = await act(() => espacosApi.gerarConvite(g.id)); if (r) setCode({ ...r, kind: 'turma', title: `Código da turma ${g.name}` }); }}><Ticket size={15} />Gerar código de 24 h</button></div>
                  ) : (
                    <div className="es-row"><div className="grow"><small>Ative a turma para gerar convites.</small></div><button type="button" className="rx-btn tiny" onClick={() => act(() => espacosApi.editarTurma(g.id, { status: 'ativa' }), 'Turma ativada.')}>Ativar turma</button></div>
                  )}
                  <hr className="es-sep" />
                  <h3>Participantes ({turma?.membros?.length ?? g.members})</h3>
                  {turma?.membros?.length ? turma.membros.map((m) => (
                    <div className="es-row" key={m.memberId}><span className="es-avatar">{initialsOf(m.name)}</span><div className="grow"><b>{m.name}</b><small>@{m.username}, desde {fmtDate(m.since)}</small></div>
                      <button type="button" className="rx-btn ghost tiny" onClick={() => setConfirm({ title: `Remover ${m.name} da turma?`, text: 'O vínculo com você continua e os registros não são apagados.', button: 'Remover da turma', ok: 'Pessoa removida da turma.', run: () => espacosApi.removerMembro(g.id, m.memberId) })}>Remover</button></div>
                  )) : <p className="es-sub">Ninguém ainda.</p>}
                  <hr className="es-sep" />
                  <button type="button" className="es-danger" onClick={() => setConfirm({ title: `Arquivar ${g.name}?`, text: 'A turma sai da lista e os códigos deixam de valer. Vínculos e registros continuam.', button: 'Arquivar turma', ok: 'Turma arquivada.', run: async () => { await espacosApi.editarTurma(g.id, { status: 'arquivada' }); setSel(''); } })}>Arquivar turma</button>
                </article>
              </div>
            )}
          </div>
        )}
      </>
    );
  } else if (view === 'pro-pessoas') {
    body = (
      <>
        <div className="es-head"><div><h1>{peopleLabel}</h1><p>{pessoas?.length || 0} com vínculo ativo. Você vê só o que atribuir e os registros disso.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={individual}><User size={16} />Convite individual</button></div></div>
        <article className="es-card">
          {!pessoas?.length ? <div className="es-empty"><h3>Ninguém ainda</h3><p>As pessoas aparecem aqui quando entram com um código de turma ou com um convite individual.</p></div> : (
            <table className="es-table resp">
              <thead><tr><th>Nome</th><th>Turmas</th><th>Desde</th><th /></tr></thead>
              <tbody>
                {pessoas.map((p) => (
                  <tr key={p.linkId}>
                    <td className="wide"><span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><span className="es-avatar">{initialsOf(p.name)}</span><span><b>{p.name}</b><br /><small style={{ color: 'var(--rx-ink-3)' }}>@{p.username}</small></span></span></td>
                    <td data-l="Turmas">{p.turmas.length ? p.turmas.join(', ') : 'Sem turma'}</td>
                    <td data-l="Desde">{fmtDate(p.since)}</td>
                    <td><button type="button" className="es-danger" onClick={() => setConfirm({ title: `Encerrar vínculo com ${p.name}?`, text: 'Você perde o acesso aos registros desta pessoa na hora. Ela continua com tudo o que recebeu. Nada é apagado.', button: 'Encerrar vínculo', ok: 'Vínculo encerrado.', run: () => espacosApi.encerrarPessoa(p.linkId) })}>Encerrar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
        <div className="es-note" style={{ marginTop: 16 }}><Lock size={16} /><span>Hábitos, notas, foco, saúde, agenda pessoal e treinos próprios das pessoas não aparecem para você. O servidor confere o vínculo a cada pedido.</span></div>
      </>
    );
  } else {
    body = (
      <>
        <div className="es-head"><div><h1>{meu.pro.spaceName}</h1><p>{meu.pro.modelLabel}. Aqui aparecem só pessoas com vínculo ativo e o que você atribuir a elas.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={individual}><User size={16} />Convite individual</button><button type="button" className="rx-btn" onClick={() => onNavigate?.('pro-turmas')}><Ticket size={16} />Turmas e convites</button></div></div>
        <div className="rx-strip" style={{ marginTop: 0 }}>
          <div className="rx-seg"><h3><Users size={16} />{peopleLabel} ativos</h3><div className="v">{meu.pessoas.total}</div><p>{meu.pessoas.ultimos7dias} entraram nos últimos 7 dias.</p></div>
          <div className="rx-seg"><h3><Ticket size={16} />Turmas ativas</h3><div className="v">{turmas.filter((t) => t.status === 'ativa').length}</div><p>{turmas.filter((t) => t.inviteId).length} com código válido agora.</p></div>
          <div className="rx-seg"><h3><User size={16} />Participações</h3><div className="v">{turmas.reduce((a, t) => a + t.members, 0)}</div><p>Somando todas as turmas.</p></div>
          <div className="rx-seg"><h3><Lock size={16} />Privacidade</h3><div className="v" style={{ fontSize: 22 }}>Só o atribuído</div><p>Nada pessoal das pessoas aparece aqui.</p></div>
        </div>
        <div className="es-grid" style={{ marginTop: 28 }}>
          <article className="es-card">
            <h2>Turmas</h2>
            {turmas.length === 0 ? <div className="es-empty"><p>Nenhuma turma ainda.</p><button type="button" className="rx-btn" onClick={() => setNova({ name: '', description: '' })}><Plus size={16} />Criar turma</button></div> : turmas.map((t) => (
              <div className="es-row" key={t.id}><div className="grow"><b>{t.name}</b><small>{t.members} pessoas{t.inviteId ? `, código válido até ${fmtUntil(t.inviteUntil)}` : ''}</small></div><button type="button" className="rx-btn ghost tiny" onClick={() => { setSel(t.id); onNavigate?.('pro-turmas'); }}>Abrir</button></div>
            ))}
          </article>
          <aside className="rx-rail">
            <section className="summary"><h2>Próximos passos</h2><p className="rx-sub">Atribuição de treinos e planos, agenda com convites e avisos chegam nos próximos lotes.</p></section>
            <section><h2>Seu Ethos pessoal</h2><p className="rx-sub">Seus hábitos e sua agenda continuam no contexto Pessoal. Dados das pessoas nunca aparecem lá.</p></section>
          </aside>
        </div>
      </>
    );
  }

  return <div className="es">{body}{codeDialog}{confirmDialog}{novaDialog}</div>;
}
