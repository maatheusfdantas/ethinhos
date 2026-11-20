import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Lock, Plus, Ticket, User } from 'lucide-react';
import { espacosApi, fmtDate, fmtUntil, initialsOf } from './espacosApi';
import { AtribuirDialog } from './AtribuirDialog';
import { ProIndividual } from './ProIndividual';
import { ProConteudo } from './ProConteudo';
import { AvisosPanel, EventosPanel, ProAgendaPage } from './ProAgenda';
import '../../styles/espacos.css';

/**
 * Meu espaço (profissional), em três níveis (docs/11, seção 8):
 * 1. Espaço: visão geral só com o que pede ação; cada número abre a lista.
 * 2. Turma: participantes, atribuições (Personal) e, nos lotes seguintes, agenda e avisos.
 * 3. Área individual: acompanhamento restrito de uma pessoa.
 * O servidor confere perfil ativo, modelo e vínculo a cada pedido; esta tela só mostra o que ele devolve.
 * `extensions` permite aos outros lotes (agenda, alimentação, clínica) acrescentar abas e telas.
 */
export function ProEspaco({ view = 'pro-visao', pro, onNavigate, navParams = null, showToast, extensions = {} }) {
  const [meu, setMeu] = useState(null);
  const [pessoas, setPessoas] = useState(null);
  const [visao, setVisao] = useState(null);
  const [bloco, setBloco] = useState('');
  const [sel, setSel] = useState(navParams?.turmaId || '');
  const [turma, setTurma] = useState(null);
  const [turmaTab, setTurmaTab] = useState('Participantes');
  const [turmaAtrib, setTurmaAtrib] = useState(null);
  const [pessoaSel, setPessoaSel] = useState(view === 'pro-pessoas' && navParams?.linkId ? { linkId: navParams.linkId, tab: navParams.tab || null } : null);
  const [nova, setNova] = useState(null);
  const [code, setCode] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [atribuir, setAtribuir] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = (m) => showToast?.(m);
  const model = meu?.pro?.model || pro?.model;
  const peopleLabel = meu?.pro?.peopleLabel || pro?.peopleLabel || 'Pessoas';

  const load = useCallback(async () => {
    try {
      const [m, p, v] = await Promise.all([espacosApi.meu(), espacosApi.pessoas(), espacosApi.visao().catch(() => null)]);
      setMeu(m);
      setPessoas(p.pessoas || []);
      setVisao(v);
      setSel((s) => s || m.turmas?.[0]?.id || '');
      setBloco((b) => b || v?.blocos?.[0]?.key || '');
    } catch (e) {
      toast(e.message);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!sel) { setTurma(null); setTurmaAtrib(null); return; }
    let alive = true;
    espacosApi.turma(sel).then((r) => alive && setTurma(r), () => alive && setTurma(null));
    if (model === 'personal') espacosApi.atribuicoesTurma(sel).then((r) => alive && setTurmaAtrib(r.atribuicoes || []), () => alive && setTurmaAtrib([]));
    return () => { alive = false; };
  }, [sel, meu, model]);

  const act = async (fn, ok) => {
    if (busy) return null;
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

  const openPessoa = (linkId, tab = null) => {
    setPessoaSel({ linkId, tab });
    if (view !== 'pro-pessoas') onNavigate?.('pro-pessoas', { linkId, tab });
  };

  if (!meu) return <div className="es"><p className="es-sub">Carregando seu espaço…</p></div>;
  if (!meu.pro || meu.pro.status !== 'ativo') {
    return <div className="es"><section className="es-card" style={{ maxWidth: 560 }}><div className="es-empty"><h3>Espaço indisponível</h3><p>{meu.pro?.status === 'suspenso' ? 'Seu espaço está suspenso. Fale com o suporte do Ethos.' : 'Esta conta não tem modo profissional.'}</p></div></section></div>;
  }
  const turmas = meu.turmas || [];
  const g = turmas.find((t) => t.id === sel);
  // Abas e ações dos lotes de agenda/avisos (C) e dos outros lotes (extensions).
  const ext = {
    conteudo: extensions.conteudo,
    turmaTabs: (p) => [
      { label: 'Agenda', render: ({ turma: t }) => <EventosPanel key={`ag-${t.id}`} groupId={t.id} fixedLabel={`a turma ${t.name}`} toast={toast} title="Eventos da turma" /> },
      { label: 'Avisos', render: ({ turma: t }) => <AvisosPanel key={`av-${t.id}`} groupId={t.id} fixedLabel={`a turma ${t.name}`} toast={toast} /> },
      ...(extensions.turmaTabs ? extensions.turmaTabs(p) : [])
    ],
    individualTabs: (p) => [
      ...(extensions.individualTabs ? extensions.individualTabs(p) : []),
      { label: 'Agenda', render: ({ linkId, pessoa }) => <EventosPanel linkId={linkId} fixedLabel={pessoa.name} toast={toast} title={`Eventos com ${pessoa.name.split(' ')[0]}`} /> },
      { label: 'Avisos', render: ({ linkId, pessoa }) => <AvisosPanel linkId={linkId} fixedLabel={pessoa.name} toast={toast} /> }
    ],
    visaoAction: (b, it, h) => {
      if (b.action === 'lembrar' && it.eventId && it.inviteId) return <button type="button" className="rx-btn ghost tiny" onClick={async () => { try { await espacosApi.lembrar(it.eventId, it.inviteId); toast(`Lembrete enviado a ${it.name}.`); } catch (e) { toast(e.message); } }}>Lembrar</button>;
      if (b.action === 'agenda') return <button type="button" className="rx-btn ghost tiny" onClick={() => onNavigate?.('pro-agenda')}>Agenda</button>;
      return extensions.visaoAction ? extensions.visaoAction(b, it, h) : null;
    }
  };

  const individual = async () => {
    const r = await act(() => espacosApi.conviteIndividual());
    if (r) setCode({ ...r, kind: 'individual', title: 'Convite individual' });
  };

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
        if (r?.turma) { setSel(r.turma.id); setNova(null); if (view !== 'pro-turmas') onNavigate?.('pro-turmas', { turmaId: r.turma.id }); }
      }}>
        <h2 id="es-nova-t">Nova turma</h2>
        <p>Turmas organizam grupos. Quem participa não vê os outros participantes.</p>
        <div className="es-field"><label htmlFor="es-tn">Nome da turma</label><input id="es-tn" className="es-input" maxLength={80} value={nova.name} onChange={(e) => setNova({ ...nova, name: e.target.value })} /></div>
        <div className="es-field"><label htmlFor="es-td">Descrição <span style={{ color: 'var(--rx-ink-3)', fontWeight: 450 }}>(opcional)</span></label><input id="es-td" className="es-input" maxLength={240} placeholder="Ex.: terças e quintas, 18:30" value={nova.description} onChange={(e) => setNova({ ...nova, description: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="rx-btn ghost" onClick={() => setNova(null)}>Cancelar</button><button type="submit" className="rx-btn" disabled={busy}>Criar turma</button></div>
      </form>
    </div>
  );

  const itemAction = (b, it) => {
    if (b.action === 'atribuir') return <button type="button" className="rx-btn tiny" onClick={() => setAtribuir({ linkIds: [it.linkId], alvo: it.name })}>Atribuir</button>;
    if (b.action === 'abrir' && it.linkId) return <button type="button" className="rx-btn ghost tiny" onClick={() => openPessoa(it.linkId, model === 'personal' ? 'Registros' : 'Registros')}>Abrir</button>;
    if (b.action === 'plano' && it.linkId) return <button type="button" className="rx-btn tiny" onClick={() => openPessoa(it.linkId, 'Plano')}>Abrir plano</button>;
    if (ext.visaoAction) return ext.visaoAction(b, it, { reload: load, toast, onNavigate });
    return null;
  };

  let body;
  if (view === 'pro-agenda') {
    body = <ProAgendaPage toast={toast} pro={meu.pro} />;
  } else if (view === 'pro-conteudo') {
    body = model === 'personal' ? <ProConteudo toast={toast} /> : ext.conteudo ? ext.conteudo({ toast }) : <div className="es-empty"><p>Nada por aqui para este modelo.</p></div>;
  } else if (view === 'pro-pessoas' && pessoaSel) {
    body = <ProIndividual key={pessoaSel.linkId} linkId={pessoaSel.linkId} pro={meu.pro} toast={toast} extraTabs={ext.individualTabs ? ext.individualTabs(meu.pro) : []} onBack={() => { setPessoaSel(null); onNavigate?.('pro-pessoas', null); load(); }} initialTab={pessoaSel.tab} />;
  } else if (view === 'pro-turmas') {
    const turmaTabs = ['Participantes', ...(model === 'personal' ? ['Atribuições'] : []), ...(ext.turmaTabs ? ext.turmaTabs(meu.pro).map((t) => t.label) : [])];
    const extTurma = ext.turmaTabs ? ext.turmaTabs(meu.pro).find((t) => t.label === turmaTab) : null;
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
                <div className="es-head" style={{ marginBottom: 0 }}><div><h1 style={{ fontSize: 28 }}>{g.name}</h1><p>{g.description || 'Sem descrição'}. {g.members} participantes.</p></div></div>
                <div className="es-tabs-row" role="group" aria-label="Seções da turma">
                  {turmaTabs.map((t) => <button key={t} type="button" aria-pressed={t === turmaTab} onClick={() => setTurmaTab(t)}>{t}</button>)}
                </div>
                {turmaTab === 'Participantes' && (
                  <article className="es-card">
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
                    {turma?.membros?.length ? turma.membros.map((m) => {
                      const p = (pessoas || []).find((x) => x.username === m.username);
                      return (
                        <div className="es-row" key={m.memberId}><span className="es-avatar">{initialsOf(m.name)}</span><div className="grow"><b>{m.name}</b><small>@{m.username}, desde {fmtDate(m.since)}</small></div>
                          {p && <button type="button" className="rx-btn ghost tiny" onClick={() => openPessoa(p.linkId)}>Área individual</button>}
                          <button type="button" className="rx-btn ghost tiny" onClick={() => setConfirm({ title: `Remover ${m.name} da turma?`, text: 'O vínculo com você continua e os registros não são apagados. O que veio desta turma fica com a pessoa, encerrado.', button: 'Remover da turma', ok: 'Pessoa removida da turma.', run: () => espacosApi.removerMembro(g.id, m.memberId) })}>Remover</button></div>
                      );
                    }) : <p className="es-sub">Ninguém ainda. Gere o código e envie às pessoas.</p>}
                    <p className="es-sub">Só você vê esta lista.</p>
                    <hr className="es-sep" />
                    <button type="button" className="es-danger" onClick={() => setConfirm({ title: `Arquivar ${g.name}?`, text: 'A turma sai da lista e os códigos deixam de valer. Vínculos e registros continuam.', button: 'Arquivar turma', ok: 'Turma arquivada.', run: async () => { await espacosApi.editarTurma(g.id, { status: 'arquivada' }); setSel(''); } })}>Arquivar turma</button>
                  </article>
                )}
                {turmaTab === 'Atribuições' && (
                  <article className="es-card">
                    <h2>Atribuído a esta turma <button type="button" className="rx-btn tiny" onClick={() => setAtribuir({ groupId: g.id, alvo: `a turma ${g.name}` })}><Plus size={15} />Atribuir ficha</button></h2>
                    {turmaAtrib === null ? <p className="es-sub">Carregando…</p> : turmaAtrib.length === 0 ? <div className="es-empty"><p>Nada atribuído a esta turma ainda.</p></div> : turmaAtrib.map((a) => (
                      <div className="es-row" key={a.templateId}><div className="grow"><b>{a.name}</b><small>versão {a.version}, {a.people} {a.people === 1 ? 'pessoa' : 'pessoas'}{a.adapted ? `, ${a.adapted} ${a.adapted === 1 ? 'adaptada' : 'adaptadas'}` : ''}, desde {fmtDate(a.since)}</small></div></div>
                    ))}
                    <p className="es-sub">Atribuir à turma cria uma cópia por pessoa. Adaptar a de alguém não muda os colegas. Quem entra depois não recebe sozinho: atribua de novo (quem já tem não recebe duplicado).</p>
                  </article>
                )}
                {extTurma && extTurma.render({ turma: g, pro: meu.pro, toast, reload: load })}
              </div>
            )}
          </div>
        )}
      </>
    );
  } else if (view === 'pro-pessoas') {
    body = (
      <>
        <div className="es-head"><div><h1>{peopleLabel}</h1><p>{pessoas?.length || 0} com vínculo ativo. Abra a área individual para planejar e acompanhar.</p></div>
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
                    <td><button type="button" className="rx-btn tiny" onClick={() => openPessoa(p.linkId)}>Área individual</button></td>
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
    const blocos = visao?.blocos || [];
    const b = blocos.find((x) => x.key === bloco) || blocos[0];
    body = (
      <>
        <div className="es-head"><div><h1>{meu.pro.spaceName}</h1><p>{meu.pro.modelLabel}. O que pede sua atenção hoje: cada número abre a lista correspondente.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={individual}><User size={16} />Convite individual</button><button type="button" className="rx-btn" onClick={() => onNavigate?.('pro-turmas')}><Ticket size={16} />Turmas e convites</button></div></div>
        {blocos.length > 0 ? (
          <div className="es-act" role="group" aria-label="Ações">
            {blocos.map((x) => (
              <button key={x.key} type="button" aria-pressed={b?.key === x.key} onClick={() => setBloco(x.key)}>
                <span className="n">{x.items.length}</span><span className="l">{x.label}</span>
              </button>
            ))}
          </div>
        ) : <div className="es-note">Nada pedindo ação agora.</div>}
        <div className="es-grid" style={{ marginTop: 24 }}>
          <article className="es-card">
            {b ? (
              <>
                <h2>{b.label} <span className="rx-pill">{b.items.length}</span></h2>
                {b.items.length === 0 ? <div className="es-empty"><p>{b.key === 'registros_novos' ? 'Nenhum registro novo desde a sua última visita.' : b.key === 'sem_atribuicao' ? 'Todo mundo tem treino atribuído.' : 'Nada aqui agora.'}</p></div> : b.items.map((it, i) => (
                  <div className="es-row" key={`${b.key}-${i}`}><span className="es-avatar">{initialsOf(it.name)}</span><div className="grow"><b>{it.name}</b><small>{it.detail}{it.at ? `, ${fmtUntil(it.at)}` : ''}</small></div>{itemAction(b, it)}</div>
                ))}
                {b.key === 'registros_novos' && b.items.length > 0 && <button type="button" className="rx-btn ghost tiny" style={{ marginTop: 10 }} onClick={async () => { await act(() => espacosApi.visto(), 'Marcado como visto.'); }}>Já vi tudo</button>}
              </>
            ) : <div className="es-empty"><h3>Comece pelas turmas</h3><p>Crie uma turma e gere um código para as pessoas entrarem.</p><button type="button" className="rx-btn" onClick={() => setNova({ name: '', description: '' })}><Plus size={16} />Criar turma</button></div>}
          </article>
          <aside className="rx-rail">
            <section className="summary"><h2>Turmas</h2>
              {turmas.length === 0 ? <p className="rx-sub">Nenhuma turma ainda.</p> : <ul className="rx-list">{turmas.map((t) => <li key={t.id}><span className="ic violet"><Ticket size={16} /></span><div><b>{t.name}</b><p>{t.members} pessoas{t.inviteId ? `, código válido até ${fmtUntil(t.inviteUntil)}` : ''}</p></div></li>)}</ul>}
            </section>
            <section><h2>{peopleLabel}</h2><p className="rx-sub">{visao?.pessoas ?? pessoas?.length ?? 0} com vínculo ativo.</p></section>
            <section><h2>Privacidade</h2><p className="rx-sub">{model === 'personal' ? 'Personal não acessa alimentação.' : model === 'nutri' ? 'Nutricionista não acessa treinos.' : 'Clínica não acessa treinos nem alimentação.'} Hábitos, notas, saúde e agenda pessoal das pessoas nunca aparecem aqui.</p></section>
          </aside>
        </div>
      </>
    );
  }

  return (
    <div className="es">
      {body}{codeDialog}{confirmDialog}{novaDialog}
      {atribuir && <AtribuirDialog groupId={atribuir.groupId || null} linkIds={atribuir.linkIds || null} alvo={atribuir.alvo} toast={toast} onClose={() => setAtribuir(null)} onDone={() => { setAtribuir(null); load(); if (sel) espacosApi.atribuicoesTurma(sel).then((r) => setTurmaAtrib(r.atribuicoes || []), () => {}); }} />}
    </div>
  );
}
