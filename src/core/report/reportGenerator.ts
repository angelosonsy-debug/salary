import { deriveCompanyName, parseDocxNetColumn } from '../parser/docxParser';
import { aggregateAmounts, sumGroupTotals } from '../aggregator/aggregator';
import type { BatchReport, CompanyReport } from '../types';
import { formatCents } from '../money';

/** Processes one uploaded file end-to-end into a CompanyReport. */
export async function generateCompanyReport(file: File): Promise<CompanyReport> {
  const start = performance.now();
  const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
  const companyName = deriveCompanyName(file.name);

  const isDocx = /\.docx$/i.test(file.name);
  if (!isDocx) {
    return {
      id,
      fileName: file.name,
      companyName,
      status: 'error',
      groups: [],
      personCount: 0,
      distinctAmountCount: 0,
      totalCents: 0n,
      totalLabel: '0.00',
      warnings: [{ type: 'UNSUPPORTED_FORMAT', message: 'صيغة الملف غير مدعومة حالياً. يدعم النظام حالياً ملفات .docx فقط.' }],
      errorMessage: 'صيغة غير مدعومة',
      processingTimeMs: performance.now() - start,
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const { entries, warnings } = await parseDocxNetColumn(buffer);
    const groups = aggregateAmounts(entries);
    const totalCents = sumGroupTotals(groups);

    const status: CompanyReport['status'] =
      entries.length === 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok';

    return {
      id,
      fileName: file.name,
      companyName,
      status,
      groups,
      personCount: entries.length,
      distinctAmountCount: groups.length,
      totalCents,
      totalLabel: formatCents(totalCents),
      warnings,
      errorMessage: entries.length === 0 ? 'لم يتم استخراج أي بيانات صالحة من هذا الملف.' : undefined,
      processingTimeMs: performance.now() - start,
    };
  } catch (err) {
    return {
      id,
      fileName: file.name,
      companyName,
      status: 'error',
      groups: [],
      personCount: 0,
      distinctAmountCount: 0,
      totalCents: 0n,
      totalLabel: '0.00',
      warnings: [],
      errorMessage: err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء تحليل الملف.',
      processingTimeMs: performance.now() - start,
    };
  }
}

/** Builds the full batch report across all processed companies. */
export function buildBatchReport(companies: CompanyReport[]): BatchReport {
  const grandTotalCents = companies.reduce((acc, c) => acc + c.totalCents, 0n);
  const totalPersonCount = companies.reduce((acc, c) => acc + c.personCount, 0);
  const totalDistinctAmounts = new Set(
    companies.flatMap((c) => c.groups.map((g) => g.amountCents.toString()))
  ).size;
  const totalProcessingTimeMs = companies.reduce((acc, c) => acc + c.processingTimeMs, 0);

  return {
    companies,
    grandTotalCents,
    grandTotalLabel: formatCents(grandTotalCents),
    totalPersonCount,
    totalDistinctAmounts,
    totalProcessingTimeMs,
    generatedAt: new Date(),
  };
}
