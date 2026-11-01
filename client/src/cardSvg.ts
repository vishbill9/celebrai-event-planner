// Pure SVG builders for the invitation card. No React or DOM needed, so they are easy to test.

export const W = 1080;
export const H = 1350;

export type StyleId = 'confetti' | 'elegant' | 'neon' | 'bloom' | 'minimal';

export const STYLES: { id: StyleId; label: string; fallback: string[] }[] = [
  { id: 'confetti', label: 'Confetti', fallback: ['#fff1f2', '#e11d48', '#f59e0b', '#3b0a1a', '#fecdd3'] },
  { id: 'elegant', label: 'Elegant', fallback: ['#14110f', '#d4af37', '#f5e6b8', '#fdf6e3', '#2a241d'] },
  { id: 'neon', label: 'Neon', fallback: ['#0b0620', '#22d3ee', '#f472b6', '#f5f3ff', '#1e1245'] },
  { id: 'bloom', label: 'Bloom', fallback: ['#fdf2f8', '#be185d', '#16a34a', '#500724', '#fbcfe8'] },
  { id: 'minimal', label: 'Minimal', fallback: ['#ffffff', '#111827', '#7c3aed', '#111827', '#f3f4f6'] },
];

export interface CardData {
  style: StyleId;
  /** Five colours: background, main, accent, ink, soft. */
  palette: string[];
  title: string;
  subtitle: string;
  when: string;
  where: string;
  message: string;
  emoji: string;
  seed: number;
}

const EMOJI: Record<string, string> = {
  Birthday: '🎂',
  Wedding: '💍',
  Anniversary: '🥂',
  'Baby shower': '🍼',
  Corporate: '🏆',
  Festival: '🪔',
  Graduation: '🎓',
};
export const emojiFor = (type: string): string => EMOJI[type] ?? '🎉';

/** Escape text so it is safe inside an SVG element. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Greedy word wrap by character budget. */
export function wrap(text: string, max: number, maxLines: number): string[] {
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
export function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const n0 = (n: number): string => n.toFixed(0);
const background = (fill: string): string => `<rect width="${W}" height="${H}" fill="${fill}"/>`;

type Art = (palette: string[], r: () => number) => string;

const confettiArt: Art = ([bg, main, accent, ink, soft], r) => {
  let s = background(bg);
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    const y = r() * H;
    const color = [main, accent, soft, ink][i % 4];
    const size = 10 + r() * 26;
    s +=
      i % 3 === 0
        ? `<circle cx="${n0(x)}" cy="${n0(y)}" r="${n0(size / 2)}" fill="${color}" opacity=".75"/>`
        : `<rect x="${n0(x)}" y="${n0(y)}" width="${n0(size)}" height="${n0(size * 0.45)}" rx="4" fill="${color}" ` +
          `opacity=".75" transform="rotate(${n0(r() * 180)} ${n0(x)} ${n0(y)})"/>`;
  }
  return s + `<rect x="90" y="150" width="900" height="1050" rx="60" fill="#ffffff" opacity=".93"/>`;
};

const elegantArt: Art = ([bg, main]) => {
  const corners = [
    [76, 76],
    [1004, 76],
    [76, 1274],
    [1004, 1274],
  ];
  return (
    background(bg) +
    `<rect x="50" y="50" width="980" height="1250" fill="none" stroke="${main}" stroke-width="4"/>` +
    `<rect x="76" y="76" width="928" height="1198" fill="none" stroke="${main}" stroke-width="1.5"/>` +
    corners.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${main}"/>`).join('')
  );
};

const neonArt: Art = ([bg, main, accent, , soft], r) => {
  let s =
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/>` +
    `<stop offset="1" stop-color="${soft}"/></linearGradient>` +
    `<filter id="glow"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/>` +
    `<feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#g)"/>`;
  for (let i = 0; i < 40; i++) {
    s +=
      `<circle cx="${n0(r() * W)}" cy="${n0(r() * H)}" r="${(2 + r() * 5).toFixed(1)}" ` +
      `fill="${i % 2 ? main : accent}" opacity=".8" filter="url(#glow)"/>`;
  }
  return (
    s +
    `<rect x="80" y="140" width="920" height="1070" rx="40" fill="none" stroke="${main}" stroke-width="6" filter="url(#glow)"/>`
  );
};

