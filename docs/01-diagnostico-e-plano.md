# Ethos — Diagnóstico técnico e plano de refatoração

Data: 2026-11-14 · Etapa: questionamento + diagnóstico (nenhum código foi alterado)

## 1. Decisões já tomadas
- Nome do produto: **Ethos** (HabitOS fica como nome interno, se quiser).
- Backend/banco oficial: **Cloudflare D1** (Pages Functions). Supabase, SQLite local e o servidor Express deixam de ser fonte da verdade.
- **Núcleo do MVP:** Rotina (hábitos + tarefas), Registros (check-ins) e Insights.
- Demais módulos (treino, foco, maus hábitos, calendário externo, social, perfil/conquistas) são **extras modulares**, parte deles só para assinantes.
- TypeScript e destino da engine Python: decisão técnica minha, critério = fluidez.

## 2. O que existe hoje (fatos observados)
| Área | Estado |
|---|---|
| Front | React 19 + Vite, **JS/JSX**. Sem react-router: navegação por `activeTab` em `App.jsx` (~40 KB, ~25 `useState`). Sem Context. |
| Componentes | `WorkoutTab` 153 KB, `BadHabitsTab` 105 KB, `ProfileTab` 96 KB, `AddModal` 90 KB, `AdminPortalTab` 84 KB, `DashboardTab` 73 KB, `CalendarTab` 72 KB. |
| Backend | **Dois backends com a mesma lógica**: `server/index.js` (83 KB, Express + SQLite) e `functions/api/[[path]].js` (149 KB, Cloudflare). |
| Bancos | SQLite (`ethos.db`), D1 (`cloudflare/d1_schema.sql`) e migration Supabase (nunca usada pelo código). |
| Sync | `useUserSync` guarda cópia no localStorage e reenvia arrays inteiros ao servidor ("anti-wipe"). Frágil: sobrescreve em bloco e não resolve conflitos. |
| Engine | `engine/` em Python (calculator, insights, service ~50 KB) lê o SQLite direto. **Não roda no Cloudflare nem no celular.** Há também `utils/biometricsAndAnalytics.js` calculando no front. Métricas duplicadas em 2 linguagens. |
| Landing | Duas: `landing/` (HTML) e `landing-site/` (TanStack, TS, bun). |
| Testes | 1 arquivo de teste de UI, 1 e2e de 414 bytes, `engine/test_engine.py`. |
| Resíduos | 16 `scratch/find_client*.cjs`, `test-email.js`, `__pycache__`, imagens de referência de login em `public/`. |
| Segredos | `.env`, `ethos.db` e `scratch/` (com `cf_token.txt`) estão no `.gitignore` ✔. Vale confirmar com `git log --all -- scratch` que nunca foram commitados. |

## 3. Problemas de modelo de dados (os que mais pesam)
1. **`habits` mistura definição e estado do dia**: tem `current` e `completed` na própria linha. O correto é hábito = definição; progresso = linha em `checkins` (que já existe, mas não é a fonte única).
2. **Tarefas não têm tabela própria**: ficam em `habits` (com `repeat_days`) ou em `events`. "Rotina" não existe como conceito no banco.
3. `tags` e `categories` são o mesmo conceito duplicado; `habits.category` (texto) coexiste com `tag_id`/`subclass_id`.
4. `health` guarda água como contador + `water_history` em JSON; sono é um único registro. Não há série histórica consultável.
5. Treino, conquistas, amigos e feed **não estão no schema D1** (vivem em localStorage ou em outro lugar).
6. Datas como texto sem fuso do usuário: sequências (streaks) quebram na virada do dia.

## 4. Decisões técnicas recomendadas
- **Engine Python → TypeScript.** Funções puras (`checkins + hábitos → métricas/insights`) rodam no Worker, no navegador e no app mobile, e funcionam offline. Python só serviria se houvesse servidor próprio. Os testes de `test_engine.py` viram a especificação do porte.
- **TypeScript: sim, gradual** (`allowJs`). Ordem: tipos de domínio e engine primeiro, depois API client, depois telas novas já em `.tsx`. Telas antigas migram quando forem tocadas.
- **Um backend só:** manter `functions/api` (Cloudflare). Quebrar o arquivo de 149 KB em módulos por domínio (`auth`, `routine`, `checkins`, `insights`, `modules/*`). Apagar `server/` depois de portar o que falta (e-mail, OAuth).
- **Sync por eventos, não por arrays:** o cliente envia operações (criar hábito, registrar check-in) com id gerado no cliente; servidor aplica e é idempotente. Isso dá offline-first e o app fica instantâneo (atualização otimista).
- **Estado e navegação:** React Router + um store leve (Zustand ou Context por domínio) no lugar dos ~25 `useState` do `App.jsx`. Code-splitting por rota, para o núcleo carregar rápido e os módulos extras só quando abertos.
- **Módulos como "capacidades":** `core` (sempre) e `modules` (treino, foco, maus hábitos, social, calendário externo) ligados por plano/preferência. A navegação mostra só o núcleo + o que o usuário ativou. Isso resolve a poluição visual e a regra de assinantes na mesma estrutura.

## 5. Modelo-alvo do núcleo (D1)
- `routines` (1 por usuário no MVP; permite várias depois)
- `commitments` (hábito ou tarefa: `kind`, título, recorrência, meta, categoria, ativo/arquivado)
- `entries` (registros: `commitment_id`, `date` local, `value`, `note`, `source`) — **fonte única de progresso**
- `categories` (substitui `tags`+`categories`+`subclasses`)
- `insights_cache` (opcional; derivados recalculáveis)
Água, sono e treino passam a ser `commitments` com tipo de medição (quantidade, duração), em vez de tabelas soltas. Migração: protótipo sem dados reais, então pode ser recriação limpa.

## 6. Plano em fases
0. **Higiene (meio dia):** branch `refactor/base`, remover `scratch/` e restos, `__pycache__`, landing duplicada, imagens de referência; congelar features novas.
1. **Fundação:** TS configurado, tipos do domínio, novo schema D1 + migrations versionadas, `functions/api` modularizado, testes de API do núcleo.
2. **Engine em TS** com os testes portados; streaks e métricas com fuso do usuário.
3. **Núcleo de produto novo:** rotas, store, tela "Hoje", registro em 1 toque, Insights. Sem tocar nos módulos extras.
4. **Design system do Ethos** (tokens, tipografia, movimento, componentes) aplicado ao núcleo.
5. **Módulos extras migrados um a um** para o padrão novo (treino, foco, maus hábitos, calendário, social/perfil), decompondo os arquivos de 100+ KB.
6. **PWA/offline** e preparação para mobile (Capacitor ou Expo, a decidir com o design pronto).

## 7. Perguntas abertas (design e produto)
Ver conversa: o que incomoda na UI, 3 apps de referência, personalidade, reação à falha, tipo de insight, IA ou regras, caminho mobile, prazo.
