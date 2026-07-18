import { useCallback, useRef, useState } from 'react';

interface UploadZoneProps {
  onFilesAdded: (files: File[]) => void;
}

export function UploadZone({ onFilesAdded }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter((f) => /\.docx$/i.test(f.name));
      if (files.length > 0) onFilesAdded(files);
    },
    [onFilesAdded]
  );

  return (
    <div
      className={`upload-zone ${dragActive ? 'upload-zone--active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="upload-zone__icon">⬆</div>
      <div className="upload-zone__title">إضافة ملفات السرايا</div>
      <div className="upload-zone__hint">اسحب ملفات Word (.docx) هنا، أو اضغط للاختيار — يدعم رفع عدة ملفات معاً</div>
    </div>
  );
}
