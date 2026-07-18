import type { BatchReport } from '../core/types';
import { exportToCsv, exportToExcel, exportToPdf, exportToWord } from '../core/export/exportService';

interface SummaryPanelProps {
  batch: BatchReport;
}

export function SummaryPanel({ batch }: SummaryPanelProps) {
  return (
    <div className="summary-panel">
      <div className="summary-panel__head">
        <h2>جدول السرايا</h2>
        <div className="summary-panel__exports">
          <button onClick={() => exportToExcel(batch)}>تصدير Excel</button>
          <button onClick={() => exportToPdf(batch)}>تصدير PDF</button>
          <button onClick={() => exportToWord(batch)}>تصدير Word</button>
          <button onClick={() => exportToCsv(batch)}>تصدير CSV</button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>اسم السرية</th>
            <th>عدد الأفراد</th>
            <th>إجمالي السرية</th>
          </tr>
        </thead>
        <tbody>
          {batch.companies.map((c) => (
            <tr key={c.id}>
              <td>{c.companyName}</td>
              <td className="mono-num">{c.personCount}</td>
              <td className="mono-num">{c.totalLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary-panel__grand-total">
        <div>
          إجمالي الأفراد: <span className="mono-num">{batch.totalPersonCount}</span>
        </div>
        <div>
          عدد المبالغ المختلفة: <span className="mono-num">{batch.totalDistinctAmounts}</span>
        </div>
        <div className="summary-panel__grand-total-amount">
          الإجمالي العام لجميع السرايا = <span className="mono-num gold">{batch.grandTotalLabel}</span>
        </div>
      </div>
    </div>
  );
}
