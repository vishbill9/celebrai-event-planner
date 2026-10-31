// Invitation card designer: renders an SVG card in the browser and exports it as a PNG. No server or image API needed.
import { useMemo, useState } from 'react';
import { api } from './api';
import type { EventItem } from './types';
import { errorText, formatDate, useToast } from './ui';

const W = 1080;
const H = 1350;

type StyleId = 'confetti' | 'elegant' | 'neon' | 'bloom' | 'minimal';
const STYLES: { id: StyleId; label: string; fallback: string[] }[] = [
  { id: 'confetti', label: 'Confetti', fallback: ['#fff1f2', '#e11d48', '#f59e0b', '#3b0a1a', '#fecdd3'] },
  { id: 'elegant', label: 'Elegant', fallback: ['#14110f', '#d4af37', '#f5e6b8', '#fdf6e3', '#2a241d'] },
  { id: 'neon', label: 'Neon', fallback: ['#0b0620', '#22d3ee', '#f472b6', '#f5f3ff', '#1e1245'] },
  { id: 'bloom', label: 'Bloom', fallback: ['#fdf2f8', '#be185d', '#16a34a', '#500724', '#fbcfe8'] },
  { id: 'minimal', label: 'Minimal', fallback: ['#ffffff', '#111827', '#7c3aed', '#111827', '#f3f4f6'] },
];

const EMOJI: Record<string, string> = { Birthday: '🎂', Wedding: '💍', Anniversary: '🥂', 'Baby shower': '🍼', Corporate: '🏆', Festival: '🪔', Graduation: '🎓' };
export const emojiFor = (type: string): string => EMOJI[type] ?? '🎉';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Greedy word wrap by character budget. */
function wrap(text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

/** Small deterministic random generator so the artwork does not change on every keystroke. */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

interface CardData {
  style: StyleId;
  palette: string[];
  title: string;
  subtitle: string;
  when: string;
  where: string;
  message: string;
  emoji: string;
  seed: number;
}

function art(d: CardData): string {
  const [bg, main, accent, ink, soft] = d.palette;
  const r = rng(d.seed);
  let s = '';
  if (d.style === 'confetti') {
    s += '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>';
    for (let i = 0; i < 90; i++) {
      const x = r() * W, y = r() * H, c = [main, accent, soft, ink][i % 4], sz = 10 + r() * 26;
      s += i % 3 === 0
        ? '<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="' + (sz / 2).toFixed(0) + '" fill="' + c + '" opacity=".75"/>'
        : '<rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + sz.toFixed(0) + '" height="' + (sz * 0.45).toFixed(0) + '" rx="4" fill="' + c + '" opacity=".75" transform="rotate(' + (r() * 180).toFixed(0) + ' ' + x.toFixed(0) + ' ' + y.toFixed(0) + ')"/>';
    }
    s += '<rect x="90" y="150" width="900" height="1050" rx="60" fill="#ffffff" opacity=".93"/>';
  } else if (d.style === 'elegant') {
    s += '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>';
    s += '<rect x="50" y="50" width="980" height="1250" fill="none" stroke="' + main + '" stroke-width="4"/>';
    s += '<rect x="76" y="76" width="928" height="1198" fill="none" stroke="' + main + '" stroke-width="1.5"/>';
    for (const [x, y] of [[76, 76], [1004, 76], [76, 1274], [1004, 1274]]) s += '<circle cx="' + x + '" cy="' + y + '" r="14" fill="' + main + '"/>';
  } else if (d.style === 'neon') {
    s += '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + bg + '"/><stop offset="1" stop-color="' + soft + '"/></linearGradient>' +
      '<filter id="glow"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>';
    for (let i = 0; i < 40; i++) s += '<circle cx="' + (r() * W).toFixed(0) + '" cy="' + (r() * H).toFixed(0) + '" r="' + (2 + r() * 5).toFixed(1) + '" fill="' + (i % 2 ? main : accent) + '" opacity=".8" filter="url(#glow)"/>';
    s += '<rect x="80" y="140" width="920" height="1070" rx="40" fill="none" stroke="' + main + '" stroke-width="6" filter="url(#glow)"/>';
  } else if (d.style === 'bloom') {
    s += '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>';
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, rr = 120 + (i % 3) * 40;
        s += '<ellipse cx="' + (cx + Math.cos(a) * rr * 0.9).toFixed(0) + '" cy="' + (cy + Math.sin(a) * rr * 0.9).toFixed(0) + '" rx="90" ry="46" fill="' + (i % 2 ? main : soft) + '" opacity=".7" transform="rotate(' + ((a * 180) / Math.PI).toFixed(0) + ' ' + (cx + Math.cos(a) * rr * 0.9).toFixed(0) + ' ' + (cy + Math.sin(a) * rr * 0.9).toFixed(0) + ')"/>';
      }
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="70" fill="' + accent + '" opacity=".85"/>';
    }
    s += '<rect x="130" y="190" width="820" height="970" rx="50" fill="#ffffff" opacity=".9"/>';
  } else {
    s += '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>';
    s += '<rect x="0" y="0" width="' + W + '" height="26" fill="' + accent + '"/>';
    s += '<circle cx="' + (W - 150) + '" cy="260" r="210" fill="' + soft + '"/>';
    s += '<rect x="100" y="1180" width="220" height="10" fill="' + accent + '"/>';
  }
  return s;
}

