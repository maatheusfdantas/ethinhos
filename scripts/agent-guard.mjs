#!/usr/bin/env node
// Guard de regressões causadas por agentes. Regras em AGENTS.md. Não substitui revisão humana.
//
//   node scripts/agent-guard.mjs --staged            (hook de commit)
//   node scripts/agent-guard.mjs --range origin/main  (hook de push, manual)
//   node scripts/agent-guard.mjs --range origin/main --ci   (CI: sem arquivo de escopo local)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const RULE_FILES = ['AGENTS.md', 'GEMINI.md', 'CLAUDE.md', '.agent-protected.json', 'docs/07-referencia-visual.md', 'docs/08-processo-de-revisao.md', 'tests/guard/approved-design.json'];
const RULE_PREFIXES = ['scripts/agent-', '.githooks/', '.github/workflows/guard.yml'];
const FORBIDDEN = [/(^|\/)\.env(\.(?!example)[^/]*)?$/, /(^|\/)\.dev\.vars$/, /cf_token/i, /\.pem$/, /(^|\/)id_rsa/];
const SECRET_PATTERNS = [
  [/re_[A-Za-z0-9]{20,}/, 'chave do Resend'],
  [/GOCSPX-[A-Za-z0-9_-]{10,}/, 'segredo do Google'],
  [/sk-[A-Za-z0-9]{24,}/, 'chave de API'],
  [/AKIA[0-9A-Z]{16}/, 'chave AWS'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chave privada'],
  [/(?:SECRET|PASSWORD|PASSWD|TOKEN|API_?KEY)[A-Za-z_]*\s*[:=]\s*['"`][^'"`\s$]{12,}['"`]/i, 'segredo no código']
];
const NO_SECRET_SCAN = /^(tests\/|docs\/|AGENTS\.md$|.*\.test\.[jt]sx?$)/;

export function globToRegExp(glob) {
  const g = String(glob).replace(/\\/g, '/');
  let out = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') { out += '.*'; i++; if (g[i + 1] === '/') i++; } else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}
const matchesAny = (path, globs) => (globs || []).some((g) => globToRegExp(g).test(path) || path === g);
export const isProtected = (path, cfg) => (cfg?.files || []).includes(path) || (cfg?.dirs || []).some((d) => path.startsWith(d.endsWith('/') ? d : `${d}/`));
const isRulePath = (p) => RULE_FILES.includes(p) || RULE_PREFIXES.some((x) => p.startsWith(x));

export function scanSecrets(path, lines) {
  if (NO_SECRET_SCAN.test(path)) return [];
  const hits = [];
  for (const line of lines) for (const [re, label] of SECRET_PATTERNS) if (re.test(line)) hits.push(label);
  return [...new Set(hits)];
}

export function addedDependencies(base, head) {
  const keys = (j) => ({ ...(j?.dependencies || {}), ...(j?.devDependencies || {}) });
  const b = keys(base); const h = keys(head);
  return Object.keys(h).filter((k) => !(k in b));
}

/** Pura (testável): recebe os fatos do diff e devolve erros e avisos. */
export function evaluate({ changes, scope, cfg, behind = 0, isAgentBranch = false, ci = false, addedLines = {}, depsAdded = [] }) {
  const errors = []; const warnings = [];
  const strictScope = isAgentBranch && !ci;

  if (!scope) {
    (strictScope ? errors : warnings).push(
      'Sem escopo declarado (.agent-scope.json). Antes de editar: npm run scope:init -- "<tarefa>" <arquivos ou globs>, depois de o usuário aprovar o plano.'
    );
  }
  if (behind > 0) {
    (isAgentBranch ? errors : warnings).push(
      `Esta branch está ${behind} commit(s) ATRÁS de origin/main. Trabalhar assim traz de volta código e visual antigos. Atualize antes (git fetch && git merge origin/main) ou recomece com npm run agent:start.`
    );
  }
  const touched = (c) => [c.path, c.oldPath].filter(Boolean);

  for (const c of changes) {
    for (const p of touched(c)) {
      if (FORBIDDEN.some((re) => re.test(p)) && c.status !== 'D') errors.push(`Arquivo proibido no commit: ${p} (segredos ou chaves não entram no repositório).`);
    }
    if (scope && scope.allowed?.length && !ci) {
      for (const p of touched(c)) if (!matchesAny(p, scope.allowed)) errors.push(`Fora do escopo: ${p}. Pare e peça aprovação ao usuário; só então: npm run scope:add -- "${p}" --aprovado-por "<onde ele aprovou>".`);
    }
    if (c.status === 'D' || c.status === 'R') {
      const gone = c.status === 'D' ? c.path : c.oldPath;
      if (isProtected(gone, cfg) && !matchesAny(gone, scope?.allowDelete)) {
        errors.push(`Remoção/renomeação de arquivo protegido: ${gone}. Não apague: mova para _to_delete/ só com aprovação (npm run scope:allow-delete -- "${gone}" --aprovado-por "...").`);
      }
    }
    if (c.status === 'M' && c.oldLines > 0) {
      const ratio = c.deleted / c.oldLines;
      const allowed = matchesAny(c.path, scope?.allowLargeRemoval);
      if (!allowed && c.deleted >= 150 && ratio > 0.5) errors.push(`Remoção muito grande em ${c.path}: ${c.deleted} de ${c.oldLines} linhas (${Math.round(ratio * 100)}%). Isso costuma ser simplificação ou troca por versão genérica. Justifique ao usuário e registre com scope:allow-large-removal.`);
      else if (!allowed && c.deleted >= 60 && ratio > 0.4) warnings.push(`Muitas linhas removidas em ${c.path} (${c.deleted} de ${c.oldLines}). Confirme que nada existente foi perdido.`);
    }
    if (isAgentBranch && touched(c).some(isRulePath) && !scope?.allowRules) {
      errors.push(`Agentes não alteram as próprias regras, hooks ou o guard: ${touched(c).find(isRulePath)}. Peça ao usuário.`);
    }
  }
  for (const [path, lines] of Object.entries(addedLines)) {
    for (const label of scanSecrets(path, lines)) errors.push(`Possível ${label} adicionado em ${path}. Remova e use variáveis de ambiente.`);
  }
  if (depsAdded.length && !scope?.allowDependencies) errors.push(`Dependência(s) nova(s) sem aprovação: ${depsAdded.join(', ')}.`);
  return { errors, warnings };
}

/* ---------------- git ---------------- */
const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const tryGit = (args) => { try { return git(args); } catch { return null; } };

function collect(mode, base) {
  const diffArgs = mode === 'staged' ? ['diff', '--cached'] : ['diff', `${base}...HEAD`];
  const oldRef = mode === 'staged' ? 'HEAD' : base;
  const raw = git([...diffArgs, '--name-status', '-M']).split('\n').filter(Boolean);
  const changes = []; const addedLines = {};
  for (const line of raw) {
    const parts = line.split('\t'); const st = parts[0][0];
    const c = st === 'R' ? { status: 'R', oldPath: parts[1], path: parts[2] } : { status: st === 'D' ? 'D' : st === 'A' ? 'A' : 'M', path: parts[1] };
    const stat = (git([...diffArgs, '--numstat', '-M', '--', c.path]).split('\t')) || [];
    c.added = Number(stat[0]) || 0; c.deleted = Number(stat[1]) || 0;
    const old = tryGit(['show', `${oldRef}:${c.oldPath || c.path}`]);
    c.oldLines = old ? old.split('\n').length : 0;
    if (c.status !== 'D') {
      addedLines[c.path] = git([...diffArgs, '-U0', '--', c.path]).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
    }
    changes.push(c);
  }
  let depsAdded = [];
  if (changes.some((c) => c.path === 'package.json')) {
    try {
      const before = JSON.parse(tryGit(['show', `${oldRef}:package.json`]) || '{}');
      const after = JSON.parse(mode === 'staged' ? git(['show', ':package.json']) : git(['show', 'HEAD:package.json']));
      depsAdded = addedDependencies(before, after);
    } catch { /* package.json ilegível: o lint/build acusa */ }
  }
  return { changes, addedLines, depsAdded };
}

function main(argv) {
  const staged = argv.includes('--staged'); const ci = argv.includes('--ci');
  const ri = argv.indexOf('--range'); const base = ri > -1 ? argv[ri + 1] : 'origin/main';
  const mode = staged ? 'staged' : 'range';
  const root = git(['rev-parse', '--show-toplevel']).trim(); process.chdir(root);
  const branch = process.env.GITHUB_HEAD_REF || git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const isAgentBranch = branch.startsWith('agent/');
  const cfg = existsSync('.agent-protected.json') ? JSON.parse(readFileSync('.agent-protected.json', 'utf8')) : {};
  const scope = existsSync('.agent-scope.json') ? JSON.parse(readFileSync('.agent-scope.json', 'utf8')) : null;
  const behind = Number((tryGit(['rev-list', '--count', `HEAD..${base}`]) || '0').trim()) || 0;
  const facts = collect(mode, base);
  const { errors, warnings } = evaluate({ ...facts, scope, cfg, behind, isAgentBranch, ci });
  warnings.forEach((w) => console.warn(`  aviso: ${w}`));
  if (errors.length) {
    console.error(`\nGuard do Ethos: ${errors.length} problema(s) impedem a continuidade (${branch}):`);
    errors.forEach((e) => console.error(`  ✖ ${e}`));
    console.error('\nNão contorne com --no-verify nem editando o guard. Explique ao usuário e peça aprovação.');
    process.exit(1);
  }
  console.log(`Guard do Ethos: ok (${facts.changes.length} arquivo(s), ${warnings.length} aviso(s)).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
