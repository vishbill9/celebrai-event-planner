// Chat-based event setup: the AI asks one question at a time, offers tappable answers and fills in the event live.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from './api';
import type { Draft, EventInput } from './types';
import { emojiFor } from './CardDesigner';
import { errorText, formatDate, money } from './ui';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: Msg = { role: 'assistant', content: "Hi, I'm your CelebrAI planner. Tell me what we are celebrating and I'll set it all up with you." };
const STARTERS = ['Birthday 🎂', 'Wedding 💍', 'Anniversary 🥂', 'Baby shower 🍼', 'Corporate event 🏆', 'Festival 🪔', 'Graduation 🎓', 'Something else'];

const FIELDS: { key: keyof Draft; label: string; show: (d: Draft) => string }[] = [
  { key: 'title', label: 'Name', show: d => d.title ?? '' },
  { key: 'eventType', label: 'Type', show: d => d.eventType ?? '' },
  { key: 'eventDate', label: 'Date', show: d => (d.eventDate ? formatDate(d.eventDate) : '') },
  { key: 'location', label: 'Where', show: d => d.location ?? '' },
  { key: 'guestCount', label: 'Guests', show: d => (d.guestCount ? String(d.guestCount) : '') },
  { key: 'budgetTotal', label: 'Budget', show: d => (d.budgetTotal ? 'Rs ' + money(d.budgetTotal) : '') },
  { key: 'description', label: 'Vibe', show: d => d.description ?? '' },
];

export default function ChatIntake({ onCreate, creating }: { onCreate: (e: Partial<EventInput>) => void; creating: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [draft, setDraft] = useState<Draft>({});
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  async function ask(history: Msg[], current: Draft) {
    setBusy(true);
    setError('');
    try {
      // The greeting is local only; the server conversation always starts with the host.
      const sent = history.filter((m, i) => !(i === 0 && m.role === 'assistant')).slice(-30);
      while (sent.length && sent[0].role === 'assistant') sent.shift();
      const r = await api.intake(sent, current);
      setMsgs([...history, { role: 'assistant', content: r.reply }]);
      setDraft(r.draft);
      setSuggestions(r.suggestions);
      setReady(r.ready);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  function send(content: string) {
    const t = content.trim();
    if (!t || busy) return;
    const history: Msg[] = [...msgs, { role: 'user', content: t }];
    setMsgs(history);
    setText('');
    setSuggestions([]);
    void ask(history, draft);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    send(text);
  }

  const filled = FIELDS.filter(f => f.show(draft)).length;
  const canCreate = Boolean(draft.title) && !busy && !creating;

  return (
    <div className="chat-layout">
      <div className="chat-main">
        <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation with your planner">
          {msgs.map((m, i) => (
            <div key={i} className={'bubble ' + (m.role === 'user' ? 'me' : 'ai')}>{m.content}</div>
          ))}
          {busy && <div className="bubble ai typing" role="status" aria-label="The planner is typing"><i /><i /><i /></div>}
          {error && (
            <p className="form-error" role="alert">
              {error} <button className="link" onClick={() => void ask(msgs, draft)}>Try again</button>
            </p>
          )}
        </div>
        {suggestions.length > 0 && !busy && (
          <div className="chat-suggest" aria-label="Quick answers">
            {suggestions.map(s => (
              <button key={s} className="chip pick" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        <form className="chat-input" onSubmit={submit}>
          <input value={text} maxLength={500} onChange={e => setText(e.target.value)} placeholder="Type your answer, or tap a suggestion..." aria-label="Your message" disabled={busy} />
          <button className="btn primary" disabled={busy || !text.trim()}>Send</button>
        </form>
      </div>

      <aside className="chat-summary" aria-label="Your event so far">
        <p className="eyebrow">Your event so far</p>
        <h3>{draft.title ? emojiFor(draft.eventType ?? '') + ' ' + draft.title : 'Taking shape...'}</h3>
        <ul className="summary-list">
          {FIELDS.filter(f => f.key !== 'title').map(f => {
            const v = f.show(draft);
            return (
              <li key={f.key} className={v ? 'has' : ''}>
                <span>{f.label}</span>
                <b>{v || 'Not yet'}</b>
              </li>
            );
          })}
        </ul>
        <div className="meter" aria-hidden="true"><i style={{ width: Math.round((filled / FIELDS.length) * 100) + '%' }} /></div>
        <button className="btn primary" disabled={!canCreate} onClick={() => onCreate({ ...draft, eventDate: draft.eventDate ?? null })}>
          {creating ? 'Creating...' : ready ? 'Create my event' : 'Create with what we have'}
        </button>
        <p className="muted small-note">You can change any detail after it is created.</p>
      </aside>
    </div>
  );
}
