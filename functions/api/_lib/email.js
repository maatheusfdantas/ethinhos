/**
 * Envio de e-mails transacionais via Resend.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

// ============================================================================
// 3.1. INTEGRAÇÃO RESEND & TOKENS DE AUTENTICAÇÃO (EDGE / CLOUDFLARE PAGES)
// ============================================================================
export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function maskEmailEdge(emailStr) {
  if (!emailStr || !emailStr.includes('@')) return emailStr || '';
  const [localPart, domainPart] = emailStr.trim().split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domainPart}`;
  }
  const maskedLocal = localPart[0] + '*'.repeat(Math.max(1, localPart.length - 2)) + localPart[localPart.length - 1];
  return `${maskedLocal}@${domainPart}`;
}

export async function sendResendEmailEdge(env, { to, subject, html, text }) {
  const apiKey = env?.RESEND_API_KEY || (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : '') || 're_UT5T9E4B_9qkasyb3dheYv4Spd5yvJz3o';
  const recipient = Array.isArray(to) ? to : [to];
  const from = env?.RESEND_FROM || (typeof process !== 'undefined' ? process.env?.RESEND_FROM : '') || 'Ethos <onboarding@resend.dev>';

  if (!apiKey || apiKey.startsWith('re_dummy')) {
    console.log(`[EDGE RESEND DEV SIMULATION] Para: ${recipient.join(', ')} | Assunto: ${subject}`);
    return { success: true, simulated: true, id: `edge_sim_${Date.now()}` };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: recipient,
        subject,
        html,
        text
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[EDGE RESEND ERROR]', data);

      // Tratamento para Sandbox do Resend: se o destinatário for diferente do e-mail da conta, entrega para o dono
      if (data?.message && data.message.includes('You can only send testing emails to your own email address')) {
        const match = data.message.match(/\(([^)]+)\)/);
        const ownerEmail = match ? match[1].trim() : 'eumatheusdantas1214@gmail.com';
        console.log(`[EDGE RESEND SANDBOX ROUTE] Redirecionando para ${ownerEmail}`);

        const fallbackRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from,
            to: [ownerEmail],
            subject: `[Teste para ${recipient.join(', ')}] ${subject}`,
            html: `
              <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-family: sans-serif; font-size: 13px; color: #92400E; line-height: 1.5;">
                <strong>⚠️ Aviso do Sandbox do Resend:</strong><br>
                Este e-mail foi solicitado para o endereço fictício <code>${recipient.join(', ')}</code>. Como o plano gratuito do Resend restringe disparos ao e-mail proprietário da conta, o Ethos entregou esta mensagem na sua caixa de entrada pessoal.
              </div>
            ` + html,
            text: text ? `[Aviso Sandbox: Solicitado para ${recipient.join(', ')}]\n\n${text}` : undefined
          })
        });

        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok) {
          console.log(`[EDGE RESEND SUCCESS VIA SANDBOX OWNER] Entregue para ${ownerEmail} (ID: ${fallbackData?.id})`);
          return { success: true, id: fallbackData?.id, sandboxRedirected: true, targetEmail: ownerEmail };
        }
      }

      return { success: false, error: data?.message || 'Erro ao enviar via Resend Edge' };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[EDGE RESEND EXCEPTION]', err);
    return { success: false, error: err.message };
  }
}

export function formatTokenDisplayEdge(token) {
  if (!token) return '';
  const clean = String(token).trim();
  if (clean.length === 6 && /^\d+$/.test(clean)) {
    return `${clean.slice(0, 3)} • ${clean.slice(3)}`;
  }
  return clean;
}

export function renderEthosEmailEdge({
  title = 'Código de verificação',
  subtitle = 'Olá. Use o código abaixo para continuar no Ethos.',
  previewText = '',
  categoryTag = 'Autenticação',
  token = null,
  expiresInText = '10 minutos',
  contentHtml = '',
  actionUrl = 'https://ethos-3hs.pages.dev',
  actionText = 'Abrir o Ethos',
  securityNoticeTitle = 'Aviso de segurança',
  securityNoticeText = 'Se você não solicitou este procedimento, ignore este e-mail com segurança. Nenhuma alteração foi feita na sua conta.',
  logoUrl = 'https://ethos-3hs.pages.dev/ethos-logo-email.png'
}) {
  const displayToken = token ? formatTokenDisplayEdge(token) : '';

  const tokenBlockHtml = token
    ? `
          <tr>
            <td align="center" class="px" style="padding:4px 40px 0 40px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="border-collapse:separate;">
                <tr>
                  <td align="center" bgcolor="#0f1a36" style="background-color:#0f1a36;border:1px solid #1b2a52;border-radius:14px;padding:22px 38px;">
                    <span class="tk" style="display:block;font-family:'Courier New', Courier, monospace, 'Inter', sans-serif;font-size:30px;font-weight:700;letter-spacing:0.28em;color:#2ee6c5;line-height:1.2;">
                      ${displayToken}
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0 0;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:12px;color:#8fa0c4;">
                Este código expira em ${expiresInText}.
              </p>
            </td>
          </tr>`
    : '';

  const contentBlockHtml = contentHtml
    ? `
          <tr>
            <td class="px" style="padding:${token ? '18px' : '4px'} 40px 0 40px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:separate;">
                <tr>
                  <td bgcolor="#0f1a36" style="background-color:#0f1a36;border:1px solid #1b2a52;border-radius:14px;padding:20px 22px;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:14.5px;line-height:1.65;color:#c3cde6;text-align:left;">
                    ${contentHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : '';

  const actionBtnHtml = actionUrl
    ? `
          <tr>
            <td align="center" class="px" style="padding:28px 40px 0 40px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td align="center" bgcolor="#2ee6c5"
                      style="border-radius:12px;background-color:#2ee6c5;background-image:linear-gradient(135deg,#3d8bff 0%,#2ee6c5 100%);">
                    <a href="${actionUrl}" target="_blank"
                       style="display:inline-block;padding:14px 34px;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:14.5px;font-weight:700;color:#04101f;text-decoration:none;border-radius:12px;">
                      ${actionText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - Ethos</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin:0; padding:0; background-color:#060a14; -webkit-font-smoothing:antialiased; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    img { -ms-interpolation-mode:bicubic; }
    @media only screen and (max-width:480px) {
      .px { padding-left:22px !important; padding-right:22px !important; }
      .h1 { font-size:23px !important; }
      .tk { font-size:23px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#060a14;">

  <!-- Preheader invisível -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#060a14;">
    ${previewText || title}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#060a14" style="background-color:#060a14;">
    <tr>
      <td align="center" style="padding:36px 14px;">

        <table role="presentation" width="560" border="0" cellspacing="0" cellpadding="0" bgcolor="#0b1226"
               style="width:100%;max-width:560px;background-color:#0b1226;border:1px solid #1b2a52;border-radius:20px;overflow:hidden;border-collapse:separate;">

          <!-- Faixa de gradiente da marca -->
          <tr>
            <td height="3" bgcolor="#2ee6c5" style="height:3px;font-size:0;line-height:0;background-color:#2ee6c5;background-image:linear-gradient(90deg,#3d8bff 0%,#2ee6c5 100%);">&nbsp;</td>
          </tr>

          <!-- Cabeçalho -->
          <tr>
            <td class="px" style="padding:26px 40px 22px 40px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="44" bgcolor="#0f1a36" style="width:44px;border-radius:11px;background-color:#0f1a36;"><img src="${logoUrl}" width="44" height="44" alt="Ethos"
           style="display:block;width:44px;height:44px;border-radius:11px;border:0;outline:none;text-decoration:none;"></td>
                  <td style="padding-left:13px;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:20px;font-weight:700;letter-spacing:0.04em;color:#f4f7ff;">Ethos</td>
                  <td align="right" style="font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:12.5px;color:#8fa0c4;">${categoryTag}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;" class="px"><div style="height:1px;line-height:1px;font-size:0;background-color:#142243;">&nbsp;</div></td>
          </tr>

          <!-- Título e subtítulo -->
          <tr>
            <td align="center" class="px" style="padding:34px 40px 26px 40px;">
              <h1 class="h1" style="margin:0 0 12px 0;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:27px;font-weight:700;line-height:1.25;letter-spacing:-0.01em;color:#f4f7ff;">${title}</h1>
              <p style="margin:0 auto;max-width:430px;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:15px;line-height:1.65;color:#8fa0c4;">${subtitle}</p>
            </td>
          </tr>

          ${tokenBlockHtml}
          ${contentBlockHtml}
          ${actionBtnHtml}

          <!-- Aviso -->
          <tr>
            <td class="px" style="padding:34px 40px 36px 40px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="3" bgcolor="#3d8bff" style="width:3px;background-color:#3d8bff;border-radius:3px;">&nbsp;</td>
                  <td style="padding:2px 0 2px 16px;text-align:left;">
                    <p style="margin:0 0 4px 0;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:13px;font-weight:600;color:#f4f7ff;">${securityNoticeTitle}</p>
                    <p style="margin:0;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:12.5px;line-height:1.65;color:#8fa0c4;">${securityNoticeText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td bgcolor="#080e1f" class="px" align="center" style="background-color:#080e1f;border-top:1px solid #142243;padding:22px 40px;">
              <p style="margin:0 0 6px 0;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:12px;line-height:1.6;color:#8fa0c4;">
                Mensagem automática do Ethos. Não é necessário responder. &nbsp;&bull;&nbsp; <a href="https://ethos-3hs.pages.dev" target="_blank" style="color:#8fa0c4;text-decoration:underline;">Abrir o Ethos</a>
              </p>
              <p style="margin:0;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;font-size:11px;line-height:1.5;color:#5d6c91;">&copy; 2026 Ethos. Todos os direitos reservados.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmailEdge(env, { email, name, token, expiresInMinutes = 60 }) {
  const safeName = name ? String(name).trim() : 'Usuário';
  const hours = Math.round(expiresInMinutes / 60);
  const timeDesc = expiresInMinutes >= 60 ? `${hours} hora${hours > 1 ? 's' : ''}` : `${expiresInMinutes} minutos`;
  const formatted = formatTokenDisplayEdge(token);

  const html = renderEthosEmailEdge({
    title: 'Código de verificação',
    subtitle: `Olá, <strong style="color:#ffffff;">${safeName}</strong>. Use o código abaixo para validar sua conta no Ethos.`,
    previewText: `Seu código de acesso Ethos é: ${formatted}`,
    categoryTag: 'Autenticação',
    token,
    expiresInText: timeDesc,
    actionUrl: 'https://ethos-3hs.pages.dev',
    actionText: 'Abrir o Ethos',
    securityNoticeTitle: 'Aviso de segurança',
    securityNoticeText: 'Se você não solicitou este código, ignore este e-mail com segurança. Nenhuma alteração foi feita na sua conta.'
  });

  const text = `Olá, ${safeName}.\n\nSeu código de verificação no Ethos é: ${formatted}\n\nEste código expira em ${timeDesc}.\n\nSe você não solicitou este código, ignore este e-mail com segurança.`;

  return sendResendEmailEdge(env, {
    to: email,
    subject: `Ethos: Seu código de acesso é ${formatted}`,
    html,
    text
  });
}

export async function sendPasswordResetEmailEdge(env, { email, name, token, expiresInMinutes = 15 }) {
  const safeName = name ? String(name).trim() : 'Usuário';
  const formatted = formatTokenDisplayEdge(token);

  const html = renderEthosEmailEdge({
    title: 'Recuperação de senha',
    subtitle: `Olá, <strong style="color:#ffffff;">${safeName}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta.`,
    previewText: `Código de redefinição de senha: ${formatted}`,
    categoryTag: 'Autenticação',
    token,
    expiresInText: `${expiresInMinutes} minutos`,
    actionUrl: 'https://ethos-3hs.pages.dev',
    actionText: 'Abrir o Ethos',
    securityNoticeTitle: 'Aviso de segurança',
    securityNoticeText: 'Este código é intransferível e de uso único. Se você não solicitou a redefinição de senha, desconsidere este aviso.'
  });

  const text = `Olá, ${safeName}.\n\nRecebemos uma solicitação de redefinição de senha para sua conta no Ethos.\n\nSeu código de segurança é: ${formatted}\n\nEste código expira em ${expiresInMinutes} minutos.\n\nSe não solicitou a redefinição, ignore este aviso.`;

  return sendResendEmailEdge(env, {
    to: email,
    subject: `Ethos: Código de recuperação de senha (${formatted})`,
    html,
    text
  });
}

export async function sendNotificationEmailEdge(env, {
  email,
  name,
  title = 'Seu hábito está em sequência',
  message = '',
  detailsHtml = '',
  actionUrl = 'https://ethos-3hs.pages.dev',
  actionText = 'Abrir o Ethos',
  categoryTag = 'Notificação'
}) {
  const safeName = name ? String(name).trim() : 'Usuário';

  const content = `
    <p style="margin:0;">${message}</p>
    ${detailsHtml ? `<div style="margin-top:14px;">${detailsHtml}</div>` : ''}
  `;

  const html = renderEthosEmailEdge({
    title,
    subtitle: `Olá, <strong style="color:#ffffff;">${safeName}</strong>. Aqui está uma atualização da sua rotina.`,
    previewText: title,
    categoryTag,
    contentHtml: content,
    actionUrl,
    actionText,
    securityNoticeTitle: 'Preferências de notificação',
    securityNoticeText: 'Você pode gerenciar estes avisos na aba Perfil.'
  });

  const text = `Olá, ${safeName}.\n\n${title}\n\n${message}\n\nAcesse o Ethos para gerenciar sua rotina: ${actionUrl}`;

  return sendResendEmailEdge(env, {
    to: email,
    subject: `${title} - Ethos`,
    html,
    text
  });
}

export async function sendReportEmailEdge(env, {
  email,
  name,
  title = 'Relatório da sua rotina',
  summary = '',
  metricsHtml = '',
  actionUrl = 'https://ethos-3hs.pages.dev',
  actionText = 'Abrir o Ethos',
  categoryTag = 'Relatório'
}) {
  const safeName = name ? String(name).trim() : 'Usuário';

  const content = `
    <p style="margin:0;">${summary}</p>
    ${metricsHtml ? `<div style="margin-top:14px;">${metricsHtml}</div>` : ''}
  `;

  const html = renderEthosEmailEdge({
    title,
    subtitle: `Olá, <strong style="color:#ffffff;">${safeName}</strong>. Confira o resumo consolidado das suas atividades no Ethos.`,
    previewText: title,
    categoryTag,
    contentHtml: content,
    actionUrl,
    actionText,
    securityNoticeTitle: 'Preferências de relatórios',
    securityNoticeText: 'Você pode gerenciar o envio de relatórios e avisos na aba Perfil.'
  });

  const text = `Olá, ${safeName}.\n\n${title}\n\n${summary}\n\nAcesse o Ethos: ${actionUrl}`;

  return sendResendEmailEdge(env, {
    to: email,
    subject: `${title} - Ethos`,
    html,
    text
  });
}

export async function sendSecurityAlertEmailEdge(env, {
  email,
  name,
  title = 'Alerta de segurança',
  message = '',
  alertDetailsHtml = '',
  actionUrl = 'https://ethos-3hs.pages.dev',
  actionText = 'Revisar atividade',
  categoryTag = 'Aviso'
}) {
  const safeName = name ? String(name).trim() : 'Usuário';

  const content = `
    <p style="margin:0;color:#f87171;font-weight:600;">${message}</p>
    ${alertDetailsHtml ? `<div style="margin-top:14px;">${alertDetailsHtml}</div>` : ''}
  `;

  const html = renderEthosEmailEdge({
    title,
    subtitle: `Olá, <strong style="color:#ffffff;">${safeName}</strong>. Detectamos uma atividade relevante na sua conta.`,
    previewText: title,
    categoryTag,
    contentHtml: content,
    actionUrl,
    actionText,
    securityNoticeTitle: 'Aviso de segurança',
    securityNoticeText: 'Se você não reconhece esta atividade, altere sua senha imediatamente e revogue sessões ativas no painel de controle.'
  });

  const text = `Olá, ${safeName}.\n\n${title}\n\n${message}\n\nAcesse o Ethos: ${actionUrl}`;

  return sendResendEmailEdge(env, {
    to: email,
    subject: `${title} - Ethos`,
    html,
    text
  });
}

