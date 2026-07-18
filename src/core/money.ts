// ==========================================================================
// Money utility
// ==========================================================================
// All arithmetic is done on BigInt "قروش" (cents, i.e. value * 100) so that
// grouping/summing thousands of rows never introduces floating point
// rounding errors (the classic 0.1 + 0.2 problem). Parsing is tolerant of:
//   - Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩)
//   - thousands separators (comma / Arabic thousands separator)
//   - Arabic decimal separator (٫) and standard "."
//   - stray whitespace / RTL marks / currency words
// ==========================================================================

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/**
 * Attempts to parse a raw table-cell string into an integer "cents" value.
 * Returns null if the string does not represent a plausible numeric amount.
 */
export function parseAmountToCents(raw: string): bigint | null {
  if (!raw) return null;

  let s = normalizeDigits(raw)
    // strip RTL/LTR marks, non-breaking spaces, currency words
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/جنيه|EGP|LE|ج\.م|ريال|SAR/gi, '')
    .trim();

  if (s === '') return null;

  // Arabic decimal separator ٫ -> "."
  s = s.replace(/٫/g, '.');

  // remove thousands separators (comma or space between digit groups)
  s = s.replace(/,/g, '');
  s = s.replace(/\s+/g, '');

  // Reject anything that isn't a plain number after cleanup
  // (names, signatures, headers etc. will fail this check)
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;

  const negative = s.startsWith('-');
  if (negative) s = s.slice(1);

  const [intPart, fracPartRaw = ''] = s.split('.');
  const fracPart = (fracPartRaw + '00').slice(0, 2); // pad/truncate to 2 decimals

  if (intPart === '' && fracPart === '00') return null;

  try {
    const cents = BigInt(intPart || '0') * 100n + BigInt(fracPart || '0');
    return negative ? -cents : cents;
  } catch {
    return null;
  }
}

/** Formats integer cents back into a "1,234.56" style Arabic-numeral label. */
export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const intPart = abs / 100n;
  const fracPart = abs % 100n;
  const intStr = intPart.toLocaleString('en-US');
  const fracStr = fracPart.toString().padStart(2, '0');
  return `${negative ? '-' : ''}${intStr}.${fracStr}`;
}
