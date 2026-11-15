// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addedDependencies, evaluate, globToRegExp, isProtected, scanSecrets } from '../../scripts/agent-guard.mjs';

const cfg = { dirs: ['src/components', 'functions/api'], files: ['src/App.jsx'] };
const mod = (path: string, extra = {}) => ({ status: 'M', path, added: 3, deleted: 1, oldLines: 100, ...extra });
const run = (o: Record<string, unknown>) => evaluate({ changes: [], scope: null, cfg, ...o } as never);
const scope = (extra = {}) => ({ allowed: ['src/components/NotesTab.jsx'], allowDelete: [], allowLargeRemoval: [], allowDependencies: false, ...extra });

describe('regras do guard', () => {
  it('glob: ** atravessa pastas, * não', () => {
    expect(globToRegExp('src/**').test('src/components/a/b.jsx')).toBe(true);
    expect(globToRegExp('src/*.jsx').test('src/App.jsx')).toBe(true);
    expect(globToRegExp('src/*.jsx').test('src/components/x.jsx')).toBe(false);
  });

  it('em branch de agente, sem escopo declarado é erro; em outra branch é só aviso', () => {
    expect(run({ isAgentBranch: true }).errors.join()).toMatch(/Sem escopo/);
    const human = run({ isAgentBranch: false });
    expect(human.errors).toEqual([]); expect(human.warnings.join()).toMatch(/Sem escopo/);
  });

  it('arquivo fora do escopo bloqueia e diz o que fazer', () => {
    const r = run({ changes: [mod('src/components/NotesTab.jsx'), mod('src/components/HabitsTab.jsx')], scope: scope() });
    expect(r.errors).toHaveLength(1); expect(r.errors[0]).toMatch(/Fora do escopo: src\/components\/HabitsTab\.jsx/);
  });

  it('apagar ou renomear arquivo protegido bloqueia; com aprovação registrada passa', () => {
    const del = { status: 'D', path: 'src/components/HabitsTab.jsx', added: 0, deleted: 900, oldLines: 900 };
    expect(run({ changes: [del], scope: scope({ allowed: ['**'] }) }).errors.join()).toMatch(/arquivo protegido/);
    const ren = { status: 'R', oldPath: 'src/components/HabitsTab.jsx', path: 'src/components/Habits2.jsx', added: 0, deleted: 0, oldLines: 900 };
    expect(run({ changes: [ren], scope: scope({ allowed: ['**'] }) }).errors.join()).toMatch(/arquivo protegido/);
    expect(run({ changes: [del], scope: scope({ allowed: ['**'], allowDelete: ['src/components/HabitsTab.jsx'] }) }).errors).toEqual([]);
    expect(isProtected('src/App.jsx', cfg)).toBe(true); expect(isProtected('README.md', cfg)).toBe(false);
  });

  it('remoção enorme (arquivo "simplificado") bloqueia; pequena só avisa', () => {
    const big = mod('src/components/HabitsTab.jsx', { deleted: 700, added: 60, oldLines: 1000 });
    expect(run({ changes: [big], scope: scope({ allowed: ['**'] }) }).errors.join()).toMatch(/Remoção muito grande/);
    const mid = mod('src/components/HabitsTab.jsx', { deleted: 80, oldLines: 150 });
    const r = run({ changes: [mid], scope: scope({ allowed: ['**'] }) });
    expect(r.errors).toEqual([]); expect(r.warnings.join()).toMatch(/Muitas linhas removidas/);
  });

  it('branch atrasada: erro para agente, aviso para os demais', () => {
    expect(run({ behind: 8, isAgentBranch: true, scope: scope() }).errors.join()).toMatch(/8 commit\(s\) ATRÁS/);
    expect(run({ behind: 8, isAgentBranch: false }).errors).toEqual([]);
  });

  it('agente não edita as próprias regras, hooks ou o guard', () => {
    const r = run({ isAgentBranch: true, scope: scope({ allowed: ['**'] }), changes: [mod('AGENTS.md'), mod('scripts/agent-guard.mjs'), mod('.githooks/pre-commit')] });
    expect(r.errors.filter((e) => /próprias regras/.test(e))).toHaveLength(3);
  });

  it('segredos no código bloqueiam; em testes e docs não', () => {
    const fake = ['const x = "', 're_', 'a'.repeat(24), '"'].join('');
    expect(scanSecrets('src/a.js', [fake])).toContain('chave do Resend');
    expect(scanSecrets('src/a.js', ["const SECRET_KEY = 'abcdefghijklmnop1234'"])).toContain('segredo no código');
    expect(scanSecrets('src/a.js', ['const token = process.env.TOKEN'])).toEqual([]);
    expect(scanSecrets('tests/x.test.ts', [fake])).toEqual([]);
    expect(run({ changes: [mod('.env')], scope: scope({ allowed: ['**'] }) }).errors.join()).toMatch(/proibido/);
  });

  it('dependência nova exige aprovação', () => {
    const added = addedDependencies({ dependencies: { a: '1' } }, { dependencies: { a: '1', b: '2' }, devDependencies: { c: '3' } });
    expect(added).toEqual(['b', 'c']);
    expect(run({ depsAdded: added, scope: scope() }).errors.join()).toMatch(/Dependência/);
    expect(run({ depsAdded: added, scope: scope({ allowDependencies: true }) }).errors).toEqual([]);
  });

  it('no CI não exige o arquivo de escopo local', () => {
    const r = run({ isAgentBranch: true, ci: true, changes: [mod('src/components/HabitsTab.jsx')] });
    expect(r.errors).toEqual([]);
  });
});

describe('guard de ponta a ponta num repositório de teste', () => {
  const guard = resolve('scripts/agent-guard.mjs');
  const sh = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  it('agente que apaga um componente e esvazia outro é barrado no commit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ethos-guard-'));
    try {
      sh(dir, 'init', '-q', '-b', 'main'); sh(dir, 'config', 'user.email', 't@t'); sh(dir, 'config', 'user.name', 't');
      mkdirSync(join(dir, 'src/components'), { recursive: true });
      writeFileSync(join(dir, '.agent-protected.json'), JSON.stringify(cfg));
      writeFileSync(join(dir, 'src/components/A.jsx'), Array.from({ length: 400 }, (_, i) => `// linha ${i}`).join('\n'));
      writeFileSync(join(dir, 'src/components/B.jsx'), 'export const B = 1;\n');
      sh(dir, 'add', '-A'); sh(dir, 'commit', '-q', '-m', 'base');
      sh(dir, 'checkout', '-q', '-b', 'agent/teste-20261114');
      writeFileSync(join(dir, '.agent-scope.json'), JSON.stringify({ allowed: ['src/**'], allowDelete: [], allowLargeRemoval: [], approvals: [] }));
      rmSync(join(dir, 'src/components/B.jsx'));
      writeFileSync(join(dir, 'src/components/A.jsx'), '// versão genérica\n');
      sh(dir, 'add', '-A');
      let out = ''; let code = 0;
      try { execFileSync('node', [guard, '--staged'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e: any) { code = e.status; out = String(e.stderr); }
      expect(code).toBe(1);
      expect(out).toMatch(/arquivo protegido: src\/components\/B\.jsx/);
      expect(out).toMatch(/Remoção muito grande em src\/components\/A\.jsx/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
