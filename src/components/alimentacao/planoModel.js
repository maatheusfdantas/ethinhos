/**
 * Plano alimentar: estrutura e regras puras (sem React), usadas pelo servidor e pelas telas.
 *
 * Conteúdo de uma versão:
 *   { layout, notes, days: [{ key, meals: [{ key, time, name, options: [{ key, name, items: [{ qty, unit, food }], subs: [texto] }] }] }] }
 * - layout decide quais dias da semana cada grupo cobre (todos os dias; dias úteis e fim de semana; dias úteis, sábado e domingo).
 * - Fórmulas (docs/10, 7.4):
 *   registro do dia = refeições previstas COM registro ÷ previstas no dia da versão que vale; refeição extra fora do denominador;
 *   relação com o plano = só contagens por situação. Sem nota, sem desconto, sem estimativa.
 */
import { validateText, validateTime } from '../../domain/validation.js';

export const LAYOUTS = {
  todos: [{ key: 'todos', label: 'Todos os dias', weekdays: [0, 1, 2, 3, 4, 5, 6] }],
  uteis_fds: [
    { key: 'uteis', label: 'Dias úteis', weekdays: [1, 2, 3, 4, 5] },
    { key: 'fds', label: 'Fim de semana', weekdays: [0, 6] }
  ],
  uteis_sab_dom: [
    { key: 'uteis', label: 'Dias úteis', weekdays: [1, 2, 3, 4, 5] },
    { key: 'sab', label: 'Sábado', weekdays: [6] },
    { key: 'dom', label: 'Domingo', weekdays: [0] }
  ]
};
export const LAYOUT_LABEL = { todos: 'Igual todos os dias', uteis_fds: 'Dias úteis e fim de semana', uteis_sab_dom: 'Dias úteis, sábado e domingo' };

export const LOG_STATUS = {
  conforme: { label: 'Conforme', hint: 'Comi como está no plano', inPlan: true },
  alternativa: { label: 'Alternativa autorizada', hint: 'Usei uma substituição prevista pela nutricionista', inPlan: true },
  parcial: { label: 'Parcial', hint: 'Comi só parte', inPlan: false },
  diferente: { label: 'Diferente do planejado', hint: 'Comi outra coisa', inPlan: false },
  nao_realizada: { label: 'Não realizada', hint: 'Pulei esta refeição', inPlan: false }
};
export const STATUS_KEYS = Object.keys(LOG_STATUS);

