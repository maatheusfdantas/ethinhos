// @vitest-environment node
/**
 * Trava de regressão visual/estrutural. Falha se um agente trocar a paleta aprovada, a fonte,
 * remover módulos do menu ou voltar a telas antigas. Para mudar de propósito: aprovação do usuário
 * citada no commit + atualizar tests/guard/approved-design.json na mesma mudança (ver docs/07).
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(p, 'utf8');
const baseline = JSON.parse(read('tests/guard/approved-design.json'));

describe('visual aprovado (roxo + azul)', () => {
  const css = read('src/styles/roxo.css');
  const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));

  it('mantém todos os tokens aprovados com os mesmos valores', () => {
    const current: Record<string, string> = {};
    for (const m of rootBlock.matchAll(/--(rx-[a-z0-9-]+):\s*([^;]+);/g)) current[m[1]!] = m[2]!.trim();
    const changed = Object.entries(baseline.tokens as Record<string, string>)
      .filter(([k, v]) => current[k] !== v)
      .map(([k, v]) => `${k}: aprovado "${v}", agora "${current[k] ?? 'AUSENTE'}"`);
    expect(changed, `Tokens alterados sem aprovação:\n${changed.join('\n')}`).toEqual([]);
  });

  it('mantém a fonte e os arquivos visuais de referência', () => {
    for (const f of baseline.arquivosVisuais) expect(existsSync(f), `${f} sumiu`).toBe(true);
    expect(css).toMatch(/Bricolage Grotesque/);
    expect(read('src/main.jsx')).toMatch(/styles\/roxo\.css/);
  });

  it('o shell continua sendo o aprovado (e não um template antigo)', () => {
    const app = read('src/App.jsx');
    expect(app).toMatch(/className="rx-root"/);
    expect(app).toMatch(/PainelTab/);
    expect(app).toMatch(/DesktopSidebar/);
    expect(read('src/components/LoginScreen.jsx')).toMatch(/rx-login/);
  });
});

describe('módulos do menu', () => {
  it('nenhum módulo foi removido ou escondido', () => {
    const nav = read('src/components/Nav.jsx');
    const block = nav.slice(nav.indexOf('const all = ['), nav.indexOf('return all.filter'));
    const ids = [...block.matchAll(/id: '([a-z_]+)'/g)].map((m) => m[1]);
    const missing = (baseline.modulosDoMenu as string[]).filter((id) => !ids.includes(id));
    expect(missing, `Módulos removidos do menu: ${missing.join(', ')}`).toEqual([]);
  });
});