function text(d: CardData): string {
  const [, main, accent, ink] = d.palette;
  const dark = d.style === 'elegant' || d.style === 'neon';
  const head = dark ? d.palette[2] : main;
  const body = dark ? d.palette[3] : ink;
  const serif = d.style === 'elegant' || d.style === 'bloom' ? 'Georgia, "Times New Roman", serif' : 'system-ui, "Segoe UI", Arial, sans-serif';
  const left = d.style === 'minimal';
  const x = left ? 100 : W / 2;
  const anchor = left ? 'start' : 'middle';
  const glow = d.style === 'neon' ? ' filter="url(#glow)"' : '';
  let s = '';
  s += '<text x="' + x + '" y="' + (left ? 300 : 340) + '" font-size="150" text-anchor="' + anchor + '">' + d.emoji + '</text>';
  s += '<text x="' + x + '" y="' + (left ? 430 : 450) + '" font-size="34" letter-spacing="10" fill="' + accent + '" text-anchor="' + anchor + '" font-family="' + serif + '"' + glow + '>YOU ARE INVITED</text>';
  const titleLines = wrap(d.title, left ? 16 : 17, 3);
  titleLines.forEach((ln, i) => {
    s += '<text x="' + x + '" y="' + (560 + i * 118) + '" font-size="104" font-weight="700" fill="' + head + '" text-anchor="' + anchor + '" font-family="' + serif + '"' + glow + '>' + esc(ln) + '</text>';
  });
  let y = 560 + titleLines.length * 118 + 20;
  if (d.subtitle) {
    wrap(d.subtitle, 34, 2).forEach((ln, i) => {
      s += '<text x="' + x + '" y="' + (y + i * 50) + '" font-size="40" font-style="italic" fill="' + body + '" opacity=".85" text-anchor="' + anchor + '" font-family="' + serif + '">' + esc(ln) + '</text>';
    });
    y += 50 * wrap(d.subtitle, 34, 2).length + 40;
  }
  if (d.message) {
    wrap(d.message, 38, 5).forEach((ln, i) => {
      s += '<text x="' + x + '" y="' + (y + i * 46) + '" font-size="32" fill="' + body + '" text-anchor="' + anchor + '" font-family="' + serif + '">' + esc(ln) + '</text>';
    });
    y += 46 * wrap(d.message, 38, 5).length + 30;
  }
  const foot = Math.max(y + 30, 960);
  if (d.when) s += '<text x="' + x + '" y="' + foot + '" font-size="46" font-weight="700" fill="' + head + '" text-anchor="' + anchor + '" font-family="' + serif + '"' + glow + '>' + esc(d.when) + '</text>';
  if (d.where) wrap(d.where, 36, 2).forEach((ln, i) => {
    s += '<text x="' + x + '" y="' + (foot + 62 + i * 46) + '" font-size="36" fill="' + body + '" text-anchor="' + anchor + '" font-family="' + serif + '">' + esc(ln) + '</text>';
  });
  return s;
}

export function cardSvg(d: CardData): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + art(d) + text(d) + '</svg>';
}

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
    canvas.toBlob(blob => {
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

  const def = STYLES.find(s => s.id === style) ?? STYLES[0];
  const colors = usePalette && palette && palette.length >= 5 && style !== 'elegant' && style !== 'neon' ? palette : def.fallback;
  const svg = useMemo(
    () => cardSvg({ style, palette: colors, title: title || 'Your event', subtitle, when, where, message, emoji, seed }),
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
          {STYLES.map(s => (
            <button key={s.id} role="radio" aria-checked={style === s.id} className={style === s.id ? 'chip pick active' : 'chip pick'} onClick={() => setStyle(s.id)}>{s.label}</button>
          ))}
        </div>
        <label>Title<input value={title} maxLength={60} onChange={e => setTitle(e.target.value)} /></label>
        <label>Tagline<input value={subtitle} maxLength={80} onChange={e => setSubtitle(e.target.value)} placeholder="A night to remember" /></label>
        <label>When<input value={when} maxLength={60} onChange={e => setWhen(e.target.value)} /></label>
        <label>Where<input value={where} maxLength={80} onChange={e => setWhere(e.target.value)} /></label>
        <label>Message<textarea rows={3} value={message} maxLength={220} onChange={e => setMessage(e.target.value)} placeholder="Join us for an evening of..." /></label>
        <div className="row-actions">
          <button className="btn ghost small" onClick={aiText} disabled={busy}>{busy ? 'Writing...' : 'Write message with AI'}</button>
          <label className="emoji-input">Emoji<input value={emoji} maxLength={4} onChange={e => setEmoji(e.target.value)} aria-label="Card emoji" /></label>
        </div>
        {palette && style !== 'elegant' && style !== 'neon' && (
          <label className="check-row"><input type="checkbox" checked={usePalette} onChange={e => setUsePalette(e.target.checked)} /> Use my AI palette</label>
        )}
        <div className="row-actions">
          <button className="btn ghost" onClick={() => setSeed(seed + 13)}>Shuffle artwork</button>
          <button className="btn primary" onClick={() => download(svg, event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-invitation.png', m => toast.show(m, 'error'))}>Download PNG</button>
        </div>
        {!palette && <p className="muted small-note">Tip: create a concept in the Studio tab to get a palette made for your event.</p>}
      </div>
    </section>
  );
}
