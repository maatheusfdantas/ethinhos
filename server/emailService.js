/**
 * ============================================================================
 * ETHOS EMAIL ENGINE (RESEND INTEGRATION & DARK CYBER SECURITY DESIGN)
 * ============================================================================
 * Serviço modularizado para disparo de e-mails transacionais com identidade
 * visual moderna do Ethos (Dark Glassmorphism, Cyan Glow & Neon Accents).
 *
 * Suporta:
 *  1. Tokens de Acesso / OTP / Validação de Cadastro
 *  2. Tokens de Recuperação de Senha
 *  3. Notificações do Sistema (Lembretes de Agenda, Hábitos e Streaks)
 *  4. Avisos e Alertas de Segurança (Login Suspeito, Sessões, LGPD)
 *  5. Fallback seguro para desenvolvimento (Simulação em log)
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
 * Formata token numérico de 6 dígitos no padrão elegante "489 • 201"
 */
export function formatTokenDisplay(token) {
  if (!token) return '';
  const clean = String(token).trim();
  if (clean.length === 6 && /^\d+$/.test(clean)) {
    return `${clean.slice(0, 3)} • ${clean.slice(3)}`;
  }
  return clean;
}

/**
 * Renderizador mestre de template HTML do Ethos
 * Compatível com Tailwind Preview e clientes de e-mail convencionais (Gmail, Outlook, Apple Mail)
 */
