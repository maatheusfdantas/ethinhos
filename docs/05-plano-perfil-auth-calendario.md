# Plano: login, cadastro, categorias, registro, perfil e integrações

Diagnóstico feito em 14/11/2026 sobre o código em produção (`feat/visual-roxo` @ 9ab1565). Nada foi alterado.
Para aprovar: responda as decisões da seção 9 e diga quais fases liberar.

---

## 1. Login da conta admin

**Causa real (confirmada):**
- Até o deploy de 14/11, o servidor aceitava as senhas fixas `admin123` e `Admin@2026!Ethos` para qualquer conta admin, independentemente da senha salva.
- A correção de segurança removeu essas senhas fixas, porque qualquer pessoa que as conhecesse entrava como admin.
- Se o admin de produção entrava com uma delas, hoje recebe "Credenciais inválidas. Verifique seu e-mail e senha." (401). O código de login está correto: no teste local, com a senha certa, a conta admin entra e cai no Portal admin.
- Depois de 5 tentativas erradas, o bloqueio contra força bruta também passa a recusar por um tempo (429), o que piora a impressão de erro.
- A mensagem "falta de token" é a tela "Sua conta aguarda validação… token de 48h". Ela aparece para contas **não admin** com e-mail não confirmado. Se você entrou com a sua conta pessoal (papel usuário), o motivo é esse, e não senha.

**Correção proposta:**
1. **(Precisa da sua autorização, porque escreve no banco de produção)** Definir uma senha nova para o admin com o script já preparado em `D:\Codes\Ethos-ops\trocar-senha-admin.mjs`. A senha é digitada por você no terminal e só o hash é gravado. Não fica nada no código nem no frontend.
2. **(Leitura apenas, também precisa de autorização)** Antes disso, uma consulta de leitura nos registros de auditoria (`LOGIN_FAILED`, `BRUTE_FORCE_LOCKED`) para confirmar qual conta e qual erro aparecem.
3. **No código:**
   - Remover o atalho que faz `admin.local` e `admin@ethos.local` entrarem na "primeira conta admin" do banco.
   - Mensagens distintas e claras para "conta aguardando confirmação" e "muitas tentativas, tente em X minutos", sem detalhe técnico.
   - Botão "Ir para o app" mais visível no Portal admin, que hoje abre direto.

---

## 2. Login e cadastro com Google e Microsoft

**Situação atual (`functions/api/_routes/oauth.js`):**
- **Botões sem credenciais:** os botões existem, mas em produção não há `GOOGLE_CLIENT_ID` nem `MICROSOFT_CLIENT_ID`. O clique volta com uma mensagem técnica sobre variáveis de ambiente.
- **Problemas de segurança que precisam ser corrigidos antes de ligar:**
  1. **O `state` não é verificado na volta.** Isso permite que alguém faça a vítima entrar na conta do atacante (CSRF de login).
  2. **Vínculo automático por e-mail:** se já existe conta com o mesmo e-mail, o login social entra nela sem conferir. No Microsoft, o campo de e-mail pode não ser verificado, o que permite **tomar a conta de outra pessoa**, inclusive o admin.
  3. **Tokens do Ethos voltam na URL** (`?access_token=…`). Ficam no histórico do navegador e em logs.
  4. **Permissões demais já no login:** pede leitura e **escrita** no Google Calendar e `Calendars.ReadWrite` no Microsoft só para entrar.
  5. **Tokens do provedor gravados em texto puro** no banco.
  6. **A tabela `oauth_accounts` não está nas migrações oficiais.** Em banco novo, o primeiro login social falha.
  7. **`POST /api/auth/google/credentials` aceita, sem login, um client ID e um secret** e os guarda na memória do servidor.
  8. **`/api/auth/google/sandbox-consent` simula uma conexão falsa** com calendários de exemplo.
  9. **O erro do provedor vai cru para a URL e para a tela.**
  10. **Username gerado automaticamente** (`email_xxxx`), o que conflita com o @ obrigatório pedido.

**Como vai funcionar (Authorization Code + PKCE, tudo no servidor):**
1. O botão "Continuar com Google/Microsoft" chama `GET /api/auth/oauth/{provedor}/start?intent=login|signup`.
2. O servidor gera `state` e um `code_verifier` (PKCE) aleatórios e os guarda num cookie `HttpOnly; Secure; SameSite=Lax` assinado, com validade de 10 min.
3. O provedor devolve para `/api/auth/oauth/callback/{provedor}`. O servidor:
   - confere o `state` e troca o código usando o `client_secret`, que só existe no servidor;
   - lê o perfil.
