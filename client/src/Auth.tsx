import { useState, type FormEvent } from 'react';
import { getSupabase } from './supabase';
import { errorText } from './ui';

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const supabase = await getSupabase();
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) setMessage({ kind: 'ok', text: 'Account created. Check your email to confirm it, then sign in.' });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-card">
        <div className="brand big"><span aria-hidden="true">🎉</span> CelebrAI</div>
        <h1>Plan the perfect event, with AI</h1>
        <p className="muted">A full timeline, checklist, budget, guest list and invitation for any celebration.</p>
        <form onSubmit={submit}>
          <label>Email
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>Password
            <input type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          {message && <p className={message.kind === 'error' ? 'form-error' : 'form-ok'} role="alert">{message.text}</p>}
          <button className="btn primary" disabled={busy}>{busy ? 'Please wait...' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMessage(null); }}>
          {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
