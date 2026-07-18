// ==========================================================================
// Core domain types — shared across Parser, Aggregator, Report, and Export
// ==========================================================================

/** A single raw amount extracted from the "الصافي" column of one file. */
export interface RawAmountEntry {
  /** value expressed in integer قروش (cents) to avoid float rounding errors */
  cents: bigint;
  rowIndex: number;
}

/** One aggregated group of identical amounts, e.g. 331.37 × 3 */
export interface AggregatedGroup {
  amountCents: bigint;
  amountLabel: string; // formatted e.g. "331.37"
  count: number;
  totalCents: bigint;
  totalLabel: string;
}

export type ParseWarningType =
  | 'NON_NUMERIC_VALUE'
  | 'MISSING_ROW_VALUE'
  | 'COLUMN_NOT_FOUND'
  | 'EMPTY_FILE'
  | 'NO_TABLE_FOUND'
  | 'UNSUPPORTED_FORMAT';

export interface ParseWarning {
  type: ParseWarningType;
  message: string;
  rowIndex?: number;
  rawValue?: string;
}

/** Result of parsing+aggregating a single سرية (company) file. */
export interface CompanyReport {
  id: string;
  fileName: string;
  companyName: string; // derived from file name without extension
  status: 'ok' | 'error' | 'warning';
  groups: AggregatedGroup[];
  personCount: number;
  distinctAmountCount: number;
  totalCents: bigint;
  totalLabel: string;
  warnings: ParseWarning[];
  errorMessage?: string;
  processingTimeMs: number;
}

/** Full batch result across all uploaded files. */
export interface BatchReport {
  companies: CompanyReport[];
  grandTotalCents: bigint;
  grandTotalLabel: string;
  totalPersonCount: number;
  totalDistinctAmounts: number;
  totalProcessingTimeMs: number;
  generatedAt: Date;
}

export interface UploadedFileItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
}
