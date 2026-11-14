# Referência visual aprovada

**A referência é o que está em produção (`main`)**, não um template do agente e não um protótipo. Este documento diz o que isso significa.

## O que é a versão aprovada
- Direção **roxo + azul**, fonte **Bricolage Grotesque**, glass (vidro fosco) só em navegação, poeira flutuante só nos pontos definidos, barra de progresso em gradiente violeta → azul.
- Implementada em: login (`LoginScreen.jsx`), shell (`Nav.jsx`, `App.jsx`), Painel (`PainelTab.jsx`), Foco (`FocusTab.jsx` + `styles/foco.css`), Notas e seções do Perfil (`NotesTab.jsx`, `profile/*`).
- Tokens (únicos permitidos para cor): `src/styles/roxo.css`, bloco `:root`, prefixo `--rx-`. Os valores aprovados estão congelados em `tests/guard/approved-design.json` e **o `npm test` falha se mudarem**.
- Componentes visuais reutilizáveis: `src/components/rx/ProgressMeter.jsx`, `src/components/rx/DustCanvas.jsx`, classes `rx-*`, `rf-*` (Foco), `nt-*`/`ps-*` (Notas/Perfil), `sp-*` (Spotify).

## Estados conhecidos que NÃO são erro
- **Módulos ainda no desenho antigo** (Hábitos, Agenda, Treino, Maus hábitos, Análise, Comunidade, Perfil-base) rodam dentro de `.rx-sheet-legacy` (folha clara) ou `.rx-sheet-dark`. Isso é temporário e deliberado. **Não** é um template a restaurar e **não** autoriza redesenhar sem pedido.
- Portal admin com visual próprio.

## Obsoleto (não usar como referência)
- Paleta azul-marinho/ciano citada em `docs/00-briefing-antigravity.md`.
- Protótipo verde (`proposta-01`) e qualquer visual anterior ao roxo + azul.
- Telas e templates gerados por agentes em tarefas anteriores.

## Protótipos (fora do repositório, em `D:\Codes\Ethos-design`)
`proposta-02` (roxo + azul) e `proposta-03-foco` foram **aprovados e já estão implementados**. Qualquer proposta nova só entra em produção depois de: protótipo isolado → prévia → **aprovação do usuário**.

## Menu: módulos que devem existir
`dashboard`, `habits`, `calendar`, `workouts`, `focus`, `bad_habits`, `notes`, `telemetry`, `social`, `profile` (e `admin` para administradores). Acrescentar é permitido; **remover ou esconder** não. O teste `tests/guard/design-baseline.test.ts` confere.

## Como propor uma mudança visual
1. Descreva o problema do usuário que a mudança resolve.
2. Faça o protótipo em pasta isolada (fora de `src/`), com dados fictícios identificados.
3. Mostre ao usuário (captura ou arquivo) e espere aprovação escrita.
4. Só então integre, reutilizando tokens e componentes, e atualize `approved-design.json` **na mesma mudança, com a aprovação citada no commit**.