4. **Regras de conta:**
   - Já existe vínculo (provedor + id da conta no provedor): entra.
   - Não existe vínculo, mas o e-mail é de uma conta existente: **não vincula sozinho**. Pede para a pessoa entrar com a senha uma vez e confirmar o vínculo em Perfil > Contas conectadas. Isso fecha a tomada de conta.
   - Conta nova: cria a conta com e-mail já confirmado e manda para a tela "Escolha seu @", que é obrigatória (ver seção 3).
   - No Google, só aceita se `email_verified = true`. No Microsoft, usa o `oid`/`sub` como identidade, nunca o e-mail.
5. **Retorno sem token na URL:** o servidor redireciona para `/?auth=ok` com um código de uso único, válido por 60 s e gravado no banco. O frontend troca esse código pelos tokens via `POST /api/auth/oauth/exchange` e limpa a URL.
6. **Erros** viram códigos (`cancelado`, `email_nao_verificado`, `conta_existe`, `provedor_indisponivel`), e a tela mostra uma frase compreensível para cada um.
7. **Permissões só de identidade no login:** Google `openid email profile`; Microsoft `openid profile email`. Calendário fica para depois, numa conexão separada (seção 7).

**O que você precisa fazer (sem isso, o código fica pronto mas os botões mostram "indisponível no momento"):**

| Provedor | Onde | O que criar | URI de redirecionamento |
|---|---|---|---|
| Google | console.cloud.google.com > APIs e serviços > Credenciais | Tela de consentimento OAuth (nome do app, logo, e-mail de suporte, links de privacidade e termos) e um ID do cliente OAuth do tipo "Aplicativo da Web" | `https://SEU-DOMINIO/api/auth/oauth/callback/google` |
| Microsoft | portal.azure.com > Microsoft Entra ID > Registros de aplicativo | Registro "Contas em qualquer diretório e contas pessoais", plataforma Web e um segredo do cliente | `https://SEU-DOMINIO/api/auth/oauth/callback/microsoft` |

- Para login, só com identidade, o Google não exige verificação do app. O Microsoft pede "verificação de editor" para não mostrar o aviso de "app não verificado"; funciona sem ela, só com o aviso.
- Defina o domínio final antes. Hoje é `ethos-3hs.pages.dev`, atrás do Cloudflare Access, e o Access bloqueia o retorno do provedor para quem não estiver liberado.

