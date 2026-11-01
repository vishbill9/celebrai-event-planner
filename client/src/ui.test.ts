import { describe, expect, it } from 'vitest';
import { daysUntil, errorText, formatDate, money } from './ui';

describe('money', () => {
  it('groups digits the Indian way', () => {
    expect(money(60000)).toBe('60,000');
    expect(money(1234567)).toBe('12,34,567');
  });
  it('treats missing or invalid amounts as zero', () => {
    expect(money(0)).toBe('0');
    expect(money(NaN)).toBe('0');
  });
});

describe('formatDate', () => {
  it('shows a friendly fallback when there is no date', () => {
    expect(formatDate(null)).toBe('Date to be decided');
  });
  it('formats an ISO date without shifting the day', () => {
    expect(formatDate('2026-12-20')).toContain('20');
    expect(formatDate('2026-12-20')).toContain('2026');
  });
});

describe('daysUntil', () => {
  const iso = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  it('returns null without a date', () => {
    expect(daysUntil(null)).toBeNull();
  });
  it('counts whole days from today, including past dates', () => {
    expect(daysUntil(iso(0))).toBe(0);
    expect(daysUntil(iso(10))).toBe(10);
    expect(daysUntil(iso(-3))).toBe(-3);
  });
});

describe('errorText', () => {
  it('uses the message of a real Error', () => {
    expect(errorText(new Error('Nope'))).toBe('Nope');
  });
  it('never leaks unknown values', () => {
    expect(errorText({ secret: 'x' })).toBe('Something went wrong.');
  });
});
