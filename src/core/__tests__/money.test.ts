import { describe, it, expect } from 'vitest';
import { parseAmountToCents, formatCents } from '../money';

describe('parseAmountToCents', () => {
  it('parses a plain decimal amount', () => {
    expect(parseAmountToCents('331.37')).toBe(33137n);
  });

  it('parses amounts with thousands separators', () => {
    expect(parseAmountToCents('2,982.33')).toBe(298233n);
  });

  it('parses Arabic-Indic digits', () => {
    expect(parseAmountToCents('٣٣١.٣٧')).toBe(33137n);
  });

  it('parses Arabic decimal separator', () => {
    expect(parseAmountToCents('331٫37')).toBe(33137n);
  });

  it('strips currency words', () => {
    expect(parseAmountToCents('331.37 جنيه')).toBe(33137n);
  });

  it('returns null for names and non-numeric text', () => {
    expect(parseAmountToCents('محمد أحمد')).toBeNull();
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('   ')).toBeNull();
  });

  it('handles integer-only amounts', () => {
    expect(parseAmountToCents('500')).toBe(50000n);
  });

  it('never loses precision on repeated additions (no float drift)', () => {
    let total = 0n;
    for (let i = 0; i < 10000; i++) {
      total += parseAmountToCents('0.01')!;
    }
    expect(formatCents(total)).toBe('100.00');
  });
});

describe('formatCents', () => {
  it('formats with thousands separators', () => {
    expect(formatCents(298233n)).toBe('2,982.33');
  });

  it('formats negative values', () => {
    expect(formatCents(-5050n)).toBe('-50.50');
  });

  it('pads single-digit cents', () => {
    expect(formatCents(100005n)).toBe('1,000.05');
  });
});
