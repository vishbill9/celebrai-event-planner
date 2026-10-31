import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { ToastProvider } from './ui';
import Auth from './Auth';
import Dashboard from './Dashboard';
import EventPage from './EventPage';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let unsubscribe = () => undefined as void;
    getSupabase()
      .then(async supabase => {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setReady(true);
        const sub = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
        unsubscribe = () => sub.data.subscription.unsubscribe();
      })
      .catch(err => {
        setProblem(err instanceof Error ? err.message : 'Could not start the app.');
        setReady(true);
      });
    return () => unsubscribe();
  }, []);

  if (!ready) return <div className="splash">Loading CelebrAI...</div>;
  if (problem) {
    return (
      <div className="splash">
        <p><strong>CelebrAI is not fully set up yet.</strong></p>
        <p className="muted">{problem}</p>
      </div>
    );
  }
  if (!session) return <ToastProvider><Auth /></ToastProvider>;

  async function signOut() {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
  }

  return (
    <ToastProvider>
      <header className="topbar">
        <Link to="/" className="brand"><span aria-hidden="true">🎉</span> CelebrAI</Link>
        <div className="topbar-right">
          <span className="who" title={session.user.email ?? ''}>{session.user.email}</span>
          <button className="btn ghost small" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
