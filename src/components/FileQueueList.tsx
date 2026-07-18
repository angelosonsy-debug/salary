import type { UploadedFileItem } from '../core/types';

interface FileQueueListProps {
  items: UploadedFileItem[];
  onRemove: (id: string) => void;
}

const STATUS_ICON: Record<UploadedFileItem['status'], string> = {
  pending: '○',
  processing: '◐',
  done: '✔',
  error: '✕',
};

export function FileQueueList({ items, onRemove }: FileQueueListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="file-queue">
      {items.map((item) => (
        <li key={item.id} className={`file-queue__item file-queue__item--${item.status}`}>
          <span className="file-queue__status">{STATUS_ICON[item.status]}</span>
          <span className="file-queue__name">{item.file.name}</span>
          {item.status === 'pending' && (
            <button
              className="file-queue__remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              aria-label="إزالة الملف"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
