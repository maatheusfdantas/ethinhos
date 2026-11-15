#!/usr/bin/env node
// Cria um worktree NOVO a partir de origin/main (atualizado) para um agente trabalhar.
//   npm run agent:start -- <nome-curto>
import { execFileSync } from 'node:child_process';
import { existsSync, symlinkSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const name = (process.argv[2] || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
if (!name) { console.error('Uso: npm run agent:start -- <nome-curto>  (ex.: gemini-registro)'); process.exit(2); }
const git = (a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const root = git(['rev-parse', '--show-toplevel']);
console.log('Atualizando origin/main…');
git(['fetch', 'origin', 'main']);
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const branch = `agent/${name}-${stamp}`;
const dir = resolve(dirname(root), `Ethos-agent-${name}`);
if (existsSync(dir)) { console.error(`A pasta já existe: ${dir}. Escolha outro nome ou remova o worktree antigo.`); process.exit(1); }
git(['worktree', 'add', '-b', branch, dir, 'origin/main']);
const nm = join(root, 'node_modules');
if (existsSync(nm) && !existsSync(join(dir, 'node_modules'))) {
  try { symlinkSync(nm, join(dir, 'node_modules'), 'junction'); } catch { console.warn('Não consegui ligar node_modules; rode npm ci na nova pasta.'); }
}
console.log(`\nPronto.\n  Pasta : ${dir}\n  Branch: ${branch} (base: origin/main @ ${git(['rev-parse', '--short', 'origin/main'])})\n`);
console.log('Próximos passos:');
console.log('  1. Entre na pasta acima e leia AGENTS.md.');
console.log('  2. Apresente ao usuário: objetivo, arquivos previstos e critérios de aceite.');
console.log('  3. Com o "ok" dele: npm run scope:init -- "<tarefa>" <arquivos ou globs>');
console.log(`  (A pasta ${basename(root)} não deve ser usada para editar.)`);
