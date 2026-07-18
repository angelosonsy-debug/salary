import mammoth from 'mammoth';
import type { ParseWarning, RawAmountEntry } from '../types';
import { parseAmountToCents } from '../money';

// Column header aliases that all mean "الصافي" (net amount).
// Kept flexible because real-world sheets vary slightly in wording/spacing.
const NET_COLUMN_ALIASES = ['الصافي', 'صافى', 'الصافى', 'صافي المرتب', 'الصافي النهائي'];

export interface DocxParseResult {
  entries: RawAmountEntry[];
  warnings: ParseWarning[];
}

function cellText(cell: Element): string {
  return (cell.textContent || '').replace(/\s+/g, ' ').trim();
}

function looksLikeTotalsRow(rowText: string): boolean {
  return /إجمالي|الاجمالي|المجموع|اجمالى/.test(rowText);
}

/**
 * Parses a .docx ArrayBuffer, locates the table containing a "الصافي"
 * column, and extracts every numeric value in that column only.
 */
export async function parseDocxNetColumn(buffer: ArrayBuffer): Promise<DocxParseResult> {
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    { includeDefaultStyleMap: true }
  );
  return extractNetColumnFromHtml(html);
}

/**
 * Pure HTML-parsing core, independent of mammoth's docx->html conversion.
 * Kept separate so the extraction logic can be unit-tested directly with
 * hand-written HTML fixtures, without needing to generate real .docx files.
 */
export function extractNetColumnFromHtml(html: string): DocxParseResult {
  const warnings: ParseWarning[] = [];
  const entries: RawAmountEntry[] = [];

  if (!html || html.trim() === '') {
    warnings.push({ type: 'EMPTY_FILE', message: 'الملف فارغ أو لا يحتوي على محتوى قابل للقراءة.' });
    return { entries, warnings };
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = Array.from(doc.querySelectorAll('table'));

  if (tables.length === 0) {
    warnings.push({ type: 'NO_TABLE_FOUND', message: 'لم يتم العثور على أي جدول داخل الملف.' });
    return { entries, warnings };
  }

  // Search every table for one whose header row contains a "الصافي" alias.
  let targetTable: Element | null = null;
  let netColumnIndex = -1;

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) continue;

    // Header may span the first 1-2 rows in some templates; scan first 2.
    for (const headerRow of rows.slice(0, 2)) {
      const cells = Array.from(headerRow.querySelectorAll('th,td'));
      const idx = cells.findIndex((c) => {
        const t = cellText(c);
        return NET_COLUMN_ALIASES.some((alias) => t.includes(alias));
      });
      if (idx !== -1) {
        targetTable = table;
        netColumnIndex = idx;
        break;
      }
    }
    if (targetTable) break;
  }

  if (!targetTable || netColumnIndex === -1) {
    warnings.push({
      type: 'COLUMN_NOT_FOUND',
      message: 'لم يتم العثور على عمود "الصافي" في أي جدول بالملف.',
    });
    return { entries, warnings };
  }

  const rows = Array.from(targetTable.querySelectorAll('tr'));
  let rowIndex = 0;

  for (const row of rows) {
    rowIndex += 1;
    const cells = Array.from(row.querySelectorAll('td,th'));
    if (cells.length === 0) continue;

    const rowText = cellText(row);

    // Skip header row(s) themselves
    if (NET_COLUMN_ALIASES.some((alias) => rowText.includes(alias)) && rowIndex <= 2) continue;

    // Skip totals row at the bottom of the sheet — never fold it into data
    if (looksLikeTotalsRow(rowText)) continue;

    const cell = cells[netColumnIndex];
    if (!cell) {
      warnings.push({ type: 'MISSING_ROW_VALUE', message: `الصف رقم ${rowIndex} لا يحتوي على قيمة في عمود الصافي.`, rowIndex });
      continue;
    }

    const raw = cellText(cell);
    if (raw === '') {
      // Skip fully empty trailing rows silently — common in Word tables
      continue;
    }

    const cents = parseAmountToCents(raw);
    if (cents === null) {
      warnings.push({
        type: 'NON_NUMERIC_VALUE',
        message: `تم تجاهل قيمة غير رقمية في الصف رقم ${rowIndex}: "${raw}"`,
        rowIndex,
        rawValue: raw,
      });
      continue;
    }

    entries.push({ cents, rowIndex });
  }

  if (entries.length === 0 && warnings.length === 0) {
    warnings.push({ type: 'EMPTY_FILE', message: 'لم يتم العثور على أي قيم صالحة في عمود الصافي.' });
  }

  return { entries, warnings };
}

/** Derives a company/سرية display name from an uploaded file name. */
export function deriveCompanyName(fileName: string): string {
  return fileName.replace(/\.(docx|doc)$/i, '').trim();
}
