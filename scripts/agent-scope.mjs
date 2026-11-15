#!/usr/bin/env node
// Declara e ajusta o escopo da tarefa (lido pelo guard). O arquivo .agent-scope.json é local (git-ignored).
//   npm run scope:init -- "<tarefa>" <glob...> [--criterio "<critério de aceite>"]...
//   npm run scope:add -- <glob> --aprovado-por "<onde o usuário aprovou>"
//   npm run scope:allow-delete -- <arquivo> --aprovado-por "..."
//   npm run scope:allow-large-removal -- <arquivo> --aprovado-por "..."
//   npm run scope:show
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = '.agent-scope.json';
const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => { const i = rest.indexOf(`--${name}`); return i > -1 ? rest[i + 1] : undefined; };
const multi = (name) => rest.flatMap((v, i) => (v === `--${name}` ? [rest[i + 1]] : []));
const positional = () => { const out = []; for (let i = 0; i < rest.length; i++) { if (rest[i].startsWith('--')) { i++; continue; } out.push(rest[i]); } return out; };
const load = () => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : null);
const save = (s) => writeFileSync(FILE, JSON.stringify(s, null, 2) + '\n');
const need = (cond, msg) => { if (!cond) { console.error(msg); process.exit(2); } };
const approval = () => {
  const a = flag('aprovado-por');
  need(a && a.length >= 8, 'Informe --aprovado-por "<onde e quando o usuário aprovou>". Sem aprovação do usuário, não amplie o escopo.');
  return a;
};

if (cmd === 'init') {
  const [task, ...globs] = positional();
  need(task && globs.length, 'Uso: scope:init -- "<tarefa>" <arquivo|glob>... [--criterio "..."]');
  need(!load() || rest.includes('--force'), 'Já existe escopo. Use scope:show, ou --force para recomeçar (somente se o usuário pediu).');
  save({ task, createdAt: new Date().toISOString(), allowed: globs, acceptance: multi('criterio'), allowDelete: [], allowLargeRemoval: [], allowDependencies: false, allowRules: false, approvals: [] });
  console.log(`Escopo registrado: ${globs.length} padrão(ões).`);
} else if (['add', 'allow-delete', 'allow-large-removal'].includes(cmd)) {
  const s = load(); need(s, 'Sem escopo. Rode scope:init primeiro.');
  const [target] = positional(); need(target, 'Informe o arquivo ou glob.');
  const by = approval();
  const key = { add: 'allowed', 'allow-delete': 'allowDelete', 'allow-large-removal': 'allowLargeRemoval' }[cmd];
  s[key] = [...new Set([...(s[key] || []), target])];
  s.approvals.push({ at: new Date().toISOString(), action: cmd, target, by });
  save(s);
  console.log(`Registrado (${cmd}): ${target}`);
} else if (cmd === 'show') {
  const s = load(); console.log(s ? JSON.stringify(s, null, 2) : 'Sem escopo declarado.');
} else {
  console.error('Comandos: init | add | allow-delete | allow-large-removal | show'); process.exit(2);
}
