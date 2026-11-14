// Camada de gamificação do Foco. Pura (sem React, sem rede): recebe o estado e devolve o próximo.
// Não altera as regras existentes do Pomodoro (registro de horas na subclasse e pontos do usuário),
// que continuam no FocusTab/App. Este estado fica só no navegador, por usuário.

export const LEVELS = [
  { name: 'Faísca', min: 0 },
  { name: 'Corrente', min: 3 },
  { name: 'Órbita', min: 8 },
  { name: 'Nebulosa', min: 15 },
  { name: 'Constelação', min: 30 }
];
export const FOCO = { session: 10, pause: 2, note: 2, mission: 3 };
export const CYCLE = 5;
export const LONG_AFTER = 4;
export const THEMES = [
  { id: 'aurora', name: 'Aurora', need: 0, stops: ['#A78BFA', '#60A5FA'] },
  { id: 'nebulosa', name: 'Nebulosa', need: 40, stops: ['#A78BFA', '#C4B5FD', '#60A5FA'] },
  { id: 'eclipse', name: 'Eclipse', need: 120, stops: ['#7764ba', '#60A5FA'] }
];
export const BADGES = [
  { id: 'first', name: 'Primeira sessão', how: 'Concluir uma sessão', glyph: 'spark' },
  { id: 'cycle', name: 'Ciclo completo', how: 'Fechar 5 sessões', glyph: 'cycle' },
  { id: 'constancy', name: 'Constância', how: '10 dias com a meta mínima', glyph: 'const' },
  { id: 'return', name: 'Retorno', how: 'Voltar depois de uma parada', glyph: 'return' },
  { id: 'journal', name: 'Diário de bordo', how: 'Registrar 3 avanços', glyph: 'journal' },
  { id: 'breaks', name: 'Pausa saudável', how: 'Fazer 3 pausas sugeridas', glyph: 'moon' }
];
export const MISSIONS = [
  { id: 'tres', text: 'Concluir três sessões' },
  { id: 'longe', text: 'Fazer uma pausa longe da tela' },
  { id: 'nota', text: 'Registrar o que avançou' },
  { id: 'retomar', text: 'Retomar uma tarefa pendente', manual: true }
];

const pad = (n) => String(n).padStart(2, '0');
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return localDate(new Date(y, m - 1, d + n)); };
const daysBetween = (a, b) => { const [y1, m1, d1] = a.split('-').map(Number); const [y2, m2, d2] = b.split('-').map(Number); return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000); };

export function emptyState() {
  return {
    v: 1, foco: 0, minGoal: 2, cycle: 0, blocks: 0, pauses: 0, notes: 0,
    badges: {}, metDates: [], days: {}, sessions: [], interrupted: false,
    missions: { date: '', done: [], hidden: [] }, missionsHidden: false,
    simple: false, reduce: false, theme: 'aurora'
  };
}

const keyFor = (userId) => `ethos_foco_v1_${userId || 'anon'}`;
export function loadState(userId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(keyFor(userId));
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
  } catch { /* armazenamento indisponível */ }
  return emptyState();
}
export function saveState(userId, state, storage = globalThis.localStorage) {
  try { storage?.setItem(keyFor(userId), JSON.stringify(state)); } catch { /* sem armazenamento */ }
}

export const levelIndex = (s) => LEVELS.reduce((acc, l, i) => (s.metDates.length >= l.min ? i : acc), 0);

// Sugestões renovam a cada dia; o que foi tirado volta no dia seguinte.
export function missionsFor(s, today) {
  return s.missions.date === today ? s.missions : { date: today, done: [], hidden: [] };
}

// Aplica ganhos e devolve eventos para avisar a pessoa.
function gain(s, n, why, events) {
  const before = THEMES.filter((t) => s.foco >= t.need).length;
  s.foco += n;
  events.push({ type: 'foco', n, why });
  const after = THEMES.filter((t) => s.foco >= t.need).length;
  if (after > before) events.push({ type: 'theme', name: THEMES[after - 1].name });
}
function unlock(s, id, events) {
  if (s.badges[id]) return;
  s.badges = { ...s.badges, [id]: true };
  events.push({ type: 'badge', id, name: BADGES.find((b) => b.id === id).name });
}
function completeMission(s, id, today, events) {
  const m = missionsFor(s, today);
  if (m.done.includes(id)) return;
  s.missions = { ...m, done: [...m.done, id] };
  if (!m.hidden.includes(id) && !s.missionsHidden) gain(s, FOCO.mission, MISSIONS.find((x) => x.id === id).text, events);
}
function checkMet(s, today, events) {
  const d = s.days[today];
  if (d && d.n >= s.minGoal && !s.metDates.includes(today)) {
    const before = levelIndex(s);
    s.metDates = [...s.metDates, today];
    events.push({ type: 'met' });
    if (s.metDates.length >= 10) unlock(s, 'constancy', events);
    const after = levelIndex(s);
    if (after > before) events.push({ type: 'level', name: LEVELS[after].name });
  }
}

const clone = (s) => ({ ...s, days: { ...s.days }, sessions: [...s.sessions], metDates: [...s.metDates], badges: { ...s.badges } });

/**
 * Registra uma sessão. full=false é parada antecipada: guarda o tempo, sem Foco e sem punição.
 * @returns {{ state, events, cycleClosed }}
 */
