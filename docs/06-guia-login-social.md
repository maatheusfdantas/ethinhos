# Guia: abrir o Ethos para clientes e ligar o login com Google e Microsoft

Você faz esses passos uma vez, nos painéis de cada empresa. **Nunca me envie senhas, segredos ou chaves**: cole-os direto no Cloudflare (passo 5). O código do Ethos já está pronto para recebê-los.

Tempo estimado: 1 a 2 horas no total, sem programação.

---

## 0. Decida o endereço do site (5 min)

O Google e a Microsoft só devolvem a pessoa para um endereço que você cadastrar com antecedência. Esse endereço precisa ser o definitivo.

| Opção | Endereço | Prós | Contras |
|---|---|---|---|
| A. Manter o atual | `https://ethos-3hs.pages.dev` | Grátis, já funciona | Endereço com cara de teste. O e-mail de confirmação continua sem um remetente próprio. |
| B. Domínio próprio (recomendado) | ex.: `https://app.seudominio.com.br` | Profissional; o mesmo domínio resolve o e-mail de confirmação (passo 6) | Custa cerca de R$ 40 a 80 por ano |

**Para a opção B:**
1. Compre o domínio (Registro.br para `.com.br`, ou Cloudflare > Domain Registration para `.com`).
2. No Cloudflare: Workers & Pages > **ethos** > **Custom domains** > *Set up a custom domain*. Digite o endereço e siga as instruções. O Cloudflare cria o registro sozinho se o domínio estiver nele; em outro registrador, ele mostra o registro que você precisa copiar.
3. Espere o status ficar **Active**, o que leva de minutos a algumas horas.

Nos passos seguintes, **SEU-ENDEREÇO** é `ethos-3hs.pages.dev` ou o seu domínio.

---

## 1. Liberar o site para os clientes no Cloudflare Access (10 min)

Hoje o Access exige login do Cloudflare para entrar no site. Por isso nenhum cliente consegue abrir, e o retorno do Google e da Microsoft também seria bloqueado.

**O objetivo:** abrir só o endereço principal e manter protegidos os endereços de versões antigas (`algo.ethos-3hs.pages.dev`). Esses endereços antigos ainda rodam código com falhas de segurança e acessam o mesmo banco.

1. Entre em **one.dash.cloudflare.com** (Zero Trust). Se pedir, escolha a sua conta.
2. Menu **Access** > **Applications**.
3. Abra a aplicação que protege o Ethos (o nome costuma conter `ethos`). Clique em **Configure** ou **Edit**.
4. Na lista de domínios ou destinos (*Application domain* / *Destinations*):
   - **Remova** a linha `ethos-3hs.pages.dev`, sem asterisco;
   - **Mantenha** a linha `*.ethos-3hs.pages.dev`, com asterisco. Se ela não existir, adicione: subdomínio `*`, domínio `ethos-3hs.pages.dev`.
5. **Save**.
6. **Confira:** abra uma janela anônima e entre em `https://ethos-3hs.pages.dev`. Tem que aparecer a tela de login do Ethos, e não a do Cloudflare. Depois teste um endereço antigo, por exemplo `https://5f9164f3.ethos-3hs.pages.dev`: ele ainda tem que pedir o login do Cloudflare.

> Se você usa domínio próprio (opção B), ele não fica protegido pelo Access. Isso é o esperado: é o endereço dos clientes.

---

## 2. Google: criar o login (20 a 30 min)

1. Entre em **console.cloud.google.com** com a conta Google da empresa.
2. No topo, **Selecionar projeto** > **Novo projeto** > nome `Ethos` > **Criar**. Confira que o projeto Ethos está selecionado.
3. Menu **APIs e serviços** > **Tela de consentimento OAuth** (ou **Google Auth Platform** > **Branding**):
   - **Nome do app:** Ethos
   - **E-mail de suporte:** o seu
   - **Público:** Externo
   - **Logo:** opcional. Se enviar, o Google pede uma verificação de marca, que demora alguns dias; sem logo, funciona na hora.
   - **Página inicial, política de privacidade e termos:** `https://SEU-ENDEREÇO`. Assim que tiver, troque pelas páginas reais.
   - **Domínios autorizados:** `SEU-ENDEREÇO`, sem `https://`
   - **Contato do desenvolvedor:** o seu e-mail
4. Em **Acesso a dados** (*Escopos*), **não adicione nada**. O Ethos pede só nome, e-mail e foto, que são permissões básicas e não exigem verificação.
5. Em **Público** (*Audience*), clique em **Publicar app** (*Publish app*) para sair do modo "Teste". Sem isso, só entra quem você cadastrar como testador.
6. Menu **Clientes** (*Credenciais*) > **Criar cliente** (*Criar credenciais > ID do cliente OAuth*):
   - **Tipo:** Aplicativo da Web
   - **Nome:** Ethos web
   - **URIs de redirecionamento autorizados** > **Adicionar URI**:
     `https://SEU-ENDEREÇO/api/auth/oauth/callback/google`
     (exatamente assim, sem barra no final)
   - **Criar**
