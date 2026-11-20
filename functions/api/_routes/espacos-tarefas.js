/**
 * Espaços, lote F (Organização Clínica): pendências administrativas internas.
 * Regras (docs/11, seção 4): só a Clínica ativa (modelo conferido no banco a cada pedido); Personal e Nutri recebem 403.
 * As tarefas são do espaço e nunca aparecem para os participantes. Sem dado clínico: só título, prazo e observação curta.
 * Arquivar não apaga (fica fora das listas). Tabela da migração 0014; sem ela, 503 com código.
 */
import { isMissingTable, requirePro } from '../_lib/espacos-acesso.js';
import { jsonResponse } from '../_lib/http.js';
import { validateDate, validateText } from '../../../src/domain/validation.js';

const newId = (p) => `${p}_${crypto.randomUUID()}`;

function taskOut(t) {
  return { id: t.id, title: t.title, note: t.note || '', dueOn: t.due_on || null, status: t.status, createdAt: t.created_at, doneAt: t.done_at || null };
}

export async function handleEspacosTarefasRoutes(ctx) {
  const { request, correlationId, pathname, method, url, storage, authClaims, rawBody } = ctx;
  if (pathname !== '/api/espacos/tarefas' && !pathname.startsWith('/api/espacos/tarefas/')) return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const me = authClaims.sub;
  const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const nowIso = new Date().toISOString();

  try {
    const gate = await requirePro(db, me, 'tarefas');
    if (gate.error) return reply({ error: gate.error }, gate.status);
    const pro = gate.pro;

    const fields = (src, current = {}) => {
      const out = {};
      if (src.title !== undefined || !current.id) {
        const t = validateText(src.title, { label: 'O título da tarefa', max: 140, required: true });
        if (t.error) return { error: t.error };
        out.title = t.value;
      }
      if (src.note !== undefined) {
        const n = validateText(src.note, { label: 'A observação', max: 500, multiline: true });
        if (n.error) return { error: n.error };
        out.note = n.value || null;
      }
      if (src.dueOn !== undefined) {
        if (src.dueOn === null || src.dueOn === '') out.due_on = null;
        else {
          const d = validateDate(src.dueOn, { label: 'O prazo' });
          if (d.error) return { error: d.error };
          out.due_on = d.value;
        }
      }
      return { value: out };
    };

    if (pathname === '/api/espacos/tarefas' && method === 'GET') {
      const done = url?.searchParams?.get('status') === 'concluidas';
      const rows = (await db.prepare(done
        ? "SELECT * FROM space_tasks WHERE space_id = ? AND status = 'concluida' ORDER BY done_at DESC LIMIT 50"
        : "SELECT * FROM space_tasks WHERE space_id = ? AND status = 'aberta' ORDER BY COALESCE(due_on, '9999-12-31'), created_at LIMIT 200"
      ).bind(pro.space_id).all()).results || [];
      return reply({ tarefas: rows.map(taskOut) });
    }

    if (pathname === '/api/espacos/tarefas' && method === 'POST') {
      const f = fields(body);
      if (f.error) return reply({ error: f.error }, 400);
      const open = await db.prepare("SELECT COUNT(*) AS n FROM space_tasks WHERE space_id = ? AND status = 'aberta'").bind(pro.space_id).first();
      if (Number(open?.n || 0) >= 200) return reply({ error: 'Limite de 200 tarefas abertas. Conclua ou arquive algumas.' }, 400);
      const id = newId('tsk');
      await db.prepare("INSERT INTO space_tasks (id, space_id, title, note, due_on, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'aberta', ?, ?, ?)")
        .bind(id, pro.space_id, f.value.title, f.value.note ?? null, f.value.due_on ?? null, me, nowIso, nowIso).run();
      return reply({ success: true, tarefa: taskOut({ id, title: f.value.title, note: f.value.note, due_on: f.value.due_on, status: 'aberta', created_at: nowIso }) }, 201);
    }

    const one = pathname.match(/^\/api\/espacos\/tarefas\/([^/]+)$/);
    if (one) {
      const t = await db.prepare("SELECT * FROM space_tasks WHERE id = ? AND space_id = ? AND status != 'arquivada'").bind(one[1], pro.space_id).first();
      if (!t) return reply({ error: 'Tarefa não encontrada.' }, 404);
      if (method === 'PUT') {
        const f = fields(body, t);
        if (f.error) return reply({ error: f.error }, 400);
        const next = { title: t.title, note: t.note, due_on: t.due_on, status: t.status, done_at: t.done_at, ...f.value };
        if (body.status !== undefined) {
          if (!['aberta', 'concluida'].includes(body.status)) return reply({ error: 'Situação inválida.' }, 400);
          next.status = body.status;
          next.done_at = body.status === 'concluida' ? (t.status === 'concluida' ? t.done_at : nowIso) : null;
        }
        await db.prepare('UPDATE space_tasks SET title = ?, note = ?, due_on = ?, status = ?, done_at = ?, updated_at = ? WHERE id = ?')
          .bind(next.title, next.note ?? null, next.due_on ?? null, next.status, next.done_at ?? null, nowIso, t.id).run();
        return reply({ success: true, tarefa: taskOut({ ...t, ...next }) });
      }
      if (method === 'DELETE') {
        await db.prepare("UPDATE space_tasks SET status = 'arquivada', updated_at = ? WHERE id = ?").bind(nowIso, t.id).run();
        return reply({ success: true });
      }
    }
    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'As pendências administrativas ainda não estão disponíveis neste ambiente.', code: 'tarefas_indisponivel' }, 503);
    throw e;
  }
}