**Variáveis de ambiente (Cloudflare Pages > Settings > Variables, como "Secret"):**
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID=common`, `TOKEN_ENCRYPTION_KEY` (32 bytes aleatórios, para cifrar tokens de provedor). Nenhuma delas vai para o frontend.

---

## 3. Cadastro com @, confirmação de senha e requisitos

**Situação atual:**
- O @ é opcional (vira a parte antes do @ do e-mail).
- A senha exige mínimo de 6 só no servidor.
- Não há confirmação de senha.
- Duplicidade é checada junto com o e-mail, numa mensagem só.
- Recadastro de conta não confirmada sobrescreve a senha (já conhecido).

**Proposta:**
- **@ obrigatório:**
  - Texto: "Esse será o seu @ no Ethos". Formato: 3 a 20 caracteres, letras minúsculas, números, `.` e `_`, sem começar ou terminar com ponto. Lista de nomes reservados (`admin`, `suporte`, `ethos`…).
  - Disponibilidade em tempo real via `GET /api/auth/username-available?u=` (com limite de chamadas).
  - O servidor revalida e responde 409 específico ("Esse @ já está em uso"). O banco já tem `UNIQUE` em `username`; a comparação passa a ignorar maiúsculas.
- **Senha:**
  - Mínimo de **8** caracteres, 1 letra maiúscula e 1 caractere especial.
  - Lista de requisitos que vai marcando enquanto a pessoa digita; nada da senha é mostrado ou enviado antes do envio.
  - Campo "Confirmar senha" com erro "As senhas não coincidem".
  - **A mesma regra vale no servidor**, no cadastro, na redefinição e na troca de senha.
  - Contas existentes com senha fraca continuam entrando (não mudo regra de quem já tem conta). Proposta opcional: pedir a troca no próximo login.
- **Login social:** conta nova cai na tela "Escolha seu @" antes de entrar.
- Corrigir o recadastro que sobrescreve a senha de conta não confirmada.

**Limitação atual do e-mail:** sem `RESEND_FROM` com domínio verificado, o código de confirmação não chega a clientes. Isso continua sendo um bloqueio do cadastro por e-mail. O cadastro com Google ou Microsoft não depende disso.

---

## 4. Categorias e ícones

**Situação atual:** em [CategoryConfigModal.jsx](../src/components/CategoryConfigModal.jsx), a biblioteca de 112 ícones (`IconPicker`) fica sempre aberta, ocupando 280 px. O modal ainda está no tema claro antigo.

**Proposta:**
- Campo "Ícone" mostra só o ícone atual (ou um neutro) com o texto "Trocar".
- Ao clicar, abre um painel com busca (focada automaticamente), grupos e grade navegável por setas. Escolher fecha o painel e mostra o ícone.
- O mesmo componente vale para criar e para editar, no visual roxo.
- Os 112 ícones, as cores, as subclasses, o compartilhamento e as "capacidades" da categoria continuam como estão.

---

## 5. Registro de hábitos e eventos

**Situação atual:**
- [AddModal.jsx](../src/components/AddModal.jsx) tem 1.810 linhas, 46 estados e 22 campos visíveis, no tema claro antigo.
- **Evento:** título, datas e horas de início e fim, local, link, pauta, categoria e subclasse, repetição, lembretes, buffers antes e depois, energia, visibilidade e política de conflito.
- **Hábito:** nome, categoria, subclasse, prioridade, esforço, meta, unidade, tipo de acompanhamento, período e dias.
- A lista de [HabitsTab.jsx](../src/components/HabitsTab.jsx) não separa hoje, próximos, concluídos e pendentes.

**Proposta (mesmos campos e regras, organização nova):**
- "Novo" abre um painel com duas abas, Hábito e Evento, e foco no título.
- **Essenciais primeiro:**
  - Evento: título, data, horário (ou "dia todo") e categoria.
  - Hábito: nome, categoria, meta por dia e dias da semana.
- **"Opções avançadas" recolhidas:**
  - Evento: fim, repetição, lembretes, local e link, pauta, buffers, energia, visibilidade, conflito.
  - Hábito: subclasse, prioridade, esforço, unidade, tipo e período.
- **Categoria:** escolhida em chips com busca, com "Nova categoria" no mesmo lugar.
- **Salvar:** fecha com aviso "Hábito criado" e a opção "Desfazer". Erro fica no campo, com o motivo.
- **Lista de Hábitos:**
  - Filtros por categoria no topo e seções Hoje, Próximos, Pendentes e Concluídos.
  - Estado vazio com "Criar primeiro hábito".
  - Editar abre o mesmo painel. Excluir sempre pede confirmação, usando o `ConfirmDeleteModal`, que já existe.
- Sem métricas extras nessa tela (elas ficam em Painel e Análise).

---

## 6. Perfil

**Situação atual:** [ProfileTab.jsx](../src/components/ProfileTab.jsx) tem 2.347 linhas. As seções:
- identidade com XP e bio;
- **calculadora de hidratação** (duplica a água que já está no Painel);
- **mural de post-its**;
- "player" de música e playlists, preenchidos à mão;
- métricas compartilhadas com amigos;
- emblemas.

Peso e altura ficam em [ProfileBiometricsCard.jsx](../src/components/profile/ProfileBiometricsCard.jsx). Segurança e senha ficam em `AuthModal` ("Configurações").

**Nova organização (uma página, navegação por seções):**
1. **Perfil:**
   - Foto, nome, @ (só leitura, com opção de troca e checagem de disponibilidade), bio de 150 caracteres e perfil público ou privado.
   - XP e nível ficam como uma linha discreta.
2. **Saúde (privado):**
   - Peso, altura, objetivo (perder, manter ou ganhar peso, condicionamento, sono, outro), nível de atividade e data de nascimento opcional.
   - Selo "Só você vê". Esses dados nunca entram em rotas de outras pessoas. Já conferi: hoje só a rota da própria conta lê peso e altura, e o plano mantém assim, com teste.
   - **A meta de água continua calculada como hoje (peso × 35 ml)**, mas aparece só como "Sua meta de água: X copos". A contagem diária fica no Painel.
3. **Preferências:** tema, início da semana, fuso, notificações, módulos visíveis (o `page_preferences` atual), Foco simples e reduzir movimento.
4. **Contas conectadas:** Google, Microsoft, Google Calendar, Microsoft Calendar e Spotify. Cada uma mostra estado, permissões, "Conectar" e "Desconectar".
5. **Segurança:** trocar senha (com as regras novas), sessões, contas de login vinculadas e, no futuro, verificação em duas etapas.
6. **Dados e privacidade:**
   - Quais métricas compartilhar com amigos (já existe).
   - "Baixar meus dados" em JSON.
   - "Excluir conta", com confirmação dupla. **Este item precisa da sua decisão.**

**Removidos do Perfil sem apagar dados:**
- **Calculadora de hidratação:** vira a linha de meta descrita acima.
- **Post-its:** os dados ficam intactos (coluna `post_its` e cópia local). Proposta: virar **"Notas"** dentro de Hábitos e rotinas ou no Painel. Decida na seção 9; até lá, ficam acessíveis em Dados > "Notas antigas".
- **Player e playlists manuais:** substituídos pela integração com Spotify. As playlists salvas continuam aparecendo como links.
- **Emblemas e métricas compartilhadas:** saem do Perfil e vão para Comunidade, onde são usados.

---

## 7. Integrações

### Spotify (opcional)
- **Fluxo:** Authorization Code + PKCE pelo servidor, igual ao login social, mas como "conexão" de uma conta já logada.
- **Permissões mínimas:**
  - `user-read-currently-playing`: mostra o que está tocando.
  - `user-read-recently-played`: mostra a última música.
  - Opcional, só se você quiser mostrar playlists: `playlist-read-private`.
  - Nada de controlar o player nem de ler biblioteca ou e-mail.
- **A tela explica antes do clique** o que será lido e que dá para desconectar a qualquer momento.
- **Bloqueio:** apps novos do Spotify ficam em "modo de desenvolvimento" e só funcionam para até 25 contas cadastradas manualmente no painel. Abrir para todos exige pedido de "extended quota", com análise do Spotify. Enquanto isso, a UI mostra "Conexão em liberação".
- **O que você precisa:** criar o app em developer.spotify.com > Dashboard, com Redirect URI `https://SEU-DOMINIO/api/integrations/spotify/callback`. Variáveis: `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET`.

