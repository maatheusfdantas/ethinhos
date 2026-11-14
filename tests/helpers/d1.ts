/// <reference types="node" />
/**
 * Simulador mínimo da API do Cloudflare D1 sobre `node:sqlite` (embutido no Node 22+),
 * para testar as Pages Functions sem wrangler/miniflare e sem dependências novas.
 *
 * Cobre o que o backend usa: prepare/bind/first/all/run, batch e exec.
 * Imita as conversões do D1: boolean -> 0/1 e erro em `undefined`.
 */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Param = string | number | bigint | null | Uint8Array;

function normalize(value: unknown): Param {
  if (value === undefined) throw new Error('D1_TYPE_ERROR: Type \'undefined\' not supported for value \'undefined\'');
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return value;
  if (value instanceof Uint8Array) return value;
  throw new Error(`D1_TYPE_ERROR: Type '${typeof value}' not supported`);
}

export class FakeD1Statement {
  constructor(
    private readonly db: DatabaseSync,
    readonly sql: string,
    private readonly params: Param[] = []
  ) {}

  bind(...values: unknown[]): FakeD1Statement {
    return new FakeD1Statement(this.db, this.sql, values.map(normalize));
  }

  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (column ? row[column] : { ...row }) as T;
  }

  async all<T = Record<string, unknown>>() {
    const rows = this.db.prepare(this.sql).all(...this.params) as T[];
    return { results: rows.map((r) => ({ ...r })), success: true, meta: {} };
  }

  async run() {
    const res = this.db.prepare(this.sql).run(...this.params);
    return {
      success: true,
      results: [],
      meta: { changes: Number(res.changes), last_row_id: Number(res.lastInsertRowid) }
    };
  }

  /** Execução síncrona usada pelo batch (transação). */
  runSync() {
    const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(this.sql);
    if (isSelect) {
      const rows = this.db.prepare(this.sql).all(...this.params);
      return { success: true, results: rows, meta: {} };
    }
    const res = this.db.prepare(this.sql).run(...this.params);
    return { success: true, results: [], meta: { changes: Number(res.changes), last_row_id: Number(res.lastInsertRowid) } };
  }
}

export class FakeD1Database {
  readonly raw: DatabaseSync;

  constructor() {
    this.raw = new DatabaseSync(':memory:');
  }

  prepare(sql: string): FakeD1Statement {
    return new FakeD1Statement(this.raw, sql);
  }

  async batch(statements: FakeD1Statement[]) {
    this.raw.exec('BEGIN');
    try {
      const out = statements.map((s) => s.runSync());
      this.raw.exec('COMMIT');
      return out;
    } catch (e) {
      this.raw.exec('ROLLBACK');
      throw e;
    }
  }

  async exec(sql: string) {
    this.raw.exec(sql);
    return { count: 1, duration: 0 };
  }
}

/** Aplica, em ordem, os arquivos `NNNN_*.sql` de `cloudflare/migrations`. */
export function applyMigrations(db: FakeD1Database, dir = join(process.cwd(), 'cloudflare', 'migrations')) {
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
  for (const f of files) db.raw.exec(readFileSync(join(dir, f), 'utf8'));
  return files;
}
