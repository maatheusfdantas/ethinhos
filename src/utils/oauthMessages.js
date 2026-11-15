// Mensagens para os códigos que o servidor devolve na volta do login social (?auth_error=...).
// Nunca mostramos texto técnico vindo da URL: código desconhecido vira a mensagem genérica.
export const OAUTH_ERROR_MESSAGES = {
  provedor_indisponivel: 'Esse login ainda não está disponível. Use e-mail e senha por enquanto.',
  cancelado: 'O login foi cancelado.',
  sessao_expirada: 'O login demorou demais ou foi aberto em outra aba. Tente de novo.',
  email_nao_verificado: 'Esse e-mail não está verificado no provedor. Verifique-o lá ou use outro método.',
  conta_existe: 'Já existe uma conta Ethos com esse e-mail. Entre com sua senha e conecte o provedor em Perfil > Contas conectadas.',
  ja_vinculada: 'Essa conta do provedor já está ligada a outro usuário do Ethos.',
  conta_desativada: 'Sua conta está desativada. Fale com o suporte.',
  spotify_nao_liberado: 'Sua conta do Spotify ainda não foi liberada para testar o Ethos. Peça ao administrador para cadastrá-la.',
  falha: 'Não foi possível concluir o login agora. Tente de novo em instantes.'
};

export const oauthErrorMessage = (code) => OAUTH_ERROR_MESSAGES[code] || OAUTH_ERROR_MESSAGES.falha;

export const PROVIDER_LABEL = { google: 'Google', microsoft: 'Microsoft', spotify: 'Spotify' };

/** Lê e limpa os parâmetros de retorno do OAuth da barra de endereço. */
export function takeOAuthReturn() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const out = {
    ok: p.get('auth') === 'ok',
    code: p.get('code') || '',
    error: p.get('auth_error') || '',
    connected: p.get('connected') || ''
  };
  if (out.ok || out.error || out.connected) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return out;
}
