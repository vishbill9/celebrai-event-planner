import { useState } from 'react';
import { api } from './api';
import type { EventItem } from './types';
import { errorText, useToast } from './ui';

interface Props {
  event: EventItem;
  onEvent: (e: EventItem) => void;
}

function Chips({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="card studio-card">
      <h3><span aria-hidden="true">{icon}</span> {title}</h3>
      <ul className="idea-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

export default function Studio({ event, onEvent }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const c = event.aiCreative;

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const next = await api.generateCreative(event.id);
      onEvent({ ...event, aiCreative: next });
      toast.show('Your creative concept is ready. Try the Card Designer next!');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.show('Copied ' + text);
    } catch {
      toast.show('Copy is not available here.', 'error');
    }
  }

  return (
    <section>
      <div className="card plan-actions">
        <div>
          <h2>Creative Studio</h2>
          <p className="muted">A colour palette, decor, menu, playlist vibes, games and more, all shaped around your event.</p>
        </div>
        <button className="btn primary" onClick={generate} disabled={busy}>{busy ? 'Dreaming up ideas...' : c ? 'Remix the concept' : 'Create concept'}</button>
      </div>
      {busy && <p className="muted pulse" role="status">The AI is mood-boarding your event...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {c && (
        <div className="plan">
          <div className="card moodboard" style={{ background: 'linear-gradient(135deg, ' + c.palette[0] + ', ' + (c.palette[4] ?? c.palette[0]) + ')', color: c.palette[3] ?? '#222' }}>
            <p className="eyebrow">Concept</p>
            <h2 className="tagline">{c.tagline}</h2>
            <div className="swatches" role="list" aria-label="Colour palette">
              {c.palette.map(col => (
                <button key={col} role="listitem" className="swatch" style={{ background: col }} onClick={() => copy(col)} title={'Copy ' + col}>
                  <span>{col}</span>
                </button>
              ))}
            </div>
            <p className="chips-inline">
              {c.hashtag && <button className="chip pick" onClick={() => copy(c.hashtag)}>{c.hashtag}</button>}
              {c.dress_code && <span className="chip">Dress code: {c.dress_code}</span>}
              {c.welcome_drink && <span className="chip">Welcome drink: {c.welcome_drink}</span>}
            </p>
          </div>

          <div className="studio-grid">
            <Chips title="Decor" icon="✨" items={c.decor} />
            <div className="card studio-card">
              <h3><span aria-hidden="true">🍽️</span> Menu</h3>
              <ul className="idea-list">{c.menu.map((m, i) => <li key={i}><b>{m.course}:</b> {m.idea}</li>)}</ul>
            </div>
            <Chips title="Playlist vibes" icon="🎵" items={c.playlist_vibes} />
            <Chips title="Games and activities" icon="🎲" items={c.activities} />
            <Chips title="Photo booth" icon="📸" items={c.photo_booth} />
            <Chips title="Return gifts" icon="🎁" items={c.return_gifts} />
          </div>
        </div>
      )}
    </section>
  );
}