const bloomArt: Art = ([bg, main, accent, , soft]) => {
  let s = background(bg);
  for (const [cx, cy] of [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
  ]) {
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const radius = 120 + (i % 3) * 40;
      const x = n0(cx + Math.cos(angle) * radius * 0.9);
      const y = n0(cy + Math.sin(angle) * radius * 0.9);
      s +=
        `<ellipse cx="${x}" cy="${y}" rx="90" ry="46" fill="${i % 2 ? main : soft}" opacity=".7" ` +
        `transform="rotate(${n0((angle * 180) / Math.PI)} ${x} ${y})"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="70" fill="${accent}" opacity=".85"/>`;
  }
  return s + `<rect x="130" y="190" width="820" height="970" rx="50" fill="#ffffff" opacity=".9"/>`;
};

const minimalArt: Art = ([bg, , accent, , soft]) =>
  background(bg) +
  `<rect x="0" y="0" width="${W}" height="26" fill="${accent}"/>` +
  `<circle cx="${W - 150}" cy="260" r="210" fill="${soft}"/>` +
  `<rect x="100" y="1180" width="220" height="10" fill="${accent}"/>`;

const ART: Record<StyleId, Art> = {
  confetti: confettiArt,
  elegant: elegantArt,
  neon: neonArt,
  bloom: bloomArt,
  minimal: minimalArt,
};

/** Background artwork for the chosen style. */
export const art = (d: CardData): string => ART[d.style](d.palette, rng(d.seed));

/** All text on the card: emoji, heading, title, tagline, message, date and place. */
export function text(d: CardData): string {
  const accent = d.palette[2];
  const ink = d.palette[3];
  const dark = d.style === 'elegant' || d.style === 'neon';
  const head = dark ? d.palette[2] : ink;
  const body = dark ? d.palette[3] : ink;
  const font =
    d.style === 'elegant' || d.style === 'bloom'
      ? "Georgia, 'Times New Roman', serif"
      : "system-ui, 'Segoe UI', Arial, sans-serif";
  const left = d.style === 'minimal';
  const x = left ? 100 : W / 2;
  const anchor = `text-anchor="${left ? 'start' : 'middle'}"`;
  const glow = d.style === 'neon' ? ' filter="url(#glow)"' : '';

  // Headings get the neon glow; body copy does not.
  const line = (y: number, attrs: string, content: string): string =>
    `<text x="${x}" y="${y}" ${attrs} ${anchor} font-family="${font}"${glow}>${content}</text>`;
  const plain = (y: number, attrs: string, content: string): string =>
    `<text x="${x}" y="${y}" ${attrs} ${anchor} font-family="${font}">${content}</text>`;

  let s = `<text x="${x}" y="${left ? 300 : 340}" font-size="150" ${anchor}>${d.emoji}</text>`;
  s += line(left ? 430 : 450, `font-size="34" letter-spacing="10" fill="${accent}"`, 'YOU ARE INVITED');

  const titleLines = wrap(d.title, left ? 16 : 17, 3);
  titleLines.forEach((ln, i) => {
    s += line(560 + i * 118, `font-size="104" font-weight="700" fill="${head}"`, esc(ln));
  });

  let y = 560 + titleLines.length * 118 + 20;
  if (d.subtitle) {
    const sub = wrap(d.subtitle, 34, 2);
    sub.forEach((ln, i) => {
      s += plain(y + i * 50, `font-size="40" font-style="italic" fill="${body}" opacity=".85"`, esc(ln));
    });
    y += 50 * sub.length + 40;
  }
  if (d.message) {
    const msg = wrap(d.message, 38, 5);
    msg.forEach((ln, i) => {
      s += plain(y + i * 46, `font-size="32" fill="${body}"`, esc(ln));
    });
    y += 46 * msg.length + 30;
  }

  const foot = Math.max(y + 30, 960);
  if (d.when) s += line(foot, `font-size="46" font-weight="700" fill="${head}"`, esc(d.when));
  if (d.where) {
    wrap(d.where, 36, 2).forEach((ln, i) => {
      s += plain(foot + 62 + i * 46, `font-size="36" fill="${body}"`, esc(ln));
    });
  }
  return s;
}

export function cardSvg(d: CardData): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${art(d)}${text(d)}</svg>`;
}
