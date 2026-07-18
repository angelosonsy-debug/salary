import { describe, it, expect } from 'vitest';
import { extractNetColumnFromHtml, deriveCompanyName } from '../parser/docxParser';

function buildTableHtml(rows: string[][]): string {
  const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<table>${rowsHtml}</table>`;
}

describe('extractNetColumnFromHtml', () => {
  it('extracts only the الصافي column, ignoring names and signatures', () => {
    const html = buildTableHtml([
      ['م', 'الاسم', 'الرتبة', 'الصافي', 'توقيع'],
      ['1', 'محمد أحمد', 'جندي', '331.37', ''],
      ['2', 'علي حسن', 'عريف', '331.37', ''],
      ['3', 'سيد كريم', 'جندي', '317.95', ''],
    ]);

    const { entries, warnings } = extractNetColumnFromHtml(html);
    expect(entries.map((e) => e.cents)).toEqual([33137n, 33137n, 31795n]);
    expect(warnings).toHaveLength(0);
  });

  it('ignores the totals row at the bottom of the sheet', () => {
    const html = buildTableHtml([
      ['الاسم', 'الصافي'],
      ['فرد 1', '100.00'],
      ['فرد 2', '200.00'],
      ['الإجمالي', '300.00'],
    ]);

    const { entries } = extractNetColumnFromHtml(html);
    expect(entries.map((e) => e.cents)).toEqual([10000n, 20000n]);
  });

  it('reports a warning when the الصافي column cannot be found', () => {
    const html = buildTableHtml([
      ['الاسم', 'الرتبة'],
      ['فرد 1', 'جندي'],
    ]);

    const { entries, warnings } = extractNetColumnFromHtml(html);
    expect(entries).toHaveLength(0);
    expect(warnings[0].type).toBe('COLUMN_NOT_FOUND');
  });

  it('reports a warning and skips non-numeric values, keeping valid ones', () => {
    const html = buildTableHtml([
      ['الاسم', 'الصافي'],
      ['فرد 1', '150.50'],
      ['فرد 2', 'منقول'],
      ['فرد 3', '200.00'],
    ]);

    const { entries, warnings } = extractNetColumnFromHtml(html);
    expect(entries.map((e) => e.cents)).toEqual([15050n, 20000n]);
    expect(warnings.some((w) => w.type === 'NON_NUMERIC_VALUE')).toBe(true);
  });

  it('reports EMPTY_FILE for blank html', () => {
    const { warnings } = extractNetColumnFromHtml('');
    expect(warnings[0].type).toBe('EMPTY_FILE');
  });

  it('reports NO_TABLE_FOUND when there is no table at all', () => {
    const { warnings } = extractNetColumnFromHtml('<p>لا يوجد جدول هنا</p>');
    expect(warnings[0].type).toBe('NO_TABLE_FOUND');
  });
});

describe('deriveCompanyName', () => {
  it('strips the .docx extension', () => {
    expect(deriveCompanyName('السرية الأولى.docx')).toBe('السرية الأولى');
  });

  it('strips the .doc extension', () => {
    expect(deriveCompanyName('المستجدين.doc')).toBe('المستجدين');
  });
});
