import { useState } from 'react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      await onLogin(password);
    } catch (err) {
      setError(err?.code === 'wrong_password' ? 'Senha incorreta.' : 'Não foi possível entrar. Tente de novo.');
      setBusy(false);
    }
  }

  return (
    <form className="login" onSubmit={submit}>
      <span className="eyebrow">Nosso apartamento</span>
      <h1>Casa Nova</h1>
      <p className="muted">Digite a senha de vocês para ver e editar a lista.</p>
      <label htmlFor="pw" className="eyebrow">Senha</label>
      <input className="field" id="pw" type="password" autoFocus autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="btn primary" type="submit" disabled={busy || !password}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}
