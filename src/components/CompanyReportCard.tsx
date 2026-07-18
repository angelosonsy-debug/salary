import { useState } from 'react';
import type { CompanyReport } from '../core/types';

interface CompanyReportCardProps {
  report: CompanyReport;
}

export function CompanyReportCard({ report }: CompanyReportCardProps) {
  const [view, setView] = useState<'table' | 'formula'>('table');
  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <div className={`company-card company-card--${report.status}`}>
      <div className="company-card__header">
        <div>
          <h3 className="company-card__title">{report.companyName}</h3>
          <span className="company-card__filename">{report.fileName}</span>
        </div>
        <div className="company-card__stats">
          <span>عدد الأفراد: <b>{report.personCount}</b></span>
          <span>مبالغ مختلفة: <b>{report.distinctAmountCount}</b></span>
          <span>الزمن: <b>{Math.round(report.processingTimeMs)} مللي ثانية</b></span>
        </div>
      </div>

      {report.status === 'error' ? (
        <div className="company-card__error">
          ⚠ {report.errorMessage || 'تعذر تحليل هذا الملف.'}
        </div>
      ) : (
        <>
          <div className="company-card__toggle">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              عرض الجدول
            </button>
            <button className={view === 'formula' ? 'active' : ''} onClick={() => setView('formula')}>
              الصيغة المحاسبية
            </button>
          </div>

          {view === 'table' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>الصافي</th>
                  <th>العدد</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {report.groups.map((g) => (
                  <tr key={g.amountLabel}>
                    <td className="mono-num">{g.amountLabel}</td>
                    <td className="mono-num">{g.count}</td>
                    <td className="mono-num">{g.totalLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="formula-view mono-num">
              {report.groups.map((g) => (
                <div key={g.amountLabel} className="formula-view__line">
                  {g.amountLabel} × {g.count} = {g.totalLabel}
                </div>
              ))}
            </div>
          )}

          <div className="company-card__total">
            إجمالي السرية = <span className="mono-num gold">{report.totalLabel}</span>
          </div>
        </>
      )}

      {report.warnings.length > 0 && (
        <div className="company-card__warnings">
          <button className="company-card__warnings-toggle" onClick={() => setShowWarnings((s) => !s)}>
            {showWarnings ? 'إخفاء' : 'عرض'} التحذيرات ({report.warnings.length})
          </button>
          {showWarnings && (
            <ul>
              {report.warnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