export function recordSession(prev, { subject, mins, goal = '', full = true, now = new Date() }) {
  const s = clone(prev); const events = []; const today = localDate(now);
  const lastDay = s.sessions.find((x) => x.full)?.date;
  const day = { n: 0, min: 0, ...(s.days[today] || {}) };
  day.min += mins;
  s.sessions.unshift({ id: `${now.getTime()}`, date: today, at: `${pad(now.getHours())}:${pad(now.getMinutes())}`, hour: now.getHours(), subject, mins, goal, note: '', full });
  s.sessions = s.sessions.slice(0, 300);
  let cycleClosed = false;
  if (full) {
    day.n += 1; s.days[today] = day;
    s.cycle += 1; s.blocks += 1;
    unlock(s, 'first', events);
    if (s.interrupted || (lastDay && daysBetween(lastDay, today) >= 3)) unlock(s, 'return', events);
    s.interrupted = false;
    gain(s, FOCO.session, 'sessão concluída', events);
    if (day.n >= 3) completeMission(s, 'tres', today, events);
    checkMet(s, today, events);
    if (s.cycle >= CYCLE) { s.cycle = 0; cycleClosed = true; unlock(s, 'cycle', events); events.push({ type: 'cycle' }); }
  } else {
    s.days[today] = day; s.interrupted = true;
  }
  return { state: s, events, cycleClosed };
}

export function addNote(prev, sessionId, note, now = new Date()) {
  const s = clone(prev); const events = [];
  const i = s.sessions.findIndex((x) => x.id === sessionId);
  if (i < 0 || s.sessions[i].note || !note.trim()) return { state: prev, events };
  s.sessions[i] = { ...s.sessions[i], note: note.trim() };
  s.notes += 1;
  gain(s, FOCO.note, 'avanço registrado', events);
  completeMission(s, 'nota', localDate(now), events);
  if (s.notes >= 3) unlock(s, 'journal', events);
  return { state: s, events };
}

export function recordPause(prev, { action, long }, now = new Date()) {
  const s = clone(prev); const events = [];
  if (long) s.blocks = 0;
  if (action) {
    s.pauses += 1;
    gain(s, FOCO.pause, 'pausa feita', events);
    if (action === 'longe') completeMission(s, 'longe', localDate(now), events);
    if (s.pauses >= 3) unlock(s, 'breaks', events);
  }
  return { state: s, events };
}

export function markMission(prev, id, now = new Date()) {
  const s = clone(prev); const events = [];
  completeMission(s, id, localDate(now), events);
  return { state: s, events };
}
export function hideMission(prev, id, now = new Date()) {
  const m = missionsFor(prev, localDate(now));
  return { ...prev, missions: { ...m, hidden: [...m.hidden, id] } };
}
export function setGoal(prev, n, now = new Date()) {
  const s = clone(prev); const events = [];
  s.minGoal = Math.max(1, Math.min(8, n));
  checkMet(s, localDate(now), events);
  return { state: s, events };
}
export function toggleRest(prev, iso, now = new Date()) {
  if (iso <= localDate(now)) return prev; // só dias futuros
  const d = { n: 0, min: 0, ...(prev.days[iso] || {}) };
  return { ...prev, days: { ...prev.days, [iso]: { ...d, rest: !d.rest } } };
}

// Semana de segunda a domingo
export function weekView(s, now = new Date()) {
  const today = localDate(now);
  const dow = (now.getDay() + 6) % 7;
  const monday = addDays(today, -dow);
  const names = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
  return names.map((name, i) => {
    const iso = addDays(monday, i); const d = s.days[iso] || { n: 0, min: 0 };
    let st;
    if (d.rest && iso > today) st = 'rest';
    else if (s.metDates.includes(iso)) st = 'met';
    else if (d.rest) st = 'rest';
    else if (iso === today) st = 'today';
    else if (iso > today) st = 'future';
    else st = 'below';
    return { iso, name, st, n: d.n || 0, min: d.min || 0, isToday: iso === today };
  });
}

// Relatório só com dados reais; padrões aparecem apenas quando há dados suficientes.
export function report(s, now = new Date()) {
  const week = weekView(s, now);
  const isos = new Set(week.map((d) => d.iso));
  const wk = s.sessions.filter((x) => isos.has(x.date));
  const subjects = {};
  wk.forEach((x) => { subjects[x.subject] = (subjects[x.subject] || 0) + x.mins; });
  const patterns = [];
  const withData = week.filter((d) => d.min > 0);
  if (withData.length >= 2) {
    const best = withData.reduce((a, b) => (b.min > a.min ? b : a));
    const full = { seg: 'segunda', ter: 'terça', qua: 'quarta', qui: 'quinta', sex: 'sexta', 'sáb': 'sábado', dom: 'domingo' };
    patterns.push(`Seu dia com mais foco nesta semana foi ${full[best.name]}.`);
  }
  const done = s.sessions.filter((x) => x.full).slice(0, 60);
  if (done.length >= 5) {
    const buckets = { manhã: 0, tarde: 0, noite: 0 };
    done.forEach((x) => { const h = x.hour ?? 12; buckets[h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite'] += 1; });
    const [top, n] = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
    patterns.push(`${Math.round((n / done.length) * 100)}% das suas últimas sessões foram de ${top}.`);
  }
  return {
    week,
    sessions: wk.filter((x) => x.full).length,
    minutes: wk.reduce((a, x) => a + x.mins, 0),
    metDays: week.filter((d) => d.st === 'met').length,
    subjects: Object.entries(subjects).sort((a, b) => b[1] - a[1]),
    patterns,
    today: s.sessions.filter((x) => x.date === localDate(now))
  };
}
