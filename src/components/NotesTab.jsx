import React, { useMemo, useState } from 'react';
import { Pin, PinOff, Pencil, Trash2, Plus, StickyNote } from 'lucide-react';
import { NOTE_MAX, POSTIT_COLORS, loadNotes, persistNotes, sortNotes } from '../utils/postits';

/** Notas rápidas. Antes eram os "post-its" do Perfil; os mesmos dados, agora numa aba própria. */
export function NotesTab({ user, setUser, showToast }) {
  const [notes, setNotes] = useState(() => loadNotes(user));
  const [editing, setEditing] = useState(null); // null | 'new' | note
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [colorId, setColorId] = useState('yellow');
  const [pinned, setPinned] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [query, setQuery] = useState('');

  const save = (next) => { setNotes(next); persistNotes(user, setUser, next); };
  const open = (note) => {
    setEditing(note || 'new');
    setTitle(note?.title || ''); setContent(note?.content || ''); setColorId(note?.colorId || 'yellow'); setPinned(Boolean(note?.pinned));
  };
  const submit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const base = { title: title.trim() || 'Nota rápida', content: content.trim().slice(0, NOTE_MAX), colorId, pinned };
    if (editing && editing !== 'new') {
      save(notes.map((n) => (n.id === editing.id ? { ...n, ...base } : n)));
      showToast?.('Nota atualizada.');
    } else {
      save([{ id: `pi_${Date.now()}`, ...base, createdAt: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }, ...notes]);
      showToast?.('Nota criada.');
    }
    setEditing(null);
  };
  const remove = () => { save(notes.filter((n) => n.id !== removing.id)); setRemoving(null); showToast?.('Nota excluída.'); };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortNotes(notes).filter((n) => !q || `${n.title} ${n.content}`.toLowerCase().includes(q));
  }, [notes, query]);

  return (
    <div className="nt">
      <div className="nt-head">
        <div>
          <h2>Notas</h2>
          <p>Lembretes rápidos e ideias soltas. Fixe as mais importantes no topo.</p>
        </div>
        <button type="button" className="nt-btn" onClick={() => open(null)}><Plus size={18} aria-hidden="true" /> Nova nota</button>
      </div>

      {notes.length > 3 && (
        <input className="nt-search" type="search" placeholder="Buscar nas notas" aria-label="Buscar nas notas" value={query} onChange={(e) => setQuery(e.target.value)} />
      )}

      {notes.length === 0 ? (
        <div className="nt-empty">
          <StickyNote size={28} aria-hidden="true" />
          <p>Você ainda não tem notas.</p>
          <button type="button" className="nt-btn" onClick={() => open(null)}>Criar primeira nota</button>
        </div>
      ) : visible.length === 0 ? (
        <p className="nt-muted">Nenhuma nota encontrada para “{query}”.</p>
      ) : (
        <ul className="nt-grid">
          {visible.map((n) => {
            const c = POSTIT_COLORS.find((x) => x.id === n.colorId) || POSTIT_COLORS[0];
            return (
              <li key={n.id} className="nt-note" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
                <div className="nt-note-head">
                  <b>{n.title}</b>
                  {n.pinned && <Pin size={15} aria-label="Fixada" style={{ color: c.pin }} />}
                </div>
                <p>{n.content}</p>
                <div className="nt-note-foot">
                  <span>{n.createdAt}</span>
                  <span className="nt-actions">
                    <button type="button" aria-label={`${n.pinned ? 'Desafixar' : 'Fixar'} ${n.title}`} onClick={() => save(notes.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x)))}>{n.pinned ? <PinOff size={16} /> : <Pin size={16} />}</button>
                    <button type="button" aria-label={`Editar ${n.title}`} onClick={() => open(n)}><Pencil size={16} /></button>
                    <button type="button" aria-label={`Excluir ${n.title}`} onClick={() => setRemoving(n)}><Trash2 size={16} /></button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <div className="rx-overlay" onClick={() => setEditing(null)}>
          <form className="rx-dialog nt-form" role="dialog" aria-modal="true" aria-labelledby="ntForm" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2 id="ntForm">{editing === 'new' ? 'Nova nota' : 'Editar nota'}</h2>
            <label htmlFor="ntTitle">Título <span className="nt-opt">(opcional)</span></label>
            <input id="ntTitle" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nota rápida" />
            <label htmlFor="ntText">Nota</label>
            <textarea id="ntText" rows={4} autoFocus required maxLength={NOTE_MAX} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escreva aqui" />
            <span className="nt-count">{content.length}/{NOTE_MAX}</span>
            <div className="nt-colors" role="radiogroup" aria-label="Cor da nota">
              {POSTIT_COLORS.map((c) => (
                <button type="button" key={c.id} role="radio" aria-checked={colorId === c.id} aria-label={c.name} onClick={() => setColorId(c.id)} style={{ background: c.bg, borderColor: colorId === c.id ? c.pin : c.border }} />
              ))}
            </div>
            <label className="nt-check"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Fixar no topo</label>
            <div className="nt-form-btns">
              <button type="submit" className="nt-btn" disabled={!content.trim()}>Salvar</button>
              <button type="button" className="nt-btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {removing && (
        <div className="rx-overlay" onClick={() => setRemoving(null)}>
          <div className="rx-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ntDel" onClick={(e) => e.stopPropagation()}>
            <h2 id="ntDel">Excluir esta nota?</h2>
            <p>“{removing.title}” será removida. Essa ação não pode ser desfeita.</p>
            <div className="nt-form-btns">
              <button type="button" className="nt-btn danger" onClick={remove}>Excluir nota</button>
              <button type="button" className="nt-btn ghost" autoFocus onClick={() => setRemoving(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
