import { describe, it, expect } from 'vitest';
import { aggregateAmounts, sumGroupTotals } from '../aggregator/aggregator';
import type { RawAmountEntry } from '../types';

function entry(cents: bigint, rowIndex = 0): RawAmountEntry {
  return { cents, rowIndex };
}

describe('aggregateAmounts', () => {
  it('groups identical amounts and counts occurrences', () => {
    const entries = [entry(33137n), entry(33137n), entry(33137n), entry(31795n), entry(31795n), entry(19558n)];
    const groups = aggregateAmounts(entries);

    expect(groups).toHaveLength(3);

    const g1 = groups.find((g) => g.amountLabel === '331.37')!;
    expect(g1.count).toBe(3);
    expect(g1.totalLabel).toBe('994.11');

    const g2 = groups.find((g) => g.amountLabel === '317.95')!;
    expect(g2.count).toBe(2);
    expect(g2.totalLabel).toBe('635.90');

    const g3 = groups.find((g) => g.amountLabel === '195.58')!;
    expect(g3.count).toBe(1);
    expect(g3.totalLabel).toBe('195.58');
  });

  it('sorts groups descending by amount', () => {
    const entries = [entry(10000n), entry(50000n), entry(30000n)];
    const groups = aggregateAmounts(entries);
    expect(groups.map((g) => g.amountLabel)).toEqual(['500.00', '300.00', '100.00']);
  });

  it('sums total across all groups without rounding drift', () => {
    const entries = Array.from({ length: 1000 }, () => entry(3137n)); // 31.37 each
    const groups = aggregateAmounts(entries);
    const total = sumGroupTotals(groups);
    expect(total).toBe(3137000n); // exactly 31,370.00
  });

  it('returns an empty array for no entries', () => {
    expect(aggregateAmounts([])).toEqual([]);
  });
});
