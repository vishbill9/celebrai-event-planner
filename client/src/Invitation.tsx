import { useState } from 'react';
import { api } from './api';
import { errorText } from './ui';

const TONES = [
  { id: 'warm', label: 'Warm' },
  { id: 'playful', label: 'Playful' },
  { id: 'formal', label: 'Formal' },
];

export default function Invitation({ eventId }: { eventId: string }) {
  const [tone, setTone] = useState('warm');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function write() {
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      setText(await api.writeInvitation(eventId, tone));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError('Copy is not available here. Select the text and copy it manually.');
    }
  }

  return (
    <section className="card">
      <h2>Invitation writer</h2>
      <p className="muted">Pick a tone and the AI drafts an invitation using your event details. Edit it freely before sending.</p>
      <div className="chip-row" role="radiogroup" aria-label="Tone">
        {TONES.map(t => (
          <button key={t.id} role="radio" aria-checked={tone === t.id} className={tone === t.id ? 'chip pick active' : 'chip pick'} onClick={() => setTone(t.id)}>{t.label}</button>
        ))}
      </div>
      <button className="btn primary" onClick={write} disabled={busy}>{busy ? 'Writing...' : text ? 'Write another' : 'Write invitation'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
      {text && (
        <>
          <textarea className="invite-text" rows={10} value={text} onChange={e => setText(e.target.value)} aria-label="Invitation text" />
          <button className="btn ghost" onClick={copy}>{copied ? 'Copied!' : 'Copy text'}</button>
        </>
      )}
    </section>
  );
}