7. Aparecem o **ID do cliente** e a **Chave secreta do cliente**. Deixe essa janela aberta para o passo 5 ou baixe o JSON e guarde em lugar seguro.

---

## 3. Microsoft: criar o login (15 a 20 min)

1. Entre em **entra.microsoft.com** com uma conta Microsoft. Se for conta pessoal (Outlook/Hotmail), o portal pede para criar um diretório grátis; siga.
2. Menu **Identidade** > **Aplicativos** > **Registros de aplicativo** > **Novo registro**:
   - **Nome:** Ethos
   - **Tipos de conta com suporte:** *Contas em qualquer diretório organizacional e contas pessoais da Microsoft*
   - **URI de redirecionamento:** plataforma **Web**, endereço:
     `https://SEU-ENDEREÇO/api/auth/oauth/callback/microsoft`
   - **Registrar**
3. Na tela do app, copie o **ID do aplicativo (cliente)**.
4. Menu **Certificados e segredos** > **Segredos do cliente** > **Novo segredo do cliente**:
   - **Descrição:** Ethos produção
   - **Expira em:** 24 meses. **Anote a data na agenda**: quando expirar, o login Microsoft para até você criar outro.
   - **Adicionar.** Copie a coluna **Valor**, e não a "ID do segredo". **Ela só aparece agora.**
5. Em **Permissões de API**, deixe só o que já vem (*User.Read*). Não adicione nada.
6. (Opcional) Em **Identidade visual e propriedades**, preencha o logo e os links. A "verificação de editor" tira o aviso de "app não verificado", mas o login funciona sem ela.

---

## 4. Spotify (para depois, quando chegarmos nessa fase)

1. **developer.spotify.com** > **Dashboard** > **Create app**:
   - **Nome:** Ethos
   - **Redirect URI:** `https://SEU-ENDEREÇO/api/integrations/spotify/callback`
   - **API:** Web API
2. Copie o **Client ID** e o **Client secret**.
3. **Atenção:** apps novos funcionam só para até 25 pessoas que você cadastra em **User Management**. Para liberar a todos, você pede *Extended Quota* no próprio painel, e o Spotify analisa o pedido.

---

## 5. Colocar as chaves no Cloudflare (10 min)

1. **dash.cloudflare.com** > **Workers & Pages** > **ethos** > **Settings** > **Variables and Secrets** (ambiente **Production**).
2. Para cada linha abaixo: **Add** > tipo **Secret** > cole o nome e o valor > **Save**.

| Nome (exatamente assim) | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | ID do cliente do passo 2 |
| `GOOGLE_CLIENT_SECRET` | Chave secreta do passo 2 |
| `MICROSOFT_CLIENT_ID` | ID do aplicativo do passo 3 |
| `MICROSOFT_CLIENT_SECRET` | **Valor** do segredo do passo 3 |
| `MICROSOFT_TENANT_ID` | `common` |

3. As variáveis só valem **a partir do próximo deploy**. Quando você aprovar a publicação da Fase 1, o login aparece habilitado. Até lá, os botões aparecem desabilitados com o aviso "ainda não está disponível".

---

## 6. E-mail de confirmação do cadastro (Resend, 20 min + espera)

Sem isso, quem se cadastra com e-mail e senha não recebe o código. O Google e a Microsoft não dependem disso.

1. **resend.com** > **Domains** > **Add domain** > use o seu domínio (por exemplo, `seudominio.com.br`). O Resend não aceita `pages.dev`, então isso exige a opção B do passo 0.
2. O Resend mostra 3 ou 4 registros DNS (TXT e MX). Adicione no DNS do domínio; no Cloudflare: o domínio > **DNS** > **Add record**.
3. Espere o status **Verified**.
4. No Cloudflare (passo 5), adicione `RESEND_FROM` com o valor `Ethos <nao-responda@seudominio.com.br>`.

---

## 7. Depois de tudo: como testar

1. Numa janela anônima, abra o site e clique em **Google**. Escolha uma conta. Na primeira vez, o Ethos pede para você **escolher o seu @**.
2. Saia e entre de novo com o Google: tem que entrar direto, sem pedir o @.
3. Repita com **Microsoft**.
4. Teste com o e-mail de uma conta que **já existe** no Ethos com senha. O esperado é a mensagem "Já existe uma conta Ethos com esse e-mail…". Isso é proteção: a pessoa entra com a senha e conecta o Google pelo Perfil, quando essa tela ficar pronta.

**Se algo der errado**, a tela mostra uma frase como "Esse login ainda não está disponível" ou "O login demorou demais". Me diga qual apareceu e em que passo. Não me mande as chaves.
