import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { normalizeUsername, passwordChecklist, passwordProblem, usernameProblem } from '../domain/credentials';
import { validateEmail, validatePersonName } from '../domain/validation';
import { oauthErrorMessage, takeOAuthReturn } from '../utils/oauthMessages';
import { DustCanvas } from './rx/DustCanvas';
import { BrandMark } from './Nav';

export function LoginScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot_request', 'forgot_verify'
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Campos de Cadastro
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [usernameCheck, setUsernameCheck] = useState({ status: 'idle', message: '' });
  const [providers, setProviders] = useState({ google: false, microsoft: false, loaded: false });
  const [pendingSession, setPendingSession] = useState(null); // conta nova do Google/Microsoft escolhendo o @
  const [chosenUsername, setChosenUsername] = useState('');
  const [emailCheck, setEmailCheck] = useState({
    status: 'idle', // 'idle' | 'checking' | 'valid' | 'invalid'
    message: '',
    mxServer: ''
  });

  // Estados de Recuperação de Senha por Token
  const [tokenInput, setTokenInput] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);

  // Verificação de existência de e-mail via API Externa (Disify + Google DNS MX)
  const verifyEmailAddress = async (rawEmail) => {
    const email = String(rawEmail || '').trim();
    if (!email || !email.includes('@')) {
      setEmailCheck({ status: 'idle', message: '', mxServer: '' });
      return false;
    }

    setEmailCheck({
      status: 'checking',
      message: 'Consultando API de verificação (DNS/MX)...',
      mxServer: ''
    });

    try {
      const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setEmailCheck({
          status: 'invalid',
          message: data.error || 'Este e-mail não existe ou não possui servidor ativo.',
          mxServer: ''
        });
        return false;
      }

      setEmailCheck({
        status: 'valid',
        message: `E-mail existente e verificado (${data.mxServer || data.domain})`,
        mxServer: data.mxServer || ''
      });
      return true;
    } catch (_err) {
      setEmailCheck({
        status: 'invalid',
        message: 'Não foi possível validar o e-mail na API.',
        mxServer: ''
      });
      return false;
    }
  };

  // Sessão pronta: guarda os tokens e entra
  const finishLogin = (data) => {
    if (data.auth?.accessToken) {
      sessionStorage.setItem('ethos_access_token', data.auth.accessToken);
      localStorage.setItem('ethos_access_token', data.auth.accessToken);
    }
    if (data.auth?.refreshToken) {
      sessionStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
      localStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
    }
    const { needsUsername: _n, ...user } = data;
    onLoginSuccess(user);
  };

  // Quais logins sociais estão configurados no servidor
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/oauth/providers')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => { if (alive) setProviders({ google: !!d.google, microsoft: !!d.microsoft, loaded: true }); })
      .catch(() => { if (alive) setProviders((p) => ({ ...p, loaded: true })); });
    return () => { alive = false; };
  }, []);

  // Volta do Google/Microsoft: troca o código de uso único pela sessão
  const oauthHandled = useRef(false);
  useEffect(() => {
    if (oauthHandled.current) return;
    oauthHandled.current = true;
    const ret = takeOAuthReturn();
    if (ret.error) { setErrorMessage(oauthErrorMessage(ret.error)); return; }
    if (!ret.ok || !ret.code) return;
    setMode('oauth_wait');
    fetch('/api/auth/oauth/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: ret.code }) })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (!ok) { setMode('login'); setErrorMessage(data.error || oauthErrorMessage('falha')); return; }
        if (data.needsUsername) { setPendingSession(data); setChosenUsername(''); setMode('choose_username'); return; }
        finishLogin(data);
      })
      .catch(() => { setMode('login'); setErrorMessage(oauthErrorMessage('falha')); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disponibilidade do @ em tempo real (cadastro e escolha após login social)
  const usernameValue = mode === 'choose_username' ? chosenUsername : regUsername;
  useEffect(() => {
    if (mode !== 'register' && mode !== 'choose_username') return undefined;
    const u = normalizeUsername(usernameValue);
    if (!u) { setUsernameCheck({ status: 'idle', message: '' }); return undefined; }
    const problem = usernameProblem(u);
    if (problem) { setUsernameCheck({ status: 'invalid', message: problem }); return undefined; }
    setUsernameCheck({ status: 'checking', message: 'Verificando disponibilidade…' });
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/username-available?u=${encodeURIComponent(u)}`);
        const d = await r.json();
        setUsernameCheck(d.available ? { status: 'valid', message: `@${u} está disponível.` } : { status: 'invalid', message: d.reason || 'Esse @ não está disponível.' });
      } catch {
        setUsernameCheck({ status: 'idle', message: '' });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [usernameValue, mode]);

  const handleChooseUsername = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const problem = usernameProblem(chosenUsername);
    if (problem) { setFieldErrors({ username: problem }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pendingSession?.auth?.accessToken || ''}` },
        body: JSON.stringify({ username: normalizeUsername(chosenUsername) })
      });
      const data = await res.json();
      if (!res.ok) { setFieldErrors({ username: data.error || 'Não foi possível salvar o @.' }); return; }
      finishLogin(data);
    } catch {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Submissão de Login via API
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requireVerification) {
          setRegEmail(data.email || loginInput.trim());
          setMaskedEmail(data.maskedEmail || data.email || loginInput.trim());
          setTokenInput('');
          setErrorMessage(data.error || 'Valide sua conta com o código enviado por e-mail ou com um token de 48h.');
          setMode('register_verify');
          setLoading(false);
          return;
        }
        setErrorMessage(data.error || 'Erro ao efetuar login.');
        setLoading(false);
        return;
      }

      if (data.requireVerification) {
        setRegEmail(data.email || loginInput.trim());
        setMaskedEmail(data.maskedEmail || data.email || loginInput.trim());
        setTokenInput('');
        setMode('register_verify');
        setLoading(false);
        return;
      }

      if (data.auth?.accessToken) {
        sessionStorage.setItem('ethos_access_token', data.auth.accessToken);
        localStorage.setItem('ethos_access_token', data.auth.accessToken);
      }
      if (data.auth?.refreshToken) {
        sessionStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
        localStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
      }
      onLoginSuccess(data);
    } catch (err) {
      setErrorMessage('Erro ao conectar com o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register (Exige verificação de existência do e-mail por API)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const errs = {};
    // Correção C: mesmas regras do servidor, avisadas antes de enviar.
    const nameCheck = validatePersonName(regName);
    if (nameCheck.error) errs.name = nameCheck.error;
    const emailCheckLocal = validateEmail(regEmail);
    if (emailCheckLocal.error) errs.email = emailCheckLocal.error;
    const uProblem = usernameProblem(regUsername);
    if (uProblem) errs.username = uProblem;
    else if (usernameCheck.status === 'invalid') errs.username = usernameCheck.message;
    const pProblem = passwordProblem(regPassword);
    if (pProblem) errs.password = pProblem;
    if (regPassword !== regPasswordConfirm) errs.passwordConfirm = 'As senhas não coincidem.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);

    try {
      const isEmailReal = await verifyEmailAddress(regEmail);
      if (!isEmailReal) {
        setErrorMessage('Informe um endereço de e-mail real e existente para concluir o cadastro.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: validatePersonName(regName).value,
          email: validateEmail(regEmail).value,
          username: normalizeUsername(regUsername),
          password: regPassword,
          passwordConfirm: regPasswordConfirm
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.field) setFieldErrors({ [data.field]: data.error });
        else setErrorMessage(data.error || 'Erro ao criar conta.');
        setLoading(false);
        return;
      }

      if (data.requireVerification) {
        setMaskedEmail(data.maskedEmail || regEmail);
        setTokenInput('');
        setMode('register_verify');
        setLoading(false);
        return;
      }

      if (data.auth?.accessToken) {
        sessionStorage.setItem('ethos_access_token', data.auth.accessToken);
        localStorage.setItem('ethos_access_token', data.auth.accessToken);
      }
      if (data.auth?.refreshToken) {
        sessionStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
        localStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
      }
      onLoginSuccess(data);
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Validar código de confirmação de e-mail no cadastro / token de 48h
  const handleVerifyRegisterToken = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const targetEmail = (regEmail || loginInput).trim();
    const cleanToken = tokenInput.replace(/\D/g, '') || tokenInput.trim();

    try {
      const res = await fetch('/api/auth/verify-email-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          token: cleanToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Código incorreto ou expirado.');
        setLoading(false);
        return;
      }

      // E-mail já confirmado: o servidor não devolve sessão; a pessoa entra com a senha.
      if (!data.auth?.accessToken) {
        setMode('login');
        setErrorMessage(data.message || 'Seu e-mail já está confirmado. Entre com sua senha.');
        return;
      }
      sessionStorage.setItem('ethos_access_token', data.auth.accessToken);
      localStorage.setItem('ethos_access_token', data.auth.accessToken);
      if (data.auth?.refreshToken) {
        sessionStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
        localStorage.setItem('ethos_refresh_token', data.auth.refreshToken);
      }
      onLoginSuccess(data.user ? { ...data.user, auth: data.auth } : data);
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código de confirmação de e-mail
  const handleResendRegisterCode = async () => {
    const targetEmail = (regEmail || loginInput).trim();
    if (!targetEmail) {
      setErrorMessage('Informe seu e-mail ou nome de usuário acima para receber o código.');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Novo código de verificação enviado!');
      } else {
        setErrorMessage(data.error || 'Erro ao reenviar código.');
      }
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Request Token (US36)
  const handleRequestToken = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao solicitar token de recuperação.');
        setLoading(false);
        return;
      }

      setMaskedEmail(data.maskedEmail || loginInput.trim());
      setMode('forgot_verify');
    } catch (err) {
      setMaskedEmail(loginInput.trim());
      setMode('forgot_verify');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password (US36)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const pProblem = passwordProblem(newPassword);
    if (pProblem) { setErrorMessage(pProblem); return; }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginInput.trim(),
          token: tokenInput.trim(),
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao redefinir senha.');
        setLoading(false);
        return;
      }

      setResetSuccessMsg(true);
      setTimeout(() => {
        setResetSuccessMsg(false);
        setMode('login');
        setPassword(newPassword);
      }, 1500);
    } catch (err) {
      setErrorMessage('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const goto = (m) => { setErrorMessage(''); setFieldErrors({}); setMode(m); };
  const social = (provider, action = 'login') => { window.location.href = `/api/auth/oauth/${provider}?action=${action}`; };
  const anySocial = providers.google || providers.microsoft;
  const socialButtons = (action) => (
    <>
      <div className="rx-divider">{action === 'signup' ? 'ou crie com' : 'ou continue com'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" className="rx-btn ghost" style={{ height: 46 }} disabled={!providers.google} onClick={() => social('google', action)}>Google</button>
        <button type="button" className="rx-btn ghost" style={{ height: 46 }} disabled={!providers.microsoft} onClick={() => social('microsoft', action)}>Microsoft</button>
      </div>
      {providers.loaded && !anySocial && <p className="rx-social-note">Entrar com Google ou Microsoft ainda não está disponível. Use e-mail e senha por enquanto.</p>}
    </>
  );
  const clearErr = (k) => setFieldErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  const fieldError = (k) => fieldErrors[k] ? <span className="rx-field-error" role="alert">{fieldErrors[k]}</span> : null;
  const checklist = (value, id) => (
    <ul className="rx-reqs" id={id} aria-live="polite">
      {passwordChecklist(value).map((r) => (
        <li key={r.id} className={r.ok ? 'ok' : ''}>
          {r.ok ? <CheckCircle2 size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
          <span>{r.label}<span className="sr-only">{r.ok ? ': atendido' : ': pendente'}</span></span>
        </li>
      ))}
    </ul>
  );
  const usernameStatus = usernameCheck.status !== 'idle' && !fieldErrors.username && (
    <div className={`rx-check-msg ${usernameCheck.status}`} role="status">
      {usernameCheck.status === 'valid' && <CheckCircle2 size={16} />}
      {usernameCheck.status === 'invalid' && <AlertCircle size={16} />}
      <span>{usernameCheck.message}</span>
    </div>
  );
  const titles = {
    login: ['Entrar no Ethos', 'Que bom te ver de novo.'],
    register: ['Criar sua conta', 'Leva menos de um minuto. Depois é só começar.'],
    register_verify: ['Confirme seu e-mail', maskedEmail ? `Enviamos um código para ${maskedEmail}.` : 'Digite o código que enviamos para o seu e-mail.'],
    forgot_request: ['Recuperar senha', 'Informe seu e-mail ou usuário para receber um código.'],
    choose_username: ['Escolha seu @', 'Esse será o @ da sua conta no Ethos. Outras pessoas vão te encontrar por ele.'],
    oauth_wait: ['Entrando…', 'Só um instante.'],
    forgot_verify: ['Nova senha', maskedEmail ? `Digite o código enviado para ${maskedEmail} e escolha a nova senha.` : 'Digite o código recebido e escolha a nova senha.']
  };
  const [title, lead] = titles[mode] || titles.login;

  return (
    <div className="rx-login">
      <section className="rx-login-art" aria-hidden="false">
        <DustCanvas variant="art" count={34} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 700, letterSpacing: '-.035em' }}>
          <BrandMark size={30} id="rxBrandLogin" />
          <span>ethos</span>
        </div>
        <div>
          <h1>Sua rotina, um dia de cada vez.</h1>
          <p>Hábitos, agenda, treino e foco num só lugar, com registro em um toque.</p>
          <div className="rx-preview">
            <div className="row"><span>Hábitos do dia</span><b>Concluir com um toque</b></div>
            <div className="row"><span>Água e sono</span><b>No índice do dia</b></div>
            <div className="row"><span>Agenda</span><b>Numa linha do tempo</b></div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--rx-ink-3)' }}>Seus dados ficam na sua conta e só você os vê.</p>
      </section>

      <main className="rx-login-main">
        <div className="rx-auth">
          {mode !== 'login' && mode !== 'register' && (
            <button type="button" className="rx-text-btn" onClick={() => goto('login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <ArrowLeft size={16} /> Voltar para o login
            </button>
          )}
          <h2>{title}</h2>
          <p className="lead">{lead}</p>

          {errorMessage && (
            <div className="rx-error" role="alert"><AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} /><span>{errorMessage}</span></div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} noValidate>
              <div className="rx-field">
                <label htmlFor="rxLogin">E-mail ou usuário</label>
                <input id="rxLogin" type="text" autoComplete="username" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="voce@exemplo.com" required />
              </div>
              <div className="rx-field">
                <label htmlFor="rxPass">Senha</label>
                <input id="rxPass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required />
              </div>
              <button type="submit" className="rx-btn full" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
              <div className="links">
                <button type="button" className="rx-text-btn" onClick={() => goto('forgot_request')}>Esqueci minha senha</button>
                <button type="button" className="rx-text-btn" onClick={() => goto('register_verify')}>Tenho um código de confirmação</button>
              </div>
              {socialButtons('login')}
              <p className="rx-switch">Ainda não tem conta? <button type="button" className="rx-text-btn" onClick={() => goto('register')}>Criar conta</button></p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} noValidate>
              <div className="rx-field">
                <label htmlFor="rxName">Nome</label>
                <input id="rxName" type="text" autoComplete="name" value={regName} onChange={(e) => { setRegName(e.target.value); clearErr('name'); }} placeholder="Como quer ser chamado" required maxLength={80} aria-invalid={!!fieldErrors.name} />
                {fieldError('name')}
              </div>
              <div className="rx-field">
                <label htmlFor="rxEmail">E-mail</label>
                <div className="row">
                  <input
                    id="rxEmail" type="email" autoComplete="email" value={regEmail} placeholder="voce@exemplo.com" required
                    onChange={(e) => { setRegEmail(e.target.value); clearErr('email'); if (emailCheck.status !== 'idle') setEmailCheck({ status: 'idle', message: '', mxServer: '' }); }}
                    onBlur={() => { if (regEmail && emailCheck.status === 'idle') verifyEmailAddress(regEmail); }}
                  />
                  <button type="button" className="rx-btn ghost" style={{ height: 48 }} disabled={!regEmail || emailCheck.status === 'checking'} onClick={() => verifyEmailAddress(regEmail)}>
                    {emailCheck.status === 'checking' ? 'Verificando…' : 'Verificar'}
                  </button>
                </div>
                {fieldError('email')}
                {emailCheck.status !== 'idle' && (
                  <div className={`rx-check-msg ${emailCheck.status}`} role="status">
                    {emailCheck.status === 'valid' && <CheckCircle2 size={16} />}
                    {emailCheck.status === 'invalid' && <AlertCircle size={16} />}
                    <span>{emailCheck.status === 'valid' ? 'E-mail verificado.' : emailCheck.message}</span>
                  </div>
                )}
              </div>
              <div className="rx-field">
                <label htmlFor="rxUser">Seu @ no Ethos</label>
                <div className="rx-at"><span aria-hidden="true">@</span>
                  <input id="rxUser" type="text" autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={21} value={regUsername}
                    onChange={(e) => { setRegUsername(e.target.value.replace(/^@+/, '')); clearErr('username'); }} placeholder="seu.nome" required aria-invalid={!!fieldErrors.username} aria-describedby="rxUserHint" />
                </div>
                <span className="hint" id="rxUserHint">Esse será o @ da sua conta. Letras minúsculas, números, ponto e sublinhado.</span>
                {fieldError('username')}
                {usernameStatus}
              </div>
              <div className="rx-field">
                <label htmlFor="rxNewPass">Senha</label>
                <input id="rxNewPass" type="password" autoComplete="new-password" value={regPassword} onChange={(e) => { setRegPassword(e.target.value); clearErr('password'); }} placeholder="Crie uma senha" required aria-invalid={!!fieldErrors.password} aria-describedby="rxPassReqs" />
                {checklist(regPassword, 'rxPassReqs')}
                {fieldError('password')}
              </div>
              <div className="rx-field">
                <label htmlFor="rxNewPass2">Confirmar senha</label>
                <input id="rxNewPass2" type="password" autoComplete="new-password" value={regPasswordConfirm} onChange={(e) => { setRegPasswordConfirm(e.target.value); clearErr('passwordConfirm'); }} placeholder="Digite a senha de novo" required aria-invalid={!!fieldErrors.passwordConfirm} />
                {regPasswordConfirm && regPassword !== regPasswordConfirm && !fieldErrors.passwordConfirm && <span className="rx-field-error" role="alert">As senhas não coincidem.</span>}
                {fieldError('passwordConfirm')}
              </div>
              <button type="submit" className="rx-btn full" disabled={loading}>{loading ? 'Criando conta…' : 'Criar conta'}</button>
              {socialButtons('signup')}
              <p className="rx-switch">Já tem conta? <button type="button" className="rx-text-btn" onClick={() => goto('login')}>Entrar</button></p>
            </form>
          )}

          {mode === 'oauth_wait' && <p className="lead" role="status">Confirmando seu login…</p>}

          {mode === 'choose_username' && (
            <form onSubmit={handleChooseUsername} noValidate>
              <div className="rx-field">
                <label htmlFor="rxChoose">Seu @ no Ethos</label>
                <div className="rx-at"><span aria-hidden="true">@</span>
                  <input id="rxChoose" type="text" autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={21} autoFocus value={chosenUsername}
                    onChange={(e) => { setChosenUsername(e.target.value.replace(/^@+/, '')); setFieldErrors({}); }} placeholder="seu.nome" required aria-invalid={!!fieldErrors.username} />
                </div>
                <span className="hint">Letras minúsculas, números, ponto e sublinhado. De 3 a 20 caracteres.</span>
                {fieldError('username')}
                {usernameStatus}
              </div>
              <button type="submit" className="rx-btn full" disabled={loading || usernameCheck.status === 'checking'}>{loading ? 'Salvando…' : 'Continuar'}</button>
            </form>
          )}

          {mode === 'register_verify' && (
            <form onSubmit={handleVerifyRegisterToken} noValidate>
              {!maskedEmail && (
                <div className="rx-field">
                  <label htmlFor="rxVerLogin">E-mail ou usuário</label>
                  <input id="rxVerLogin" type="text" value={regEmail || loginInput} onChange={(e) => { setLoginInput(e.target.value); setRegEmail(''); }} placeholder="voce@exemplo.com" />
                </div>
              )}
              <div className="rx-field">
                <label htmlFor="rxCode">Código</label>
                <input id="rxCode" className="rx-code" inputMode="numeric" autoComplete="one-time-code" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="000000" required />
                <span className="hint">O código de 6 dígitos chega por e-mail. Também vale o token de 48h enviado pelo administrador.</span>
              </div>
              <button type="submit" className="rx-btn full" disabled={loading}>{loading ? 'Confirmando…' : 'Confirmar e entrar'}</button>
              <div className="links">
                <button type="button" className="rx-text-btn" onClick={handleResendRegisterCode} disabled={loading}>Reenviar código</button>
              </div>
            </form>
          )}

          {mode === 'forgot_request' && (
            <form onSubmit={handleRequestToken} noValidate>
              <div className="rx-field">
                <label htmlFor="rxForgot">E-mail ou usuário</label>
                <input id="rxForgot" type="text" autoComplete="username" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="voce@exemplo.com" required />
              </div>
              <button type="submit" className="rx-btn full" disabled={loading}>{loading ? 'Enviando…' : 'Enviar código'}</button>
            </form>
          )}

          {mode === 'forgot_verify' && (
            <form onSubmit={handleResetPassword} noValidate>
              {resetSuccessMsg && <div className="rx-ok" role="status">Senha redefinida. Você já pode entrar.</div>}
              <div className="rx-field">
                <label htmlFor="rxResetCode">Código</label>
                <input id="rxResetCode" className="rx-code" inputMode="numeric" autoComplete="one-time-code" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="000000" required />
              </div>
              <div className="rx-field">
                <label htmlFor="rxResetPass">Nova senha</label>
                <input id="rxResetPass" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Escolha uma nova senha" required aria-describedby="rxResetReqs" />
                {checklist(newPassword, 'rxResetReqs')}
              </div>
              <button type="submit" className="rx-btn full" disabled={loading}>{loading ? 'Salvando…' : 'Redefinir senha'}</button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
