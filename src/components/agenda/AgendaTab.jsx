import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Dumbbell, Edit2, Plus, Repeat, Trash2, Video, X } from 'lucide-react';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import '../../styles/espacos.css';
import '../../styles/telas.css';

const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SEMF = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const LEMBRETES = ['15 min antes', '30 min antes', '1 hora antes', '1 dia antes'];
const CORES = ['#A78BFA', '#60A5FA', '#F5B971', '#F38B8B', '#C4B5FD', '#34D399'];
const DIA = 24 * 60 * 60 * 1000;

export const isoDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Expande eventos que se repetem em volta da data do cursor (mesma regra da Agenda antiga:
 * até 90 dias a partir do início, janela de 45 dias para cada lado, fim por data ou contagem e datas de exceção).
 */
export function expandirRecorrencias(baseList, cursorDate) {
  const expanded = [...baseList];
  const startTime = cursorDate.getTime() - 45 * DIA;
  const endTime = cursorDate.getTime() + 45 * DIA;
  baseList.forEach((ev) => {
    const rep = ev.repeat || ev.repeat_rule;
    if (!rep || rep === 'Nunca' || !ev.date) return;
    const cfg = ev.repeatConfig || {};
    const repeatDays = Array.isArray(cfg.repeatDays) ? cfg.repeatDays : [1, 2, 3, 4, 5];
    const endType = cfg.repeatEndType || 'never';
    const endDateStr = cfg.repeatEndDate || '';
    const maxCount = Number(cfg.repeatCount) || 30;
    const blackout = Array.isArray(cfg.blackoutDates) ? cfg.blackoutDates : [];
    const inicio = new Date(`${ev.date}T12:00:00`);
    let count = 1;
    for (let off = 1; off <= 90; off++) {
      const cur = new Date(inicio.getTime() + off * DIA);
      if (cur.getTime() < startTime) continue;
      if (cur.getTime() > endTime) break;
      const k = isoDia(cur);
      if (endType === 'until_date' && endDateStr && k > endDateStr) break;
      if (endType === 'count' && count >= maxCount) break;
      if (blackout.includes(k)) continue;
      let ok = false;
      if (rep === 'Diário') ok = true;
      else if (rep === 'Semanal') ok = repeatDays.includes(cur.getDay());
      else if (rep === 'Quinzenal') ok = Math.floor(off / 7) % 2 === 0 && repeatDays.includes(cur.getDay());
      else if (rep === 'Mensal') ok = cur.getDate() === inicio.getDate();
      if (ok) {
        count++;
        expanded.push({ ...ev, id: `${ev.id}_rec_${k}`, date: k, endDate: k, isRecurrence: true, originalEventId: ev.id });
      }
    }
  });
  return expanded;
}

const vazio = (dateStr, categoria) => ({ id: null, title: '', date: dateStr, endDate: dateStr, startTime: '09:00', endTime: '10:00', category: categoria, customColor: '', location: '', description: '', reminder: '15 min antes', participantsText: '', participants: [] });

/**
 * Agenda no visual atual do Ethos (proposta 09, aprovada em 21/11/2026). Mesmas props e ações da CalendarTab antiga
 * (que continua no código): mês, semana e dia; criar, editar, concluir e excluir; repetição; eventos dos espaços
 * só leitura; treinos do dia. O botão simulado do Google Agenda não aparece (o código dele continua no repositório).
 */
