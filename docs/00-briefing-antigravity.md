# Prompt para o Antigravity — Ethos, fases 0 a 3

Você é um engenheiro de software sênior (frontend + backend) e product designer. Trabalhe no projeto Ethos (D:\Codes\Ethos), um sistema web de rotina, hábitos, registros e insights que virará app mobile.

Leia primeiro `docs/01-diagnostico-e-plano.md`. Ele é a fonte de verdade das decisões. Não reabra decisões já tomadas.

## Decisões fixas
- Banco e backend oficiais: Cloudflare D1 + Pages Functions (`functions/api`). O `server/` (Express/SQLite) e `supabase/` não são mais fonte da verdade.
- Núcleo do MVP: Rotina (hábitos e tarefas), Registros (check-ins) e Insights. Treino, foco, maus hábitos, calendário externo, social e perfil são módulos extras (alguns só para assinantes) e NÃO entram no núcleo.
- Engine de Python vira TypeScript puro (funções sem I/O). TypeScript entra de forma gradual (`allowJs`).
- Progresso vive só em `entries`/check-ins, nunca na linha do hábito.

## Regras de trabalho
1. Trabalhe na branch `refactor/base`. Um commit pequeno por tarefa, mensagem em português no formato `tipo(escopo): descrição`.
2. Rode `npm run lint` e `npm test` após cada tarefa. Se falhar, corrija antes de seguir.
3. Não faça deploy, não rode `wrangler ... deploy` nem `d1 execute --remote`. Migrations só localmente (`--local`).
4. Não leia nem imprima `.env`, `scratch/cf_token.txt` ou qualquer segredo.
5. Não apague arquivos: mova para `_to_delete/` na raiz do projeto e liste o que moveu.
6. Não adicione dependências sem justificar no commit. Prefira o que já está instalado.
7. Se algo for ambíguo ou arriscado, pare e pergunte em vez de decidir sozinho.
8. Não mude a identidade visual (logo, paleta azul-marinho/ciano) nesta etapa.

## Fase 0 — Higiene
- Mover para `_to_delete/`: `scratch/`, `test-email.js`, `engine/__pycache__`, e imagens de referência não usadas em `public/` (login-reference, login-mockup-screen, crops). Antes, confirme por busca no código que não são importadas.
- Decidir qual landing fica (`landing/` ou `landing-site/`); mover a outra para `_to_delete/` e registrar o motivo.
- Rodar lint e listar código morto (funções e componentes nunca importados). Apenas listar em `docs/02-codigo-morto.md`; remover só o que for 100% seguro.
- Critério de pronto: `npm run build` e `npm test` passando, diff sem mudança de comportamento.

## Fase 1 — Fundação
- Configurar TypeScript (`tsconfig.json` com `allowJs`, `strict` para arquivos `.ts/.tsx` novos).
- Criar `src/domain/types.ts` com os tipos: Routine, Commitment (hábito/tarefa), Entry, Category, Insight.
- Novo schema D1 em `cloudflare/migrations/0001_core.sql`: `routines`, `commitments`, `entries`, `categories` (unifica tags/categories/subclasses), índices por `user_id` e `date`. Datas de registro como data local do usuário (`YYYY-MM-DD`) + fuso guardado no usuário.
- Modularizar `functions/api/[[path]].js` em `functions/api/_lib/` e rotas por domínio (`auth`, `routine`, `entries`, `insights`). O arquivo original vira só um roteador.
- Novas rotas do núcleo: CRUD de commitments, POST idempotente de entries (id vindo do cliente), GET do dia e de intervalo.
- Testes de API do núcleo (Vitest) cobrindo criar, registrar duas vezes o mesmo id (idempotência) e virada de dia por fuso.

## Fase 2 — Engine em TypeScript
- Portar `engine/calculator.py` e `engine/insights.py` para `src/domain/engine/*.ts`, funções puras: `(commitments, entries, hoje, fuso) -> métricas/insights`.
- Portar os testes de `engine/test_engine.py` para Vitest e fazê-los passar com os mesmos números.
- Cobrir: sequência (streak), taxa de conclusão, melhor dia/horário, quebra de sequência, consistência semanal.
- Remover a duplicata em `utils/biometricsAndAnalytics.js` apontando para a engine nova. A engine Python só vai para `_to_delete/` depois que os testes equivalentes passarem.

## Fase 3 — Núcleo de produto no front
- Adicionar React Router e um store leve por domínio (Context ou Zustand) e tirar os ~25 `useState` do `App.jsx`.
- Code-splitting por rota (`React.lazy`): o núcleo carrega primeiro, os módulos extras sob demanda.
- Registro otimista: ao marcar algo, a UI muda na hora e o envio é idempotente em segundo plano, com fila offline simples (localStorage/IndexedDB) e retentativa.
- Telas novas em `.tsx`: Hoje (lista do dia, registro em 1 toque), Rotina (gerenciar hábitos/tarefas), Insights (resumo + gráficos Recharts). Navegação mostra só o núcleo e os módulos que o usuário ativou.
- Os módulos extras continuam funcionando como estão; só são carregados por rota.

## Entrega ao final de cada fase
Responda com: o que mudou (por arquivo), comandos rodados e resultado, o que ficou pendente ou foi movido para `_to_delete/`, riscos, e a próxima tarefa sugerida. Não avance para a fase seguinte sem eu aprovar.

## Fora do escopo agora
Redesign visual completo (fase 4), PWA/mobile (fase 6), migração dos módulos extras (fase 5).
