import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  HeadingLevel,
} from 'docx';
import type { BatchReport, CompanyReport } from '../types';

const NOW_STAMP = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Excel (.xlsx)
// ---------------------------------------------------------------------------
export function exportToExcel(batch: BatchReport) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = [
    ['اسم السرية', 'عدد الأفراد', 'عدد المبالغ المختلفة', 'إجمالي السرية'],
    ...batch.companies.map((c) => [c.companyName, c.personCount, c.distinctAmountCount, c.totalLabel]),
    [],
    ['الإجمالي العام', batch.totalPersonCount, batch.totalDistinctAmounts, batch.grandTotalLabel],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'ملخص السرايا');

  // One sheet per company with the detailed breakdown
  for (const c of batch.companies) {
    const rows = [
      ['الصافي', 'العدد', 'الإجمالي'],
      ...c.groups.map((g) => [g.amountLabel, g.count, g.totalLabel]),
      [],
      ['إجمالي السرية', '', c.totalLabel],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const safeName = c.companyName.slice(0, 28) || c.fileName.slice(0, 28);
    XLSX.utils.book_append_sheet(wb, sheet, safeName);
  }

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([out], { type: 'application/octet-stream' }), `تقرير-المرتبات-${NOW_STAMP()}.xlsx`);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
export function exportToCsv(batch: BatchReport) {
  const lines: string[] = [];
  lines.push('اسم السرية,الصافي,العدد,الإجمالي');
  for (const c of batch.companies) {
    for (const g of c.groups) {
      lines.push(`${csvEscape(c.companyName)},${g.amountLabel},${g.count},${g.totalLabel}`);
    }
    lines.push(`${csvEscape(c.companyName)},إجمالي السرية,,${c.totalLabel}`);
  }
  lines.push(`الإجمالي العام,,${batch.totalPersonCount},${batch.grandTotalLabel}`);

  const csvContent = '\uFEFF' + lines.join('\n'); // BOM for correct Arabic display in Excel
  saveAs(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `تقرير-المرتبات-${NOW_STAMP()}.csv`);
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export function exportToPdf(batch: BatchReport) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt' });

  doc.setFontSize(16);
  doc.text('تقرير مرتبات السرايا', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  let y = 70;

  for (const c of batch.companies) {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(12);
    doc.text(`${c.companyName}  (${c.fileName})`, 40, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['الصافي', 'العدد', 'الإجمالي']],
      body: c.groups.map((g) => [g.amountLabel, String(g.count), g.totalLabel]),
      foot: [['', 'إجمالي السرية', c.totalLabel]],
      styles: { font: 'helvetica', fontSize: 9, halign: 'center' },
      headStyles: { fillColor: [40, 62, 81] },
      margin: { left: 40, right: 40 },
    });

    // @ts-expect-error - jspdf-autotable augments doc at runtime
    y = doc.lastAutoTable.finalY + 20;
  }

  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(13);
  doc.text(
    `الإجمالي العام لجميع السرايا: ${batch.grandTotalLabel}   |   إجمالي الأفراد: ${batch.totalPersonCount}`,
    40,
    y + 20
  );

  doc.save(`تقرير-المرتبات-${NOW_STAMP()}.pdf`);
}

// ---------------------------------------------------------------------------
// Word (.docx)
// ---------------------------------------------------------------------------
export async function exportToWord(batch: BatchReport) {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      text: 'تقرير مرتبات السرايا',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      bidirectional: true,
    })
  );

  for (const c of batch.companies) {
    children.push(companyHeading(c));
    children.push(companyTable(c));
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        children: [new TextRun({ text: `إجمالي السرية = ${c.totalLabel}`, bold: true })],
      })
    );
    children.push(new Paragraph({ text: '' }));
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({ text: `الإجمالي العام لجميع السرايا = ${batch.grandTotalLabel}`, bold: true, size: 28 }),
      ],
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `تقرير-المرتبات-${NOW_STAMP()}.docx`);
}

function companyHeading(c: CompanyReport) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    children: [new TextRun({ text: `${c.companyName} (${c.fileName})` })],
  });
}

function companyTable(c: CompanyReport): Table {
  const headerRow = new TableRow({
    children: ['الصافي', 'العدد', 'الإجمالي'].map(
      (t) =>
        new TableCell({
          children: [new Paragraph({ text: t, alignment: AlignmentType.CENTER, bidirectional: true })],
        })
    ),
  });

  const dataRows = c.groups.map(
    (g) =>
      new TableRow({
        children: [g.amountLabel, String(g.count), g.totalLabel].map(
          (t) =>
            new TableCell({
              children: [new Paragraph({ text: t, alignment: AlignmentType.CENTER, bidirectional: true })],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}
