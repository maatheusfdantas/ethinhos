# Regras para agentes de IA no Ethos

Fonte única. `GEMINI.md` e `CLAUDE.md` só apontam para este arquivo. Vale para qualquer agente (Gemini, Claude, outros) e para qualquer pessoa que use IA neste repositório.

**Leia antes de editar:** `docs/07-referencia-visual.md` (visual aprovado) e `docs/08-processo-de-revisao.md` (como entregar).

## 0. Honestidade sobre o que é garantido
- Texto de instrução não impede um agente de errar. Por isso há **bloqueios técnicos** (seção 9) que rodam em commit, push e CI.
- Eles reduzem o risco, mas **não são infalíveis**: `git commit --no-verify` os ignora, e só o GitHub com *branch protection* e revisão de uma pessoa fecha essa porta. Se você é um agente, **nunca** use `--no-verify`, nem edite os arquivos de regra, hooks ou do guard para fazer algo passar.

## 1. Ponto de partida (causa nº 1 das regressões)
- **`main` é a produção.** Trabalhe **sempre** num worktree novo criado a partir de `origin/main`: `npm run agent:start -- <nome-curto>`.
- Nunca trabalhe em `refactor/base`, em pastas antigas ou numa branch atrasada. Branch atrás de `origin/main` volta a designs e códigos antigos. Faça `git fetch` e confira `git rev-list --count HEAD..origin/main` (tem que ser 0).
- Antes e depois do trabalho: `git status` e `git diff`. Se houver alterações que você não fez, **não as toque**: pergunte.

## 2. Escopo
- Faça só a tarefa aprovada. Sem refatoração oportunista, sem "já que estou aqui".
- **Antes de editar**, apresente ao usuário: objetivo, arquivos previstos e critérios de aceite. Depois registre com `npm run scope:init -- "<tarefa>" <arquivos ou globs>`.
- Precisou mexer em algo fora do plano (arquivo, arquitetura, dependência)? **Pare e peça aprovação.** Só então `npm run scope:add -- <glob> --aprovado-por "<onde o usuário aprovou>"`.
- Não instale dependências sem aprovação explícita.

## 3. Preservação
- Não remova módulos, campos, ações, dados, regras de negócio nem fórmulas. Para "limpar", **mova** para `_to_delete/` e liste, com aprovação.
- Não restaure versões antigas de arquivos por conveniência (`git checkout <commit antigo> -- arquivo`, copiar de pasta velha).
- Não sobrescreva alterações de outro agente ou do usuário.
- Proibido sem autorização específica e atual do usuário: `git reset --hard`, `git clean -fd`, `git push --force`, `git checkout -- .`, apagar branches ou worktrees dos outros, rebase de histórico já publicado.
- Não enfraqueça testes (apagar, `skip`, afrouxar asserções) para fazer algo passar.
- Não simplifique a interface removendo recursos. Se algo parece "poluído", mova para "opções avançadas": não apague.

## 4. Design
- **A referência é a interface aprovada e em produção** (ver `docs/07-referencia-visual.md`), nunca templates ou padrões do agente.
- Não troque layout, navegação, tipografia, cores, componentes ou biblioteca visual para corrigir um bug funcional.
- Reutilize os componentes e tokens existentes (`src/styles/roxo.css`, `src/components/rx/`, `Nav.jsx`). Nada de cores soltas novas se existe token.
- Mudança visual: **protótipo isolado → prévia → aprovação do usuário → só então integrar**. Não aplique propostas ou protótipos ainda não aprovados.
- Não remova conteúdo para deixar um mockup mais bonito. Dados de demonstração só em ambiente isolado e identificados como fictícios.
- Os módulos antigos dentro de `.rx-sheet-legacy` e `.rx-sheet-dark` são um estado conhecido, **não** um template a restaurar e **não** uma autorização para redesenhar.

## 5. Segurança e operações remotas
- Não leia nem exponha valores de segredos (`.env`, `.dev.vars`, tokens, chaves, senhas). Cite só os **nomes** das variáveis.
- Não imprima senhas, tokens, códigos ou dados pessoais em logs, relatórios, commits ou testes.
- **Push, deploy, `wrangler ... deploy`, `d1 execute --remote`, migrações remotas e alterações no Cloudflare Access/segredos exigem autorização específica do usuário na conversa atual.** Autorização para uma coisa não vale para outra, nem para a próxima vez.
- Banco: só migrações aditivas (`CREATE ... IF NOT EXISTS`); nunca alterar nem apagar dados existentes sem aprovação. Antes de qualquer alteração remota aprovada: registrar o ponto de restauração do D1 (*Time Travel*).
- Não crie botão ou fluxo que leve a algo que não funciona. Integração indisponível não é apresentada como funcional.

## 6. Qualidade (todos devem passar antes de entregar)
`npm run lint` · `npm run typecheck` · `npm test` · `npm run build` · `npm run guard`
Mudou comportamento? Escreva teste. Mudou tela? Verifique no navegador (desktop e celular) e informe o que viu, inclusive o que **não** conseguiu verificar.

## 7. Entrega
Use o modelo de `docs/08-processo-de-revisao.md`: o que mudou (por arquivo), comandos e resultados, o que ficou de fora, riscos, e confirmação de que nada fora do escopo foi tocado. Commits pequenos, em português, `tipo(escopo): descrição`.

## 8. Decisões vigentes (não reabrir sem o usuário)
- Visual aprovado e publicado (proposta 12, 22/11/2026):
  - tema claro lavanda (padrão) e escuro, com troca no topo;
  - identidade roxo + azul e fonte Inter;
  - cor de apoio por módulo e cartões de vidro;
  - barra lateral recolhível, dock no celular e "+" único;
  - poeira só onde definido.
  O visual escuro único com Bricolage Grotesque (proposta 02), a paleta azul-marinho/ciano de `docs/00-briefing-antigravity.md` e as propostas verdes **estão obsoletos**.
- Backend oficial: Cloudflare Pages Functions + D1 (`functions/api`). `server/` e `supabase/` não são a fonte da verdade.
- Todos os módulos continuam acessíveis; nada é escondido em "Capacidades".
- Login: e-mail e senha, e Google (ativo). **Adiados, não cancelados:** domínio próprio, remetente de e-mail (Resend), login/cadastro Microsoft. Não remova o código, as variáveis nem os dados deles; também não os apresente como funcionando.
- Spotify: só leitura da música atual e da última. Sem controle de player nem playlists.
- Cloudflare Access e a senha do admin são decisões do usuário. Não alterar.

## 9. O que é bloqueio técnico e o que é só instrução
| Proteção | Tipo | Onde |
|---|---|---|
| Branch atrasada em relação a `origin/main` | Bloqueio (agente) / aviso | `npm run guard`, hooks |
| Arquivos fora do escopo declarado | Bloqueio em branches `agent/*` | guard + hook de commit |
| Apagar ou renomear arquivos protegidos | Bloqueio | guard (lista em `.agent-protected.json`) |
| Remoção grande de linhas em um arquivo | Bloqueio / aviso | guard |
| Segredos adicionados ao código | Bloqueio | guard |
| Dependência nova sem aprovação | Bloqueio | guard |
| Mexer nas regras, hooks ou no guard | Bloqueio em branches `agent/*` | guard |
| Paleta, tokens e módulos do menu alterados | Bloqueio | `npm test` (`tests/guard`) |
| Lint, tipos, testes e build | Bloqueio | hook de push e CI |
| Escopo, preservação, design, "peça aprovação" | **Só instrução** + revisão humana | este arquivo, PR template |
