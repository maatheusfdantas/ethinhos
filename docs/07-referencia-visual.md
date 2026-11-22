# Referência visual aprovada

**A referência é o que está em produção (`main`)**, não um template do agente e não um protótipo. Este documento diz o que isso significa.

## O que é a versão aprovada (proposta 12, aprovada em 22/11/2026)
- **Dois temas:** claro em **lavanda** (padrão) e **escuro**, escolhidos pelo botão de lua/sol no topo. O tema escuro liga com `data-theme="dark"` no `<html>` (`src/components/rx/tema.js`, chave `ethos_tema`).
- **Identidade roxo + azul:** botões principais em pílula com degradê `#8B6CFF → #5B8CFF`, brilho e texto branco.
- **Fonte Inter**, guardada em `public/fonts/inter-latin.woff2`. A Bricolage Grotesque continua no projeto, mas não é mais a fonte da interface.
- **Cor de apoio por módulo** (`--rx-m-*`), usada no ícone em quadrado (`.rx-tile`), no destaque e nos gráficos do módulo. O mapa fica em `src/components/rx/modulos.js`. Exemplos: Hábitos verde, Agenda azul, Treino laranja, Foco roxo, Alimentação rosa, Maus hábitos verde-água, Notas âmbar.
- **Vidro fosco nos cartões** (`.rx-glass-card` e os cartões das telas), com desfoque e borda clara. Sem objetos 3D.
- **Navegação:**
  - no computador, barra lateral flutuante que recolhe para só ícones (chave `ethos_menu_recolhido`);
  - no celular, dock escuro com o "+" central elevado.
- **"+" único** (`src/components/rx/AcoesRapidas.jsx`): criar ou registrar qualquer coisa, com só as ações disponíveis para a pessoa.
- **Notificações:**
  - sino com contador forte;
  - painel com filtros por tipo e ícone por assunto;
  - um cartão de notificações no Painel.
- **Painel** (`PainelTab.jsx`):
  - saudação e próximo compromisso;
  - ações de um toque;
  - números do dia por módulo;
  - cartão "Hoje" em abas.
- Poeira flutuante só nos pontos já definidos (Painel e login).
- **Tokens:** os únicos permitidos para cor ficam em `src/styles/roxo.css`, prefixo `--rx-`.
  - O bloco `:root` é o tema claro.
  - O bloco `:root[data-theme="dark"]` é o escuro.
  - Os valores do `:root` estão congelados em `tests/guard/approved-design.json`, e **o `npm test` falha se mudarem**.
- **Componentes reutilizáveis:**
  - `src/components/rx/` (ProgressMeter, DustCanvas, TemaBotao, AcoesRapidas);
  - as classes `rx-*`, `pn-*` (Painel), `rf-*` (Foco), `es-*` (Espaços e notificações), `tl-*`/`pf-*`/`mh-*`/`ag-*` (telas novas), `tr-*` (Treino), `nt-*`/`ps-*` (Notas e Perfil), `sp-*` (Spotify).

## Estados conhecidos que NÃO são erro
- **Folhas antigas:**
  - a Comunidade roda dentro de `.rx-sheet-dark` (folha escura nos dois temas);
  - as Notas rodam dentro de `.rx-sheet-legacy` (folha clara).
  - Os modais de criação (`AddModal`) e de configurações ainda têm cores fixas antigas.
  - Isso é temporário e deliberado: serão convertidos um a um, sempre com prévia. **Não** é um template a restaurar e **não** autoriza redesenhar sem pedido.
- O Portal admin tem visual próprio.

## Obsoleto (não usar como referência)
- O visual escuro único com a fonte Bricolage Grotesque (proposta 02), substituído pela proposta 12.
- A paleta azul-marinho/ciano citada em `docs/00-briefing-antigravity.md`.
- O protótipo verde (`proposta-01`) e qualquer visual anterior ao roxo + azul.
- Telas e templates gerados por agentes em tarefas anteriores.

## Protótipos (fora do repositório, em `D:\Codes\Ethos-design`)
`proposta-12-nova-aparencia` é a referência da aparência atual e já está implementada (base e Painel). Qualquer proposta nova só entra em produção depois de: protótipo isolado → prévia → **aprovação do usuário**.

## Menu: módulos que devem existir
`dashboard`, `habits`, `calendar`, `workouts`, `focus`, `bad_habits`, `notes`, `telemetry`, `social`, `profile` (e `admin` para administradores).

Acrescentar é permitido; **remover ou esconder** não. O teste `tests/guard/design-baseline.test.ts` confere.

## Como propor uma mudança visual
1. Descreva o problema do usuário que a mudança resolve.
2. Faça o protótipo em pasta isolada (fora de `src/`), com dados fictícios identificados.
3. Mostre ao usuário (captura ou arquivo) e espere aprovação escrita.
4. Só então integre, reutilizando tokens e componentes, nos dois temas, e verifique desktop e celular.
5. Se mudar tokens ou a fonte, atualize `approved-design.json` **na mesma mudança, com a aprovação citada no commit**.