export function renderEthosEmail({
  title = 'Código de Verificação',
  subtitle = 'Você solicitou acesso à sua conta no Ethos. Use o código abaixo para continuar.',
  previewText = '',
  categoryTag = 'AUTENTICAÇÃO',
  subBrand = 'Security Engine',
  token = null,
  expiresInText = '10 minutos',
  contentHtml = '',
  actionUrl = '',
  actionText = 'Acessar o Ethos',
  securityNoticeTitle = 'Aviso de Segurança',
  securityNoticeText = 'Se você não solicitou este procedimento, ignore este e-mail com segurança. Nenhuma alteração foi feita na sua conta.'
}) {
  const displayToken = token ? formatTokenDisplay(token) : '';

  // Bloco central: Token, Notificação ou Aviso
  let centerBlockHtml = '';

  if (token) {
    centerBlockHtml = `
      <!-- CAIXA DO TOKEN / CÓDIGO -->
      <div class="py-4" style="padding: 18px 0; text-align: center;">
          <div class="inline-block bg-[#1a1b26] border border-[#00f2fe]/40 rounded-2xl px-8 py-5 glow-cyan" style="display: inline-block; background-color: #1a1b26; border: 1px solid rgba(0, 242, 254, 0.4); border-radius: 16px; padding: 20px 36px; box-shadow: 0 0 25px rgba(0, 242, 254, 0.15);">
              <span class="text-3xl sm:text-4xl font-mono font-bold tracking-[0.3em] text-[#00f2fe]" style="font-family: 'Courier New', Courier, monospace, 'Inter', sans-serif; font-size: 34px; font-weight: 800; letter-spacing: 0.25em; color: #00f2fe; display: block; line-height: 1.2;">
                  ${displayToken}
              </span>
          </div>
          <span class="block text-[11px] text-slate-500 mt-2 font-medium" style="display: block; font-size: 11px; color: #64748b; margin-top: 10px; font-weight: 500;">
              Este código expira em ${expiresInText}.
          </span>
      </div>
    `;
  } else if (contentHtml) {
    centerBlockHtml = `
      <!-- BLOCO DE CONTEÚDO (NOTIFICAÇÃO OU AVISO) -->
      <div style="padding: 10px 0; text-align: left;">
          <div class="bg-[#1a1b26] border border-[#2a2b3d] rounded-2xl p-5" style="background-color: #1a1b26; border: 1px solid #2a2b3d; border-radius: 16px; padding: 22px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              ${contentHtml}
          </div>
      </div>
    `;
  }

  // Botão de Ação Opcional (CTA)
  const actionBtnHtml = actionUrl ? `
    <div style="text-align: center; margin: 24px 0 12px 0;">
      <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #00f2fe 0%, #10b981 100%); color: #020617; font-weight: 700; font-size: 13.5px; padding: 13px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 16px rgba(0, 242, 254, 0.25); letter-spacing: 0.04em; text-transform: uppercase;">
        ${actionText}
      </a>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Ethos</title>
    <!-- Tailwind CSS CDN para renderização moderna e limpa no Preview -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        ethosBg: '#0f1016',
                        ethosCard: '#1a1b26',
                        ethosBorder: '#2a2b3d',
                        ethosNeon: '#10b981',
                        ethosCyan: '#00f2fe',
                        ethosMuted: '#94a3b8'
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0b0c10;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        .glow-cyan {
            box-shadow: 0 0 25px rgba(0, 242, 254, 0.15);
        }
    </style>
</head>
<body class="bg-[#0f1016] text-slate-100 py-12 px-4" style="margin: 0; padding: 36px 12px; background-color: #0b0c10; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">

    <!-- Preheader invisível para leitores de e-mail -->
    <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: #0b0c10;">
        ${previewText || title}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout: fixed; background-color: #0b0c10; margin: 0; padding: 0;">
      <tr>
        <td align="center" style="padding: 10px 0;">

          <!-- Container Principal do Email -->
          <div class="email-container bg-[#0f1016] rounded-3xl border border-[#2a2b3d] overflow-hidden shadow-2xl" style="max-width: 600px; width: 100%; background-color: #0f1016; border-radius: 24px; border: 1px solid #2a2b3d; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); text-align: left;">

              <!-- CABEÇALHO MINIMALISTA -->
              <div class="px-6 py-6 border-b border-[#2a2b3d] flex items-center justify-between bg-[#13141f]" style="padding: 24px; border-bottom: 1px solid #2a2b3d; background-color: #13141f;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left" style="vertical-align: middle;">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="vertical-align: middle;">
                              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00f2fe] to-[#10b981] flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg" style="width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #00f2fe 0%, #10b981 100%); line-height: 36px; text-align: center; font-weight: 800; color: #020617; font-size: 18px; box-shadow: 0 4px 14px rgba(0, 242, 254, 0.35);">
                                  ⚡
                              </div>
                            </td>
                            <td style="padding-left: 12px; vertical-align: middle;">
                              <span class="text-xl font-bold tracking-wider text-white" style="display: block; font-size: 19px; font-weight: 800; letter-spacing: 0.08em; color: #ffffff; line-height: 1.2;">ETHOS</span>
                              <span class="text-[10px] block text-[#00f2fe] tracking-widest uppercase font-semibold" style="display: block; font-size: 10px; color: #00f2fe; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; line-height: 1.2; margin-top: 2px;">${subBrand}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td align="right" style="vertical-align: middle;">
                        <span class="text-xs text-slate-400 block font-medium" style="display: block; font-size: 11.5px; color: #94a3b8; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">${categoryTag}</span>
                      </td>
                    </tr>
                  </table>
              </div>

              <!-- CORPO DO E-MAIL -->
              <div class="p-8 space-y-6 text-center" style="padding: 32px 28px; text-align: center;">

                  <!-- SAUDAÇÃO E INSTRUÇÃO -->
                  <div class="space-y-2" style="margin-bottom: 24px;">
                      <h1 class="text-2xl font-extrabold text-white" style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; line-height: 1.3;">${title}</h1>
                      <p class="text-sm text-slate-400 max-w-sm mx-auto" style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 auto; max-width: 440px;">
                          ${subtitle}
                      </p>
                  </div>

                  <!-- BLOCO DO TOKEN OU CONTEÚDO -->
                  ${centerBlockHtml}

                  <!-- BOTÃO DE AÇÃO OPCIONAL -->
                  ${actionBtnHtml}

                  <!-- AVISO DE SEGURANÇA OU NOTA ADICIONAL -->
                  <div class="bg-[#1a1b26] border border-[#2a2b3d] rounded-2xl p-4 text-left space-y-1" style="background-color: #1a1b26; border: 1px solid #2a2b3d; border-radius: 16px; padding: 16px; text-align: left; margin-top: 26px;">
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 6px;">
                        <tr>
                          <td style="vertical-align: middle; padding-right: 8px;">
                            <svg class="w-4 h-4 text-amber-400" style="width: 16px; height: 16px; color: #fbbf24; display: block;" fill="none" stroke="#fbbf24" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          </td>
                          <td style="vertical-align: middle;">
                            <span class="text-xs font-bold text-slate-300" style="font-size: 12px; font-weight: 700; color: #e2e8f0;">${securityNoticeTitle}</span>
                          </td>
                        </tr>
                      </table>
                      <p class="text-xs text-slate-400 leading-relaxed" style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0;">
                          ${securityNoticeText}
                      </p>
                  </div>

              </div>

              <!-- RODAPÉ DO E-MAIL -->
              <div class="px-6 py-5 bg-[#13141f] border-t border-[#2a2b3d] text-center space-y-2" style="padding: 20px 24px; background-color: #13141f; border-top: 1px solid #2a2b3d; text-align: center;">
                  <p class="text-[11px] text-slate-400" style="font-size: 11px; color: #94a3b8; margin: 0 0 6px 0; line-height: 1.5;">
                      Enviado com segurança pela infraestrutura do Ethos.
                  </p>
                  <p class="text-[10px] text-slate-600" style="font-size: 10px; color: #475569; margin: 0; line-height: 1.4;">
                      Ethos Intelligence Engine © 2026. Todos os direitos reservados.
                  </p>
              </div>

          </div>

        </td>
      </tr>
    </table>

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

      // Tratamento inteligente para o Sandbox do Resend:
      // O plano gratuito do Resend só permite envio para o e-mail do dono da conta.
      // Se alguém testar com outro e-mail, redireciona para a conta dona com aviso.
      if (error.message && error.message.includes('You can only send testing emails to your own email address')) {
        const match = error.message.match(/\(([^)]+)\)/);
        const ownerEmail = match ? match[1].trim() : null;
        if (ownerEmail) {
          console.log(`[RESEND SANDBOX ROUTE] Redirecionando disparo de teste para o e-mail da sua conta do Resend: ${ownerEmail}`);

          try {
            const fallbackRes = await client.emails.send({
              from: fromAddress,
              to: [ownerEmail],
              subject: `[Teste para ${recipient.join(', ')}] ${subject}`,
              html: `
                <div style="background-color: #1a1b26; border: 1px solid #f59e0b; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-family: 'Inter', sans-serif; font-size: 12.5px; color: #fbbf24; line-height: 1.5;">
                  <strong>⚠️ Aviso do Sandbox do Resend:</strong><br>
                  Este e-mail foi solicitado para o endereço fictício <code>${recipient.join(', ')}</code>. Como o plano gratuito do Resend (sem domínio personalizado verificado) restringe disparos apenas ao e-mail proprietário da conta, o Ethos entregou esta mensagem com segurança na sua caixa de entrada pessoal.
                </div>
              ` + html,
              text: text ? `[Aviso Sandbox: Solicitado para ${recipient.join(', ')}]\n\n${text}` : undefined
            });

            if (!fallbackRes.error) {
              console.log(`[RESEND SUCCESS VIA SANDBOX OWNER] Entregue para ${ownerEmail} (ID: ${fallbackRes.data?.id})`);
              return {
                success: true,
                id: fallbackRes.data?.id,
                sandboxRedirected: true,
                targetEmail: ownerEmail
              };
            }
          } catch (fbErr) {
            console.error('[RESEND FALLBACK ERROR]', fbErr);
          }
        }
      }

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
 * 1. Envia e-mail com token de validação de conta (cadastro / autenticação)
 */
export async function sendVerificationEmail({ email, name, token, expiresInMinutes = 60 }) {
  const safeName = name ? String(name).trim() : 'Usuário';
  const hours = Math.round(expiresInMinutes / 60);
  const timeDesc = expiresInMinutes >= 60 ? `${hours} hora${hours > 1 ? 's' : ''}` : `${expiresInMinutes} minutos`;
  const formatted = formatTokenDisplay(token);

  const html = renderEthosEmail({
    title: 'Código de Verificação',
    subtitle: `Olá, <strong style="color: #ffffff;">${safeName}</strong>!<br>Você solicitou acesso à sua conta no Ethos. Use o código abaixo para continuar.`,
    previewText: `Seu código de acesso Ethos é: ${formatted}`,
    categoryTag: 'AUTENTICAÇÃO',
    subBrand: 'Security Engine',
    token,
    expiresInText: timeDesc,
    securityNoticeTitle: 'Aviso de Segurança',
    securityNoticeText: 'Se você não solicitou este código, ignore este e-mail com segurança. Nenhuma alteração foi feita na sua conta.'
  });

  const text = `Olá, ${safeName}!\n\nSeu código de verificação no Ethos é: ${formatted}\n\nEste código expira em ${timeDesc}.\n\nSe você não solicitou este código, ignore este e-mail com segurança.`;

  return sendEmail({
    to: email,
    subject: `Ethos: Seu código de acesso é ${formatted}`,
    html,
    text
  });
}

/**
 * 2. Envia e-mail com token de recuperação de senha
 */
export async function sendPasswordResetEmail({ email, name, token, expiresInMinutes = 15 }) {
  const safeName = name ? String(name).trim() : 'Usuário';
  const formatted = formatTokenDisplay(token);

  const html = renderEthosEmail({
    title: 'Recuperação de Senha',
    subtitle: `Olá, <strong style="color: #ffffff;">${safeName}</strong>!<br>Recebemos uma solicitação para redefinir a senha da sua conta no Ethos. Use o código de segurança abaixo para prosseguir:`,
    previewText: `Código de redefinição de senha: ${formatted}`,
    categoryTag: 'AUTENTICAÇÃO',
    subBrand: 'Security Engine',
    token,
    expiresInText: `${expiresInMinutes} minutos`,
    securityNoticeTitle: 'Aviso de Segurança',
    securityNoticeText: 'Este código é intransferível e de uso único. Se você não solicitou a redefinição de senha, desconsidere este aviso ou altere suas credenciais imediatamente.'
  });

  const text = `Olá, ${safeName}!\n\nRecebemos uma solicitação de redefinição de senha para sua conta no Ethos.\n\nSeu código de segurança OTP é: ${formatted}\n\nEste código expira em ${expiresInMinutes} minutos e é de uso único.\n\nSe não solicitou a redefinição, altere suas credenciais ou ignore este aviso.`;

  return sendEmail({
    to: email,
    subject: `Ethos: Código de recuperação de senha (${formatted})`,
    html,
    text
  });
}

/**
 * 3. Envia e-mail de notificação (Agenda, Lembretes, Hábitos, Streaks)
 */
export async function sendNotificationEmail({
  email,
  name,
  title = 'Lembrete do Sistema',
  message = '',
  detailsHtml = '',
  actionUrl = '',
  actionText = 'Acessar o Ethos',
  categoryTag = 'NOTIFICAÇÃO'
}) {
  const safeName = name ? String(name).trim() : 'Usuário';

  const content = `
    <p style="margin: 0 0 12px 0; color: #f1f5f9; font-size: 14.5px;">
      ${message}
    </p>
    ${detailsHtml ? `<div style="margin-top: 14px;">${detailsHtml}</div>` : ''}
  `;

  const html = renderEthosEmail({
    title,
    subtitle: `Olá, <strong style="color: #ffffff;">${safeName}</strong>! Aqui está uma atualização da sua rotina no Ethos.`,
    previewText: title,
    categoryTag,
    subBrand: 'Intelligence Engine',
    contentHtml: content,
    actionUrl,
    actionText,
    securityNoticeTitle: 'Preferências de Notificação',
    securityNoticeText: 'Você recebeu este e-mail porque as notificações do Ethos estão ativadas no seu perfil. Você pode gerenciá-las a qualquer momento na aba de Perfil.'
  });

  const text = `Olá, ${safeName}!\n\n${title}\n\n${message}\n\nAcesse o Ethos para gerenciar sua rotina.`;

  return sendEmail({
    to: email,
    subject: `Ethos: ${title}`,
    html,
    text
  });
}

/**
 * 4. Envia e-mail de aviso de segurança (tentativas bloqueadas, novo acesso, auditoria)
 */
export async function sendSecurityAlertEmail({
  email,
  name,
  title = 'Alerta de Segurança',
  message = '',
  alertDetailsHtml = '',
  actionUrl = '',
  actionText = 'Revisar Atividade',
  categoryTag = 'AVISO DE SEGURANÇA'
}) {
  const safeName = name ? String(name).trim() : 'Usuário';

  const content = `
    <p style="margin: 0 0 12px 0; color: #f87171; font-weight: 600; font-size: 14.5px;">
      ${message}
    </p>
    ${alertDetailsHtml ? `<div style="margin-top: 14px;">${alertDetailsHtml}</div>` : ''}
  `;

  const html = renderEthosEmail({
    title,
    subtitle: `Olá, <strong style="color: #ffffff;">${safeName}</strong>! Detectamos uma atividade relevante na sua conta.`,
    previewText: `Alerta de segurança na sua conta: ${title}`,
    categoryTag,
    subBrand: 'Security Engine',
    contentHtml: content,
    actionUrl,
    actionText,
    securityNoticeTitle: 'Aviso de Proteção',
    securityNoticeText: 'Se você não reconhece esta atividade, recomendamos alterar sua senha imediatamente e revogar o acesso de sessões ativas pelo painel de controle.'
  });

  const text = `Olá, ${safeName}!\n\nAlerta de Segurança Ethos: ${title}\n\n${message}\n\nSe não foi você, acesse o painel imediatamente para proteger sua conta.`;

  return sendEmail({
    to: email,
    subject: `Ethos: ${title}`,
    html,
    text
  });
}