### Google Calendar e Microsoft Calendar
**Conexão separada do login, com permissão de leitura apenas:**
- Google `calendar.readonly` (Google exige verificação do app para esse escopo; sem ela, só até 100 usuários de teste).
- Microsoft `Calendars.Read` e `offline_access`.

**Fluxo:**
1. Conectar.
2. A pessoa vê a lista dos calendários dela e marca quais importar. **Nada vem marcado.**
3. Escolhe o período: próximos 30, 90 ou 180 dias.
4. Importa.

**Identificação e anti-duplicação:**
- Cada evento importado ganha `source` (`google` ou `microsoft`), `external_calendar_id`, `external_event_id` e `external_etag`.
- Índice único em `(user_id, source, external_calendar_id, external_event_id)`, então importar duas vezes atualiza o mesmo evento em vez de duplicar.

**Atualização:**
- Botão "Sincronizar agora", mais sincronização ao abrir a Agenda, com no mínimo 15 min entre uma e outra.
- Usa `syncToken` (Google) ou `deltaLink` (Microsoft) para trazer só o que mudou.
- Evento alterado lá fora é atualizado aqui. Evento cancelado lá fora fica marcado como "cancelado no Google", sem sumir de repente; a pessoa pode limpar.

**Separação visual:**
- Evento externo mostra a marca do calendário de origem e fica só leitura no Ethos, com "Abrir no Google/Outlook".
- A pessoa pode **duplicar como evento do Ethos** se quiser editar.

**Garantias:**
- A sincronização **nunca apaga nem altera eventos criados no Ethos**.
- Desconectar pergunta se quer manter ou remover os eventos importados.

**Escrita no calendário externo** (enviar evento do Ethos para o Google): fora desta fase. Exige escopo de escrita e mais uma verificação do Google.

