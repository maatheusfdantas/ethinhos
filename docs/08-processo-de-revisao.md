# Processo de trabalho e revisão com agentes

## Papéis
- **Quem desenvolve** (Claude, Gemini ou outro) trabalha só no escopo aprovado, em worktree próprio, e entrega com evidência.
- **Quem revisa** é **outro agente** (revisão independente de código, testes e regressões) e, no fim, **o usuário**. Quem escreveu não é o único a aprovar.
- O usuário aprova: escopo, visual, e qualquer push, deploy ou alteração remota.

## Fluxo
1. `npm run agent:start -- <nome>` cria worktree e branch `agent/<nome>-<data>` a partir de `origin/main`.
2. **Plano (antes de editar):** objetivo, arquivos previstos, critérios de aceite, riscos. O usuário responde "ok" ou ajusta.
3. `npm run scope:init -- "<tarefa>" <globs>` registra o escopo.
4. Implementação em commits pequenos. Se surgir arquivo fora do escopo: parar e pedir aprovação.
5. Verificações: `npm run lint`, `typecheck`, `npm test`, `build`, `guard`.
6. **Entrega** com o modelo abaixo.
7. **Revisão independente** (outro agente) com a lista abaixo.
8. O usuário aprova a integração. Push e deploy só com autorização específica.

## Modelo de entrega
```
## O que mudou (por arquivo)
## Escopo
- Previsto: ...      - Tocado: ...      - Fora do previsto: nenhum / <explicar e aprovação>
## Verificações (comando → resultado)
lint · typecheck · test · build · guard
## Verificado na interface
(desktop / celular / o que NÃO foi possível verificar)
## Preservação
- Nada removido: módulos, campos, ações, dados, regras, fórmulas. (ou lista com aprovação)
## Design
- Tokens e componentes reutilizados; nenhuma mudança visual não aprovada.
## Riscos e pendências
## Segredos
- Nenhum valor de segredo lido ou impresso.
```

## Lista do revisor
- [ ] `git rev-list --count <branch>..origin/main` = 0 (não partiu de base antiga).
- [ ] `git diff --stat origin/main...` só tem arquivos do escopo declarado.
- [ ] Nenhum arquivo removido ou renomeado de `src/`, `functions/`, `cloudflare/migrations/`, `tests/` sem aprovação registrada.
- [ ] Nenhum teste apagado, pulado ou enfraquecido.
- [ ] Nenhuma cor, fonte ou componente novo fora dos tokens existentes; `approved-design.json` intacto.
- [ ] Nenhum módulo do menu removido ou escondido.
- [ ] Sem código duplicado de algo que já existe (procurar antes de aceitar uma função "nova").
- [ ] Sem segredos, senhas, tokens ou dados pessoais no diff, nos testes ou no relatório.
- [ ] Sem dependência nova não aprovada.
- [ ] Migrações apenas aditivas.
- [ ] Integrações indisponíveis não aparecem como funcionais.
- [ ] Os testes novos realmente falham sem a mudança (não são decorativos).

## Fechando a porta que o agente consegue abrir
Hooks locais podem ser pulados (`--no-verify`). O que fecha de verdade, no GitHub (ação do usuário):
1. *Settings → Branches → Branch protection* em `main`: exigir pull request, exigir a verificação **Guard e testes**, exigir 1 aprovação, bloquear force push.
2. Ninguém (agente incluído) com permissão de push direto em `main`.