export const LIMITS = { meals: 10, options: 4, items: 20, subs: 6 };
const KEY_RE = /^[A-Za-z0-9_-]{1,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dia da semana (0 = domingo) de uma data AAAA-MM-DD, sem depender do fuso. */
export function weekdayOf(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(dateStr, n) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Data local AAAA-MM-DD (no navegador, é o "hoje" da pessoa). */
export function localISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Segunda-feira da semana de uma data. */
export function mondayOf(dateStr) {
  return addDays(dateStr, -((weekdayOf(dateStr) + 6) % 7));
}

export function isDateStr(s) {
  return DATE_RE.test(String(s || ''));
}

/** Grupo de dias (e as refeições dele) que vale numa data. */
export function groupFor(content, dateStr) {
  const layout = LAYOUTS[content?.layout] ? content.layout : 'todos';
  const wd = weekdayOf(dateStr);
  const def = LAYOUTS[layout].find((g) => g.weekdays.includes(wd));
  if (!def) return null;
  const day = (content?.days || []).find((d) => d.key === def.key);
  return { key: def.key, label: def.label, meals: day?.meals || [] };
}

/** Versão que vale numa data: o maior início até a data (empate: a versão mais nova). */
export function versionFor(versions, dateStr) {
  let best = null;
  for (const v of versions || []) {
    if (v.startsOn > dateStr) continue;
    if (!best || v.startsOn > best.startsOn || (v.startsOn === best.startsOn && v.version > best.version)) best = v;
  }
  return best;
}

/** Os dois números de um dia: registro (com registro ÷ previstas) e as contagens por situação. */
export function dayNumbers(meals, logsByKey) {
  const counts = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  let registradas = 0;
  for (const m of meals || []) {
    const l = logsByKey?.[m.key];
    if (!l || l.status === 'extra') continue;
    registradas += 1;
    if (counts[l.status] !== undefined) counts[l.status] += 1;
  }
  return { previstas: (meals || []).length, registradas, counts };
}

export function sumCounts(list) {
  const total = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  for (const c of list) for (const k of STATUS_KEYS) total[k] += Number(c?.[k] || 0);
  return total;
}

/** Texto de um item: "120 g de frango grelhado", "1 unidade de ovo", "salada à vontade". */
export function itemText(it) {
  const qty = String(it?.qty || '').trim();
  const unit = String(it?.unit || '').trim();
  const food = String(it?.food || '').trim();
  if (!qty && !unit) return food;
  if (!qty) return `${food} ${unit}`.trim();
  if (!unit) return `${qty} ${food}`.trim();
  return `${qty} ${unit} de ${food}`;
}

/** Substituições autorizadas de uma refeição (de todas as opções). */
export function subsOf(meal) {
  return (meal?.options || []).flatMap((o) => o.subs || []);
}

// ------------------------------------------------------------------
// Edição (navegador)
// ------------------------------------------------------------------
export function newKey(prefix) {
  const rnd = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

export function blankOption(name = 'Opção única') {
  return { key: newKey('o'), name, items: [{ qty: '', unit: '', food: '' }], subs: [] };
}

export function blankMeal(time = '12:00', name = 'Refeição') {
  return { key: newKey('m'), time, name, options: [blankOption()] };
}

/** Esqueleto com as cinco refeições comuns, sem alimentos (a nutricionista preenche). */
export function starterContent() {
  return {
    layout: 'todos',
    notes: '',
    days: [{
      key: 'todos',
      meals: [['07:30', 'Café da manhã'], ['10:00', 'Lanche da manhã'], ['12:30', 'Almoço'], ['16:00', 'Lanche da tarde'], ['20:00', 'Jantar']].map(([t, n]) => blankMeal(t, n))
    }]
  };
}

/** Troca a divisão dos dias. Grupos novos começam como cópia do primeiro grupo atual (com chaves novas de opção). */
export function changeLayout(content, layout) {
  if (!LAYOUTS[layout]) return content;
  const base = (content?.days || [])[0]?.meals || [];
  const days = LAYOUTS[layout].map((g) => {
    const same = (content?.days || []).find((d) => d.key === g.key);
    return { key: g.key, meals: same ? same.meals : JSON.parse(JSON.stringify(base)) };
  });
  return { ...content, layout, days };
}

// ------------------------------------------------------------------
// Validação (servidor). Rascunho aceita campos vazios; publicar exige o plano completo.
// ------------------------------------------------------------------
export function cleanMealPlanContent(content, { draft = false } = {}) {
  const layout = LAYOUTS[content?.layout] ? content.layout : 'todos';
  const notes = validateText(content?.notes, { label: 'As orientações gerais', max: 1000, multiline: true });
  if (notes.error) return { error: notes.error };
  const days = [];
  for (const g of LAYOUTS[layout]) {
    const src = (Array.isArray(content?.days) ? content.days : []).find((d) => d?.key === g.key);
    const list = Array.isArray(src?.meals) ? src.meals : [];
    if (!draft && list.length === 0) return { error: `Inclua pelo menos uma refeição em ${g.label}.` };
    if (list.length > LIMITS.meals) return { error: `${g.label}: no máximo ${LIMITS.meals} refeições.` };
    const meals = [];
    const keys = new Set();
    for (const [i, m] of list.entries()) {
      const where = `${g.label}, refeição ${i + 1}`;
      const name = validateText(m?.name, { label: `O nome da refeição (${where})`, max: 60, required: !draft });
      if (name.error) return { error: name.error };
      let time = { value: '' };
      if (m?.time || !draft) {
        time = validateTime(m?.time, { label: `O horário de ${name.value || where}` });
        if (time.error) return { error: time.error };
      }
      const optsIn = Array.isArray(m?.options) ? m.options : [];
      if (!draft && optsIn.length === 0) return { error: `${name.value}: inclua pelo menos uma opção.` };
      if (optsIn.length > LIMITS.options) return { error: `${name.value || where}: no máximo ${LIMITS.options} opções.` };
      const options = [];
      const okeys = new Set();
      for (const [j, o] of optsIn.entries()) {
        const oname = validateText(o?.name, { label: 'O nome da opção', max: 60 });
        if (oname.error) return { error: oname.error };
        const itemsIn = Array.isArray(o?.items) ? o.items : [];
        if (itemsIn.length > LIMITS.items) return { error: `${name.value || where}: no máximo ${LIMITS.items} itens por opção.` };
        const items = [];
        for (const it of itemsIn) {
          const food = validateText(it?.food, { label: 'O alimento', max: 80 });
          if (food.error) return { error: food.error };
          const qty = validateText(it?.qty, { label: 'A quantidade', max: 12 });
          if (qty.error) return { error: qty.error };
          const unit = validateText(it?.unit, { label: 'A unidade', max: 30 });
          if (unit.error) return { error: unit.error };
          // Linha vazia: o rascunho guarda (é o espaço para preencher); a publicação descarta.
          if (!food.value && !qty.value && !unit.value) { if (draft) items.push({ qty: '', unit: '', food: '' }); continue; }
          if (!food.value && !draft) return { error: `${name.value}: falta o alimento de um item.` };
          items.push({ qty: qty.value || '', unit: unit.value || '', food: food.value || '' });
        }
        if (!draft && items.length === 0) return { error: `${name.value}: a ${oname.value || `opção ${j + 1}`} não tem nenhum alimento.` };
        const subsIn = Array.isArray(o?.subs) ? o.subs : [];
        if (subsIn.length > LIMITS.subs) return { error: `${name.value || where}: no máximo ${LIMITS.subs} substituições por opção.` };
        const subs = [];
        for (const s of subsIn) {
          const t = validateText(s, { label: 'A substituição', max: 140 });
          if (t.error) return { error: t.error };
          if (t.value && !subs.includes(t.value)) subs.push(t.value);
        }
        let okey = KEY_RE.test(String(o?.key || '')) ? String(o.key) : `o_${j}_${crypto.randomUUID().slice(0, 6)}`;
        if (okeys.has(okey)) okey = `o_${j}_${crypto.randomUUID().slice(0, 6)}`;
        okeys.add(okey);
        options.push({ key: okey, name: oname.value || (optsIn.length > 1 ? `Opção ${j + 1}` : 'Opção única'), items, subs });
      }
      let key = KEY_RE.test(String(m?.key || '')) ? String(m.key) : `m_${i}_${crypto.randomUUID().slice(0, 6)}`;
      if (keys.has(key)) key = `m_${i}_${crypto.randomUUID().slice(0, 6)}`;
      keys.add(key);
      meals.push({ key, time: time.value || '', name: name.value || '', options });
    }
    meals.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    days.push({ key: g.key, meals });
  }
  return { value: { layout, notes: notes.value || '', days } };
}

/** Resumo curto para listas: "5 refeições, 2 opções no almoço". */
export function contentSummary(content) {
  const days = content?.days || [];
  const meals = days[0]?.meals || [];
  if (!meals.length) return 'Sem refeições ainda';
  const multi = meals.filter((m) => (m.options || []).length > 1);
  const base = `${meals.length} ${meals.length === 1 ? 'refeição' : 'refeições'}`;
  const layout = LAYOUTS[content?.layout] && content.layout !== 'todos' ? `, ${LAYOUT_LABEL[content.layout].toLowerCase()}` : '';
  return multi.length ? `${base}${layout}, opções em ${multi.map((m) => m.name.toLowerCase()).join(', ')}` : `${base}${layout}`;
}
