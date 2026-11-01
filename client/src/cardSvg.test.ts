import { describe, expect, it } from 'vitest';
import { cardSvg, emojiFor, esc, rng, STYLES, wrap, type CardData } from './cardSvg';

const base = (over: Partial<CardData> = {}): CardData => ({
  style: 'confetti',
  palette: STYLES[0].fallback,
  title: 'Asha 30th Birthday',
  subtitle: 'A night to remember',
  when: 'Sat, 20 Dec 2026',
  where: 'Rooftop cafe, Bengaluru',
  message: 'Join us for an evening of music and cake.',
  emoji: '🎂',
  seed: 7,
  ...over,
});

describe('esc', () => {
  it('escapes characters that could break out of SVG markup', () => {
    expect(esc('<script>"a" & b</script>')).toBe('&lt;script&gt;&quot;a&quot; &amp; b&lt;/script&gt;');
  });
});

describe('wrap', () => {
  it('breaks on word boundaries within the character budget', () => {
    expect(wrap('one two three four', 8, 5)).toEqual(['one two', 'three', 'four']);
  });
  it('limits the number of lines', () => {
    expect(wrap('a b c d e f', 1, 2)).toEqual(['a', 'b']);
  });
  it('returns nothing for blank text', () => {
    expect(wrap('   ', 10, 3)).toEqual([]);
  });
});

describe('rng', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = rng(7);
    const b = rng(7);
    for (let i = 0; i < 20; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('emojiFor', () => {
  it('maps known event types and falls back to a party popper', () => {
    expect(emojiFor('Wedding')).toBe('💍');
    expect(emojiFor('Something else')).toBe('🎉');
  });
});

describe('cardSvg', () => {
  it.each(STYLES.map((s) => s.id))('renders a complete SVG for the %s style', (style) => {
    const svg = cardSvg(base({ style, palette: STYLES.find((s) => s.id === style)!.fallback }));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('YOU ARE INVITED');
    expect(svg).toContain('Asha');
  });

  it('never lets user text inject markup', () => {
    const svg = cardSvg(base({ title: '<img src=x onerror=alert(1)>', message: '"><script>x</script>' }));
    expect(svg).not.toContain('<img');
    expect(svg).not.toContain('<script>');
  });

  it('produces identical artwork for the same seed and different artwork for another', () => {
    expect(cardSvg(base())).toBe(cardSvg(base()));
    expect(cardSvg(base({ seed: 20 }))).not.toBe(cardSvg(base()));
  });
});