export function AgendaTab({ user, events = [], setEvents, workouts = [], friends = [], onToggleEvent, onAddEvent, onDeleteEvent, onSwitchTab, showToast, tags = [], spaceEvents = [] }) {
  const hoje = isoDia(new Date());
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [sel, setSel] = useState(hoje);
  const [form, setForm] = useState(null);
  const [inicial, setInicial] = useState('');
  const [apagar, setApagar] = useState(null);

  const categorias = useMemo(() => (Array.isArray(tags) ? tags : []).filter((t) => t?.name).map((t, i) => ({ name: t.name, color: t.color || CORES[i % CORES.length] })), [tags]);
  const amigos = useMemo(() => (Array.isArray(friends) ? friends.filter((f) => f.status === 'approved') : []), [friends]);
  const todos = useMemo(() => expandirRecorrencias([...events, ...spaceEvents], cursor), [events, spaceEvents, cursor]);
  const doDia = (k) => todos.filter((e) => e.date === k).sort((a, b) => (a.allDay ? '00:00' : a.startTime || '').localeCompare(b.allDay ? '00:00' : b.startTime || ''));
  const cor = (ev) => ev.customColor || categorias.find((c) => c.name === ev.category)?.color || 'var(--rx-violet)';
  const fichasDo = (d) => workouts.filter((w) => (w.scheduledDays || []).includes(d.getDay()));
  const hora = (ev) => (ev.allDay ? 'Dia todo' : `${ev.startTime || '09:00'}${ev.endTime ? ` às ${ev.endTime}` : ''}`);
  const original = (ev) => (ev.isRecurrence ? events.find((e) => e.id === ev.originalEventId) || ev : ev);

  /* ---------- Formulário (salvar explícito; sair com alteração pergunta) ---------- */
  const dirty = Boolean(form) && JSON.stringify(form) !== inicial;
  const abrir = (f) => { setInicial(JSON.stringify(f)); setForm(f); };
  const novo = (k) => abrir(vazio(k || (view === 'month' ? sel : isoDia(cursor)), categorias[0]?.name || ''));
  const editar = (ev) => {
    if (ev.readOnly) { showToast?.(`Evento do espaço ${ev.spaceName}, ${ev.startTime} às ${ev.endTime}${ev.location ? `, ${ev.location}` : ''}. Para mudar, fale com o profissional.`); return; }
    const o = original(ev);
    abrir({ ...vazio(o.date, o.category || ''), ...o, participants: Array.isArray(o.participants) ? o.participants : [] });
  };
  const salvar = () => {
    if (!form || !form.title.trim()) return false;
    const campos = { title: form.title.trim(), date: form.date, endDate: form.endDate || form.date, startTime: form.startTime, endTime: form.endTime, category: form.category, customColor: form.customColor, location: (form.location || '').trim(), description: (form.description || '').trim(), reminder: form.reminder, participantsText: (form.participantsText || '').trim(), participants: form.participants };
    if (form.id) {
      const atual = events.find((e) => e.id === form.id) || {};
      const salvo = { ...atual, ...campos, id: form.id };
      setEvents?.((prev) => prev.map((e) => (e.id === form.id ? salvo : e)));
      if (user?.id) fetch(`/api/user/${user.id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(salvo) }).catch(() => showToast?.('Não foi possível salvar no servidor. Tente de novo.'));
      showToast?.(`${salvo.title} atualizado.`);
    } else {
      const ev = { id: `ev_${Date.now()}`, ...campos, allDay: false, completed: false };
      onAddEvent?.(ev);
      showToast?.(`${ev.title} adicionado à agenda.`);
    }
    setForm(null);
    return true;
  };
  const guard = useUnsavedGuard(dirty, { label: form?.id ? `o evento ${form.title || ''}`.trim() : 'o evento novo', onSave: salvar });
  const fechar = () => guard.confirm(() => setForm(null));

  /* ---------- Ações ---------- */
  const alternar = (ev) => {
    if (ev.readOnly) { showToast?.('Eventos dos espaços não são marcados como concluídos aqui.'); return; }
    if (ev.isRecurrence) { showToast?.('Eventos que se repetem não são marcados dia a dia ainda.'); return; }
    onToggleEvent?.(ev.id, !ev.completed);
    showToast?.(!ev.completed ? `${ev.title} concluído.` : `${ev.title} reaberto.`);
  };
  const pedirExclusao = (ev) => {
    if (ev.readOnly) { showToast?.('Para sair deste evento, recuse ou fale com o profissional do espaço.'); return; }
    setApagar(original(ev));
  };
  const excluir = () => { onDeleteEvent?.(apagar.id); showToast?.(`${apagar.title} removido.`); setApagar(null); };

  /* ---------- Navegação ---------- */
  const navegar = (dir) => setCursor((prev) => {
    const d = new Date(prev);
    if (view === 'day') d.setDate(d.getDate() + dir); else if (view === 'week') d.setDate(d.getDate() + dir * 7); else d.setMonth(d.getMonth() + dir);
    return d;
  });
  const irHoje = () => { setCursor(new Date()); setSel(hoje); };
  const abrirDia = (k) => { setCursor(new Date(`${k}T12:00:00`)); setSel(k); setView('day'); };
  const semana = useMemo(() => {
    const b = new Date(cursor); const k = b.getDay(); b.setDate(b.getDate() + (k === 0 ? -6 : 1 - k));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(b); d.setDate(b.getDate() + i); return d; });
  }, [cursor]);
  const celulas = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth(), off = (new Date(y, m, 1).getDay() + 6) % 7;
    const total = Math.ceil((off + new Date(y, m + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: total }, (_, i) => new Date(y, m, 1 - off + i));
  }, [cursor]);
  const titulo = view === 'month' ? `${cap(MES[cursor.getMonth()])} de ${cursor.getFullYear()}`
    : view === 'week' ? `${semana[0].getDate()} de ${MES[semana[0].getMonth()]} a ${semana[6].getDate()} de ${MES[semana[6].getMonth()]}`
    : `${cap(SEMF[cursor.getDay()])}, ${cursor.getDate()} de ${MES[cursor.getMonth()]}`;

  const pendentesHoje = doDia(hoje).filter((e) => !e.completed && !e.cancelled);
  const proximos = todos.filter((e) => e.date >= hoje && !e.cancelled).sort((a, b) => `${a.date}${a.startTime || ''}`.localeCompare(`${b.date}${b.startTime || ''}`)).slice(0, 5);

  const linhas = (k) => {
    const d = new Date(`${k}T12:00:00`);
    const lista = doDia(k);
    const fichas = fichasDo(d);
    if (!lista.length && !fichas.length) return <div className="es-empty"><p>Nada marcado para este dia.</p><button type="button" className="rx-btn ghost tiny" onClick={() => novo(k)}><Plus size={14} />Adicionar evento</button></div>;
    return (<>
      {lista.map((ev) => (
        <div key={ev.id} className={`ag-row ${ev.completed || ev.cancelled ? 'done' : ''}`} data-testid="ag-evento">
          <span className="hr">{ev.allDay ? 'Dia todo' : ev.startTime}{!ev.allDay && ev.endTime && <><br /><small className="rx-sub">{ev.endTime}</small></>}</span>
          {ev.readOnly || ev.isRecurrence ? <span aria-hidden="true" /> : <button type="button" className="rx-check" aria-pressed={Boolean(ev.completed)} aria-label={`${ev.completed ? 'Reabrir' : 'Concluir'} ${ev.title}`} onClick={() => alternar(ev)}><Check size={16} strokeWidth={2.6} /></button>}
          <div style={{ minWidth: 0 }}>
            <div className="t">{ev.title}</div>
            <div className="m">
              {ev.category && !ev.readOnly && <span><span className="rx-dot" style={{ '--rx-dot': cor(ev), marginRight: 5 }} aria-hidden="true" />{ev.category}</span>}
              {ev.location && <span>{ev.location}</span>}
              {ev.repeat && ev.repeat !== 'Nunca' && <span><Repeat size={12} /> {ev.repeat}</span>}
              {ev.bufferBefore > 0 && <span>{ev.bufferBefore} min de preparo</span>}
              {ev.meetingUrl && <a className="rx-link" style={{ height: 'auto', padding: 0 }} href={ev.meetingUrl} target="_blank" rel="noreferrer"><Video size={12} /> Entrar na chamada</a>}
              {ev.readOnly && <span>{ev.spaceName}, só leitura</span>}
            </div>
          </div>
          {ev.readOnly ? <span aria-hidden="true" /> : (
            <div className="hb-acts">
              <button type="button" className="step" aria-label={`Editar ${ev.title}`} onClick={() => editar(ev)}><Edit2 size={15} /></button>
              <button type="button" className="del" aria-label={`Excluir ${ev.title}`} onClick={() => pedirExclusao(ev)}><Trash2 size={15} /></button>
            </div>
          )}
        </div>
      ))}
      {fichas.map((w) => (
        <div key={`${w.id}_${k}`} className="ag-row">
          <span className="hr">{w.scheduledTime || 'Treino'}</span><span aria-hidden="true" />
          <div style={{ minWidth: 0 }}><div className="t">{w.name}</div><div className="m"><span><Dumbbell size={12} /> {w.exercises?.length || 0} exercícios</span></div></div>
          <button type="button" className="rx-link" onClick={() => onSwitchTab?.('workouts')}>Abrir treino</button>
        </div>
      ))}
    </>);
  };

  const chip = (ev) => <span key={ev.id} className={`ag-chip ${ev.completed || ev.cancelled ? 'done' : ''} ${ev.readOnly ? 'ro' : ''}`} style={{ '--c': cor(ev) }}><i aria-hidden="true" />{ev.title}</span>;
  const selD = new Date(`${sel}T12:00:00`);

  return (
    <div className="es ag">
      <div className="es-head">
        <div><h1>Agenda</h1><p>{pendentesHoje.length ? `Hoje: ${pendentesHoje.length} ${pendentesHoje.length === 1 ? 'compromisso pendente' : 'compromissos pendentes'}${pendentesHoje[0].allDay ? '' : `, o próximo às ${pendentesHoje[0].startTime}`}.` : 'Nada pendente hoje.'}</p></div>
        <div className="acts"><button type="button" className="rx-btn" onClick={() => novo()}><Plus size={16} />Novo evento</button></div>
      </div>
      <div className="es-grid">
        <article className="es-card">
          <div className="ag-bar">
            <div className="ag-nav">
              <button type="button" className="ag-ico" aria-label="Anterior" onClick={() => navegar(-1)}><ChevronLeft size={18} /></button>
              <button type="button" className="rx-btn ghost tiny" onClick={irHoje}>Hoje</button>
              <button type="button" className="ag-ico" aria-label="Próximo" onClick={() => navegar(1)}><ChevronRight size={18} /></button>
              <h2>{titulo}</h2>
            </div>
            <div className="tl-seg" role="group" aria-label="Visualização">
              {[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']].map(([k, l]) => <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}
            </div>
          </div>

          {view === 'month' && (<>
            <div className="ag-month">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((w) => <div key={w} className="wd">{w}</div>)}
              {celulas.map((d) => {
                const k = isoDia(d); const es = doDia(k);
                return (
                  <button key={k} type="button" className={`ag-day ${d.getMonth() !== cursor.getMonth() ? 'out' : ''} ${k === hoje ? 'today' : ''}`} aria-pressed={k === sel} onClick={() => setSel(k)} onDoubleClick={() => abrirDia(k)}
                    aria-label={`${d.getDate()} de ${MES[d.getMonth()]}, ${es.length} ${es.length === 1 ? 'evento' : 'eventos'}`}>
                    <span className="n">{d.getDate()}</span>
                    {es.slice(0, 2).map(chip)}
                    {es.length > 2 && <span className="ag-more">mais {es.length - 2}</span>}
                    <span className="ag-dots" aria-hidden="true">{es.slice(0, 4).map((ev) => <i key={ev.id} style={{ '--c': cor(ev) }} />)}</span>
                  </button>
                );
              })}
            </div>
            <h3 className="ag-sel">{cap(SEMF[selD.getDay()])}, {selD.getDate()} de {MES[selD.getMonth()]}</h3>
            {linhas(sel)}
          </>)}

          {view === 'week' && (
            <div className="ag-week">
              {semana.map((d) => {
                const k = isoDia(d);
                return (
                  <div key={k} className={`ag-col ${k === hoje ? 'today' : ''}`}>
                    <button type="button" className="h" onClick={() => abrirDia(k)}>{SEM[d.getDay()]}<b>{d.getDate()}</b></button>
                    {doDia(k).map((ev) => <button key={ev.id} type="button" className={`ag-ev ${ev.completed || ev.cancelled ? 'done' : ''}`} style={{ '--c': cor(ev) }} onClick={() => abrirDia(k)}>{ev.title}<small>{hora(ev)}{ev.readOnly ? `, ${ev.spaceName}` : ''}</small></button>)}
                    {fichasDo(d).map((w) => <button key={`${w.id}_${k}`} type="button" className="ag-ev wo" onClick={() => onSwitchTab?.('workouts')}>{w.name}<small>Treino</small></button>)}
                    <button type="button" className="ag-add" onClick={() => novo(k)}>+ Adicionar</button>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'day' && linhas(isoDia(cursor))}
        </article>

        <aside className="rx-rail">
          <section className="summary">
            <h2>Próximos</h2>
            {proximos.length === 0 ? <p className="rx-sub">Nenhum compromisso marcado.</p> : (
              <ul className="ag-list">{proximos.map((ev) => (
                <li key={ev.id}><span>{ev.date === hoje ? 'Hoje' : `${+ev.date.slice(8)}/${+ev.date.slice(5, 7)}`}<br />{ev.allDay ? 'Dia todo' : ev.startTime}</span>
                  <span><b>{ev.title}</b><small>{ev.readOnly ? ev.spaceName : ev.category || 'Sem categoria'}{ev.location ? `, ${ev.location}` : ''}</small></span></li>
              ))}</ul>
            )}
          </section>
          <section>
            <h2>Categorias</h2>
            {categorias.length === 0 ? <p className="rx-sub">Sem categorias. Crie uma em “Nova categoria” no menu.</p>
              : <div className="es-chips" style={{ marginTop: 10 }}>{categorias.map((c) => <span key={c.name} className="es-chip" style={{ cursor: 'default' }}><span className="rx-dot" style={{ '--rx-dot': c.color }} aria-hidden="true" />{c.name}</span>)}</div>}
          </section>
          <section>
            <h2>Eventos de espaços</h2>
            <p className="rx-sub">Aparecem com contorno e o nome do espaço. Só o profissional pode mudar.</p>
          </section>
        </aside>
      </div>

      {form && (
        <div className="rx-overlay" onClick={fechar}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="ag-f-t" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); salvar(); }}>
            <h2 id="ag-f-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{form.id ? 'Editar evento' : 'Novo evento'}<button type="button" className="rx-link" aria-label="Fechar" onClick={fechar}><X size={16} /></button></h2>
            {form.repeat && form.repeat !== 'Nunca' && <p>Este evento se repete ({form.repeat}). A alteração vale para todas as datas.</p>}
            <div className="ag-form" style={{ marginTop: 12 }}>
              <div className="es-field full"><label htmlFor="ag-t">Título</label><input id="ag-t" className="es-input" required autoFocus placeholder="Ex.: Reunião de planejamento" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="ag-d">Começa</label><div className="ag-dt"><input id="ag-d" type="date" className="es-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })} /><input type="time" className="es-input" aria-label="Hora de início" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div></div>
              <div className="es-field"><label htmlFor="ag-e">Termina</label><div className="ag-dt"><input id="ag-e" type="date" className="es-input" min={form.date} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /><input type="time" className="es-input" aria-label="Hora de término" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div></div>
              <div className="es-field"><label htmlFor="ag-l">Local <span className="rx-sub">(opcional)</span></label><input id="ag-l" className="es-input" placeholder="Ex.: Sala 204" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="ag-r">Lembrete</label><select id="ag-r" className="es-input" value={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.value })}>{LEMBRETES.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
              <div className="es-field full"><label htmlFor="ag-x">Descrição <span className="rx-sub">(opcional)</span></label><input id="ag-x" className="es-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="es-field full"><span className="lbl">Categoria</span>
                {categorias.length === 0 && <p className="rx-sub" data-testid="cal-sem-categoria" style={{ margin: 0 }}>Você ainda não tem categorias. O evento fica sem categoria; crie uma em “Nova categoria” no menu.</p>}
                <div className="es-chips">
                  {categorias.map((c) => <button key={c.name} type="button" className="es-chip" aria-pressed={form.category === c.name && !form.customColor} onClick={() => setForm({ ...form, category: c.name, customColor: '' })}><span className="rx-dot" style={{ '--rx-dot': c.color }} aria-hidden="true" />{c.name}</button>)}
                  <label className="es-chip" aria-pressed={Boolean(form.customColor)} style={{ cursor: 'pointer' }}><span className="rx-dot" style={{ '--rx-dot': form.customColor || 'var(--rx-ink-3)' }} aria-hidden="true" />Outra cor<input type="color" className="ag-color" value={form.customColor || '#B3C3F3'} onChange={(e) => setForm({ ...form, customColor: e.target.value })} aria-label="Escolher outra cor" /></label>
                </div>
              </div>
              <div className="es-field full"><span className="lbl">Participantes <span className="rx-sub">(anotação sua; ninguém recebe convite)</span></span>
                {amigos.length === 0 ? <p className="rx-sub" style={{ margin: 0 }}>Nenhum amigo conectado ainda.</p> : (
                  <div className="es-chips">{amigos.map((f) => <button key={f.id} type="button" className="es-chip" aria-pressed={form.participants.includes(f.id)} onClick={() => setForm({ ...form, participants: form.participants.includes(f.id) ? form.participants.filter((x) => x !== f.id) : [...form.participants, f.id] })}>{f.name || f.username}</button>)}</div>
                )}
                <input className="es-input" aria-label="Outros participantes ou observação" placeholder="Outros participantes ou observação" value={form.participantsText} onChange={(e) => setForm({ ...form, participantsText: e.target.value })} style={{ marginTop: 8 }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="rx-btn ghost" onClick={fechar}>Cancelar</button>
              <button type="submit" className="rx-btn" disabled={!form.title.trim()}>Salvar evento</button>
            </div>
          </form>
        </div>
      )}

      {apagar && (
        <div className="rx-overlay" onClick={() => setApagar(null)}>
          <div className="rx-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ag-del-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="ag-del-t">Excluir {apagar.title}?</h2>
            <p>{apagar.repeat && apagar.repeat !== 'Nunca' ? `Este evento se repete (${apagar.repeat}). Todas as datas serão removidas.` : 'O evento sai da sua agenda.'}</p>
            <div className="opts" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setApagar(null)}>Cancelar</button>
              <button type="button" className="rx-btn" onClick={excluir}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