**Banco (migração nova, aditiva, só com sua aprovação para rodar em produção):**
- `oauth_accounts`, com tokens cifrados com `TOKEN_ENCRYPTION_KEY`.
- `oauth_login_codes`, para o código de uso único do retorno.
- `calendar_connections`, com calendários escolhidos e `syncToken`.
- Colunas novas em `events`: `source DEFAULT 'ethos'`, `external_calendar_id`, `external_event_id`, `external_etag`, `external_updated_at`, `sync_status`.
- Nenhuma coluna ou dado atual é removido.

---

## 8. Achado extra de segurança (fora do pedido, recomendo corrigir junto)
- **`GET /api/support/tickets` sem `userId` devolve todos os chamados de suporte** (nome, e-mail e mensagem) para qualquer um, sem login.
- Hoje o Cloudflare Access protege. Quando ele for retirado para os clientes, isso fica exposto.
- **Correção:** exigir login; usuário vê só os próprios chamados e admin vê todos.

---

## 9. Decisões que preciso de você
1. **Senha do admin:** autoriza a consulta de leitura na auditoria e depois a troca da senha do admin pelo script (você digita a senha nova)?
2. **Post-its:** viram "Notas" em Hábitos e rotinas, no Painel ou em outro lugar?
3. **"Excluir conta" no Perfil:** incluir agora? É irreversível para a pessoa.
4. **Senhas fracas existentes:** pedir troca no próximo login ou deixar como está?
5. **Domínio final para OAuth:** `ethos-3hs.pages.dev` ou um domínio próprio? E o Access sai da raiz?
6. **Spotify:** só "tocando agora/última música" ou também playlists (`playlist-read-private`)?
7. **Calendário:** confirmar que a primeira versão é só importação (leitura).

---

## 10. Ordem de execução (cada fase: worktree isolado, testes, revisão do Gemini, sem push nem deploy)

| Fase | Conteúdo | Arquivos principais | Depende de você |
|---|---|---|---|
| **1A** | Admin: limpeza do atalho, mensagens claras, conserto da listagem de chamados | `functions/api/_routes/auth.js`, `public.js`, `src/components/LoginScreen.jsx` | Decisão 1 para a troca de senha |
| **1B** | Cadastro: @ obrigatório, disponibilidade, senha forte, confirmação, regra no servidor | `auth.js`, `LoginScreen.jsx`, `AuthModal.jsx`, novo `src/domain/password.ts` com testes | — |
| **1C** | OAuth refeito (PKCE, state, sem token na URL, sem vínculo por e-mail, tela "Escolha seu @"), migração aditiva | `oauth.js`, `[[path]].js`, `App.jsx` (retorno), `LoginScreen.jsx`, `cloudflare/migrations/0002_oauth.sql` | Credenciais Google e Microsoft para testar de verdade (o código fica pronto antes) |
| **1D** | Seletor de ícones recolhido, no visual roxo | `CategoryConfigModal.jsx`, `IconLibrary.jsx` | — |
| **2A** | Registro de hábitos e eventos | `AddModal.jsx` (reorganizado; o anterior vai para `_to_delete/`), `HabitsTab.jsx` | — |
| **2B** | Perfil reorganizado, saúde privada, post-its movidos | `ProfileTab.jsx`, `profile/*`, `AuthModal.jsx`, `user.js` (campos de saúde novos, aditivos) | Decisões 2 e 3 |
| **3A** | Spotify | nova rota `functions/api/_routes/integrations.js`, seção no Perfil | App no Spotify |
| **3B** | Google e Microsoft Calendar | `integrations.js`, `CalendarTab.jsx`; `GoogleCalendarConnect.jsx` substituído (o atual é simulado) | Credenciais, verificação Google, decisão 7 |

**Testes de cada fase:**
- Unidade: validação de senha e @, `state` e PKCE, anti-duplicação de eventos.
- Rotas da API com o banco simulado.
- Ponta a ponta no app local (Chrome, desktop e celular): cadastro feliz e com erros (@ ocupado, senhas diferentes, senha fraca), login admin, login social simulado com um provedor falso local, categorias, perfil, registro e exclusão com confirmação.

**Sem nenhuma alteração remota:** sem push, deploy, migração em produção ou criação de credenciais até você aprovar cada etapa.
