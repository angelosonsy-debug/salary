import { useCallback, useMemo, useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { FileQueueList } from './components/FileQueueList';
import { CompanyReportCard } from './components/CompanyReportCard';
import { SummaryPanel } from './components/SummaryPanel';
import { ProgressBar } from './components/ProgressBar';
import { useTheme } from './components/ThemeContext';
import { generateCompanyReport, buildBatchReport } from './core/report/reportGenerator';
import type { BatchReport, CompanyReport, UploadedFileItem } from './core/types';
import './styles/app.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [queue, setQueue] = useState<UploadedFileItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batch, setBatch] = useState<BatchReport | null>(null);

  const handleFilesAdded = useCallback((files: File[]) => {
    setBatch(null);
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: 'pending' as const,
      })),
    ]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (queue.length === 0) return;
    setIsAnalyzing(true);
    setProgress(0);

    const results: CompanyReport[] = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'processing' } : q)));
      const report = await generateCompanyReport(item.file);
      results.push(report);
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: report.status === 'error' ? 'error' : 'done' } : q))
      );
      setProgress(i + 1);
    }

    setBatch(buildBatchReport(results));
    setIsAnalyzing(false);
  }, [queue]);

  const handleReset = useCallback(() => {
    setQueue([]);
    setBatch(null);
    setProgress(0);
  }, []);

  const pendingCount = useMemo(() => queue.filter((q) => q.status === 'pending').length, [queue]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__brand-mark">⭐</span>
          <div>
            <h1>مجمّع مرتبات السرايا</h1>
            <p>Military Salary Aggregator</p>
          </div>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="تبديل المظهر">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="app__main">
        <section className="panel">
          <UploadZone onFilesAdded={handleFilesAdded} />
          <FileQueueList items={queue} onRemove={handleRemove} />

          {queue.length > 0 && !isAnalyzing && (
            <div className="app__actions">
              <button className="btn btn--primary" onClick={handleAnalyze} disabled={pendingCount === 0}>
                تحليل الملفات ({queue.length})
              </button>
              <button className="btn btn--ghost" onClick={handleReset}>
                إعادة تعيين
              </button>
            </div>
          )}

          {isAnalyzing && <ProgressBar current={progress} total={queue.length} />}
        </section>

        {batch && (
          <>
            <section className="panel">
              <h2 className="section-title">تقارير السرايا</h2>
              <div className="reports-grid">
                {batch.companies.map((c) => (
                  <CompanyReportCard key={c.id} report={c} />
                ))}
              </div>
            </section>

            <section className="panel">
              <SummaryPanel batch={batch} />
            </section>
          </>
        )}
      </main>

      <footer className="app__footer">
        إجمالي زمن التحليل: {batch ? Math.round(batch.totalProcessingTimeMs) : 0} مللي ثانية
      </footer>
    </div>
  );
}
