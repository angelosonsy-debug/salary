import type { AggregatedGroup, RawAmountEntry } from '../types';
import { formatCents } from '../money';

/**
 * Groups raw amount entries by exact value, counts occurrences, and computes
 * per-group totals. Sorted descending by amount to match the report's
 * expected "الأعلى أولاً" presentation style.
 */
export function aggregateAmounts(entries: RawAmountEntry[]): AggregatedGroup[] {
  const groups = new Map<string, { amountCents: bigint; count: number }>();

  for (const entry of entries) {
    const key = entry.cents.toString();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { amountCents: entry.cents, count: 1 });
    }
  }

  const result: AggregatedGroup[] = Array.from(groups.values()).map((g) => {
    const totalCents = g.amountCents * BigInt(g.count);
    return {
      amountCents: g.amountCents,
      amountLabel: formatCents(g.amountCents),
      count: g.count,
      totalCents,
      totalLabel: formatCents(totalCents),
    };
  });

  result.sort((a, b) => (b.amountCents > a.amountCents ? 1 : b.amountCents < a.amountCents ? -1 : 0));

  return result;
}

export function sumGroupTotals(groups: AggregatedGroup[]): bigint {
  return groups.reduce((acc, g) => acc + g.totalCents, 0n);
}
