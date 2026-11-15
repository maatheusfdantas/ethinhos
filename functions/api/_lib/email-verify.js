/**
 * Verificação de existência de e-mail (Disify + DNS MX).
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

// ============================================================================
// 3. VERIFICAÇÃO DE EXISTÊNCIA DE E-MAIL VIA API EXTERNA (DISIFY + GOOGLE DNS MX)
// ============================================================================
export const DOMAIN_TYPO_SUGGESTIONS = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.com.br': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'icloud.co': 'icloud.com',
  'uol.com.b': 'uol.com.br'
};

export const BLOCKED_FAKE_OR_DISPOSABLE_DOMAINS = new Set([
  'example.com',
  'test.com',
  'teste.com',
  'email.com',
  'falso.com',
  'fake.com',
  'asd.com',
  '123.com',
  'abc.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'throwawaymail.com',
  'maildrop.cc',
  'dispostable.com',
  'mohmal.com'
]);

export async function verifyEmailExistsViaAPI(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();

  const rfcRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15}$/;
  if (!email || !rfcRegex.test(email) || email.includes('..')) {
    return { valid: false, reason: 'Formato de e-mail inválido.' };
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || localPart.length < 3 || /^[._-]|[._-]$/.test(localPart)) {
    return {
      valid: false,
      reason: 'O identificador do e-mail (antes do @) é inválido ou muito curto (mínimo de 3 caracteres).'
    };
  }

  if (DOMAIN_TYPO_SUGGESTIONS[domain]) {
    return {
      valid: false,
      reason: `Domínio inválido (@${domain}). Você quis dizer @${DOMAIN_TYPO_SUGGESTIONS[domain]}?`
    };
  }

  if (BLOCKED_FAKE_OR_DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: `O domínio @${domain} é temporário, descartável ou fictício e não é permitido.`
    };
  }

  let mxServer = null;
  let disifyChecked = false;

  // API Externa #1: Disify Email Validation API
  try {
    const disifyRes = await fetch(`https://www.disify.com/api/email/${encodeURIComponent(email)}`, {
      headers: { Accept: 'application/json' }
    });
    if (disifyRes.ok) {
      const disifyData = await disifyRes.json();
      disifyChecked = true;

      if (disifyData.format === false) {
        return { valid: false, reason: 'Formato de e-mail rejeitado pela API de verificação.' };
      }
      if (disifyData.disposable === true) {
        return { valid: false, reason: 'E-mails temporários ou descartáveis não são permitidos.' };
      }
      if (disifyData.dns === false) {
        return {
          valid: false,
          reason: `Este e-mail não existe: o domínio @${domain} não possui servidor de e-mail (DNS/MX) ativo.`
        };
      }
      if (Array.isArray(disifyData.mx_info) && disifyData.mx_info.length > 0) {
        mxServer = disifyData.mx_info[0];
      }
    }
  } catch (_e) {
    // Continua para Google DNS-over-HTTPS
  }

  // API Externa #2: Google Public DNS-over-HTTPS MX Lookup
  try {
    const dnsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { Accept: 'application/json' }
    });
    if (dnsRes.ok) {
      const dnsData = await dnsRes.json();
      const answers = Array.isArray(dnsData.Answer)
        ? dnsData.Answer.filter((a) => a.type === 15 && a.data && a.data.trim() !== '0 .')
        : [];

      if (dnsData.Status !== 0 || answers.length === 0) {
        return {
          valid: false,
          reason: `E-mail inexistente: o domínio @${domain} não existe ou não possui servidor de recebimento (MX) válido.`
        };
      }

      if (!mxServer) {
        const parts = String(answers[0].data).trim().split(/\s+/);
        mxServer = (parts[1] || parts[0] || '').replace(/\.$/, '');
      }
    }
  } catch (_e) {
    if (!disifyChecked) {
      return { valid: false, reason: 'Não foi possível verificar o domínio de e-mail no momento.' };
    }
  }

  return {
    valid: true,
    email,
    domain,
    mxServer: mxServer || `mx.${domain}`,
    provider: 'Disify + Google DNS-over-HTTPS MX API',
    message: `E-mail verificado com sucesso (Servidor MX: ${mxServer || domain}).`
  };
}

