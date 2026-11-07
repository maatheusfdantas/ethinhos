/**
 * ============================================================================
 * ETHOS EMAIL SERVICE (RESEND INTEGRATION)
 * ============================================================================
 * Serviço modularizado para disparo de e-mails transacionais utilizando o
 * SDK oficial do Resend ('resend') ou fallback via fetch HTTP para ambientes Edge.
 *
 * Funcionalidades:
 *  1. Validação de e-mail (envio de token no cadastro)
 *  2. Recuperação de senha (envio de token de redefinição com expiração curta)
 *  3. Templates HTML responsivos, modernos e acessíveis com a identidade do Ethos
 *  4. Fallback seguro para desenvolvimento caso RESEND_API_KEY não esteja configurada
 */

import { Resend } from 'resend';

// Carrega variáveis do arquivo .env automaticamente caso exista
try {
  process.loadEnvFile();
} catch (e) {}

/**
 * Obtém a instância ativa do cliente Resend
 */
export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (apiKey && apiKey.trim().startsWith('re_')) {
    return new Resend(apiKey.trim());
  }
  return null;
}

// Remetente padrão (pode ser sobrescrito via variável de ambiente RESEND_FROM)
export function getDefaultFrom() {
  return process.env.RESEND_FROM || 'Ethos <onboarding@resend.dev>';
}

/**
 * Template base HTML responsivo para os e-mails do Ethos
 */
function renderEmailShell({ title, previewText, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0A14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0B0A14;
      padding: 40px 0;
    }
    .main {
      background-color: #161427;
      margin: 0 auto;
      width: 100%;
      max-width: 560px;
      border-radius: 16px;
      border: 1px solid #282442;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      text-align: center;
      background: linear-gradient(180deg, rgba(124, 111, 239, 0.15) 0%, rgba(22, 20, 39, 0) 100%);
      border-bottom: 1px solid #282442;
    }
    .brand-badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(124, 111, 239, 0.2);
      border: 1px solid rgba(124, 111, 239, 0.4);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      color: #A5B4FC;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
      line-height: 1.3;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      color: #F1F5F9;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .lead-text {
      font-size: 15px;
      line-height: 1.6;
      color: #94A3B8;
      margin-bottom: 28px;
    }
    .token-box {
      background: linear-gradient(135deg, #1C1936 0%, #211D42 100%);
      border: 2px dashed #7C6FEF;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 28px 0;
    }
    .token-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #A5B4FC;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .token-value {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #38BDF8;
      margin: 0;
      user-select: all;
    }
    .expiry-note {
      font-size: 13px;
      color: #F59E0B;
      margin-top: 10px;
      font-weight: 500;
    }
    .info-card {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
      font-size: 13px;
      line-height: 1.5;
      color: #64748B;
      border-left: 3px solid #7C6FEF;
    }
    .footer {
      padding: 24px 32px;
      background-color: #0F0E1C;
      text-align: center;
      border-top: 1px solid #282442;
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
    }
    .footer a {
      color: #7C6FEF;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <!-- Prévia no cliente de e-mail -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${previewText || title}
  </div>
  <div class="wrapper">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <div class="main">
            <div class="header">
              <div class="brand-badge">⚡ Ethos Security</div>
              <h1 class="title">${title}</h1>
            </div>
            <div class="content">
              ${contentHtml}
            </div>
            <div class="footer">
              <p style="margin: 0 0 6px 0;">Este é um e-mail de segurança automatizado enviado pela plataforma <strong>Ethos</strong>.</p>
              <p style="margin: 0;">Se você não solicitou este procedimento, recomendamos alterar suas credenciais imediatamente.</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Dispara e-mail genérico utilizando o SDK do Resend
 * Se RESEND_API_KEY não estiver configurada, simula o envio de forma segura no log.
 */
export async function sendEmail({ to, subject, html, text }) {
  const recipient = Array.isArray(to) ? to : [to];
  const client = getResendClient();
  const fromAddress = getDefaultFrom();

  // Caso não haja chave real configurada, entra em modo simulação segura
  if (!client) {
    console.log('\n[RESEND: SIMULAÇÃO / DEV] ========================================');
    console.log(`Para: ${recipient.join(', ')}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Corpo Texto:\n${text || '(somente html)'}`);
    console.log('Para envio real, configure a variável de ambiente RESEND_API_KEY no arquivo .env.');
    console.log('==================================================================\n');
    return {
      success: true,
      simulated: true,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: recipient,
      subject,
      html,
      text: text || undefined
    });

    if (error) {
      console.error('[RESEND ERROR] Falha ao enviar e-mail:', error);
      return {
        success: false,
        error: error.message || 'Erro ao disparar e-mail via Resend.'
      };
    }

    console.log(`[RESEND SUCCESS] E-mail enviado com sucesso para ${recipient.join(', ')} (ID: ${data?.id})`);
    return {
      success: true,
      id: data?.id
    };
  } catch (err) {
    console.error('[RESEND EXCEPTION] Exceção durante envio:', err);
    return {
      success: false,
      error: err.message || 'Exceção ao comunicar com a API do Resend.'
    };
  }
}

