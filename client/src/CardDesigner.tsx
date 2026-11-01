// Invitation card designer: renders an SVG card in the browser and exports it as a PNG. No server or image API needed.
import { useMemo, useState } from 'react';
import { api } from './api';
import type { EventItem } from './types';
import { cardSvg, emojiFor, H, STYLES, W, type StyleId } from './cardSvg';
import { errorText, formatDate, useToast } from './ui';

function download(svg: string, name: string, onError: (m: string) => void): void {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return onError('Your browser cannot export images.');
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return onError('Could not create the image.');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  };
  img.onerror = () => onError('Could not render the card.');
  img.src = url;
}

export default function CardDesigner({ event }: { event: EventItem }) {
  const toast = useToast();
  const palette = event.aiCreative?.palette;
  const [style, setStyle] = useState<StyleId>('confetti');
  const [title, setTitle] = useState(event.title);
  const [subtitle, setSubtitle] = useState(event.aiCreative?.tagline ?? '');
  const [when, setWhen] = useState(event.eventDate ? formatDate(event.eventDate) : '');
  const [where, setWhere] = useState(event.location);
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState(emojiFor(event.eventType));
  const [usePalette, setUsePalette] = useState(true);
  const [seed, setSeed] = useState(7);
  const [busy, setBusy] = useState(false);

  const def = STYLES.find((s) => s.id === style) ?? STYLES[0];
  const colors =
    usePalette && palette && palette.length >= 5 && style !== 'elegant' && style !== 'neon' ? palette : def.fallback;
  const svg = useMemo(
    () =>
      cardSvg({ style, palette: colors, title: title || 'Your event', subtitle, when, where, message, emoji, seed }),
    [style, colors, title, subtitle, when, where, message, emoji, seed],
  );
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  async function aiText() {
    setBusy(true);
    try {
      const t = await api.writeInvitation(event.id, 'warm');
      setMessage(t.replace(/\s+/g, ' ').trim().slice(0, 220));
    } catch (e) {
      toast.show(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="designer">
      <div className="card designer-preview">
        <img src={dataUrl} alt={'Invitation card preview for ' + title} />
      </div>
      <div className="card designer-controls">
        <h2>Card Designer</h2>
        <p className="muted">Design a shareable invitation, then download it as an image.</p>
        <div className="chip-row" role="radiogroup" aria-label="Card style">
          {STYLES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={style === s.id}
              className={style === s.id ? 'chip pick active' : 'chip pick'}
              onClick={() => setStyle(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label>
          Title
          <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Tagline
          <input
            value={subtitle}
            maxLength={80}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="A night to remember"
          />
        </label>
        <label>
          When
          <input value={when} maxLength={60} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <label>
          Where
          <input value={where} maxLength={80} onChange={(e) => setWhere(e.target.value)} />
        </label>
        <label>
          Message
          <textarea
            rows={3}
            value={message}
            maxLength={220}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Join us for an evening of..."
          />
        </label>
        <div className="row-actions">
          <button className="btn ghost small" onClick={aiText} disabled={busy}>
            {busy ? 'Writing...' : 'Write message with AI'}
          </button>
          <label className="emoji-input">
            Emoji
            <input value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} aria-label="Card emoji" />
          </label>
        </div>
        {palette && style !== 'elegant' && style !== 'neon' && (
          <label className="check-row">
            <input type="checkbox" checked={usePalette} onChange={(e) => setUsePalette(e.target.checked)} /> Use my AI
            palette
          </label>
        )}
        <div className="row-actions">
          <button className="btn ghost" onClick={() => setSeed(seed + 13)}>
            Shuffle artwork
          </button>
          <button
            className="btn primary"
            onClick={() =>
              download(svg, event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-invitation.png', (m) =>
                toast.show(m, 'error'),
              )
            }
          >
            Download PNG
          </button>
        </div>
        {!palette && (
          <p className="muted small-note">
            Tip: create a concept in the Studio tab to get a palette made for your event.
          </p>
        )}
      </div>
    </section>
  );
}
