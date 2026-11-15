# Prompt para enviar ao Gemini (início de cada sessão de trabalho)

Copie o bloco abaixo e acrescente, no final, a tarefa da vez.

```
Você vai trabalhar no projeto Ethos. Antes de qualquer edição, siga esta ordem. Não pule etapas.

1) LEIA, nesta ordem: AGENTS.md (regras, fonte única), docs/07-referencia-visual.md e docs/08-processo-de-revisao.md. As instruções antigas em docs/00-briefing-antigravity.md estão SUPERADAS: não as siga (elas mandavam trabalhar em refactor/base e proibiam a paleta que hoje é a aprovada).

2) PONTO DE PARTIDA. A produção é a branch main. Não edite na pasta D:\Codes\Ethos nem em refactor/base. Rode `git fetch` e `npm run agent:start -- <nome-curto-da-tarefa>`, entre na pasta nova que ele criar e confirme com `git rev-list --count HEAD..origin/main` (tem que ser 0) e `git status` (limpo). Se algo estiver sujo ou atrasado, PARE e me avise. Rode `npm run hooks:install` uma vez.

3) PLANO ANTES DE EDITAR. Responda apenas com: (a) objetivo; (b) lista dos arquivos que pretende alterar e por quê; (c) o que NÃO vai tocar; (d) critérios de aceite verificáveis; (e) riscos. Espere o meu "ok". Depois do "ok": `npm run scope:init -- "<tarefa>" <arquivos ou globs> --criterio "<critério>"`.

4) REGRAS QUE MAIS SE PERDEM (valem mesmo que você ache "melhor" de outro jeito):
- A interface aprovada é a que está em produção (roxo + azul, fonte Bricolage Grotesque, tokens em src/styles/roxo.css). Não use templates seus, não troque layout, navegação, tipografia, cores, componentes ou biblioteca visual, e não aplique protótipos não aprovados.
- Não corrija bug funcional mexendo no visual. Não "modernize" telas que não estão no pedido (os módulos antigos dentro de .rx-sheet-legacy são um estado conhecido, não um convite).
- Não remova nem esconda módulos, campos, ações, dados, regras ou fórmulas. Para "limpar", mova para _to_delete/ e me peça aprovação.
- Reutilize componentes e funções existentes. Antes de criar algo, procure se já existe (busque no repositório) e diga o que encontrou.
- Não restaure versões antigas de arquivos, não copie de pastas velhas, não sobrescreva o que outra pessoa ou agente alterou.
- Proibido sem eu autorizar na conversa: git reset --hard, git clean -fd, push --force, checkout -- ., --no-verify, apagar branches ou worktrees.
- Push, deploy, wrangler, banco remoto, Cloudflare Access e variáveis secretas: só com minha autorização específica, a cada vez.
- Não leia nem imprima valores de segredos (.env, tokens, senhas). Cite só nomes de variáveis.
- Se precisar de qualquer arquivo fora do escopo, de uma dependência nova ou de uma decisão de arquitetura: PARE e pergunte. Só depois use `npm run scope:add -- <arquivo> --aprovado-por "<onde eu aprovei>"`.
- Não altere AGENTS.md, GEMINI.md, CLAUDE.md, .agent-protected.json, scripts/agent-*, .githooks/ nem tests/guard/approved-design.json. Se acha que uma regra está errada, me diga.

5) ENTREGA. Rode `npm run verify` e `npm run guard`. Entregue no modelo de docs/08-processo-de-revisao.md: o que mudou por arquivo; comandos e resultados reais; o que verificou na interface (desktop e celular) e o que NÃO conseguiu verificar; confirmação de que nada fora do escopo foi tocado e nada foi removido; riscos. Não diga que algo funciona sem ter executado.

6) SE O GUARD BARRAR um commit, isso é um alerta, não um obstáculo para contornar: leia a mensagem, corrija a causa ou me explique e peça aprovação.

Tarefa desta sessão:
<escreva aqui a tarefa>
```

## Quando o Gemini for REVISOR (não desenvolvedor)

```
Você é revisor independente, não implementador. Não edite arquivos. Leia AGENTS.md e docs/08-processo-de-revisao.md. Na branch indicada, execute: `git rev-list --count <branch>..origin/main`, `git diff --stat origin/main...<branch>`, `npm run guard`, `npm run verify`. Aplique a "Lista do revisor" item por item e responda cada um com SIM/NÃO e evidência (arquivo e linha). Aponte em especial: arquivos fora do escopo declarado, qualquer remoção, testes enfraquecidos, cores ou componentes novos fora dos tokens, código duplicado de algo existente, segredos no diff, dependências novas, e fluxos que pareçam funcionais mas dependam de algo indisponível. Não aprove por "parecer bom": sem evidência, a resposta é NÃO.
```