/**
 * 1. Envia e-mail com token de validação de conta (cadastro)
 */
export async function sendVerificationEmail({ email, name, token, expiresInMinutes = 60 }) {
  const safeName = name ? String(name).trim() : 'Usuário';
  const hours = Math.round(expiresInMinutes / 60);
  const timeDesc = expiresInMinutes >= 60 ? `${hours} hora${hours > 1 ? 's' : ''}` : `${expiresInMinutes} minutos`;

  const html = renderEmailShell({
    title: 'Confirme seu e-mail no Ethos',
    previewText: `Seu código de confirmação Ethos é ${token}`,
    contentHtml: `
      <p class="greeting">Olá, <strong>${safeName}</strong>!</p>
      <p class="lead-text">
        Obrigado por se cadastrar no <strong>Ethos</strong>. Para ativar sua conta com total segurança e garantir a posse do seu e-mail, utilize o código de verificação abaixo:
      </p>

      <div class="token-box">
        <div class="token-label">Código de Verificação</div>
        <div class="token-value">${token}</div>
        <div class="expiry-note">⏱ Válido por ${timeDesc}</div>
      </div>

      <div class="info-card">
        <strong>Dica de Segurança:</strong> Este código é intransferível e de uso único. Nunca compartilhe este código com ninguém. Nossa equipe nunca solicitará seu código por mensagem ou telefone.
      </div>
    `
  });

  const text = `Olá, ${safeName}!\n\nSeu código de confirmação de conta no Ethos é: ${token}\n\nEste código expira em ${timeDesc}.\n\nSe você não realizou este cadastro, desconsidere este e-mail.`;

  return sendEmail({
    to: email,
    subject: `Ethos: Seu código de confirmação é ${token}`,
    html,
    text
  });
}

/**
 * 2. Envia e-mail com token de recuperação de senha
 */
export async function sendPasswordResetEmail({ email, name, token, expiresInMinutes = 15 }) {
  const safeName = name ? String(name).trim() : 'Usuário';

  const html = renderEmailShell({
    title: 'Recuperação de Senha',
    previewText: `Código de redefinição de senha: ${token}`,
    contentHtml: `
      <p class="greeting">Olá, <strong>${safeName}</strong>!</p>
      <p class="lead-text">
        Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Ethos</strong>. Utilize o código de segurança abaixo para prosseguir com a alteração:
      </p>

      <div class="token-box">
        <div class="token-label">Código de Recuperação (OTP)</div>
        <div class="token-value">${token}</div>
        <div class="expiry-note">⏱ Expira em exatamente ${expiresInMinutes} minutos</div>
      </div>

      <div class="info-card">
        <strong>Atenção:</strong> Por motivos estritos de segurança, este código pode ser utilizado apenas uma única vez. Ao concluir a redefinição de senha, todas as outras sessões ativas da sua conta serão automaticamente desconectadas.
      </div>
    `
  });

  const text = `Olá, ${safeName}!\n\nRecebemos uma solicitação de redefinição de senha para sua conta no Ethos.\n\nSeu código de segurança OTP é: ${token}\n\nEste código expira em ${expiresInMinutes} minutos e é de uso único.\n\nSe não solicitou a redefinição, altere suas credenciais ou ignore este aviso.`;

  return sendEmail({
    to: email,
    subject: `Ethos: Código de recuperação de senha (${token})`,
    html,
    text
  });
}

