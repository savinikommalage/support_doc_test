import { EmptyState, cn } from '@/components/ui';
import type { NoteStatus, NoteSummary } from '@/lib/notes-config';

const STATUS: Record<NoteStatus, { label: string; className: string }> = {
  pending: { label: 'Waiting', className: 'bg-badge-gray text-badge-gray-fg' },
  'in-review': { label: 'In review', className: 'bg-badge-blue text-badge-blue-fg' },
  published: { label: 'Added', className: 'bg-badge-green text-badge-green-fg' },
};

const badge = 'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-body-xs font-medium';

export function NoteList({ notes }: { notes: NoteSummary[] }) {
  if (notes.length === 0) {
    return <EmptyState title="No notes yet" description="Notes you add show up here with their status." />;
  }

  return (
    <ul className="border-line-structure bg-surface-bg divide-line-structure divide-y rounded-xl border">
      {notes.map((note) => {
        const status = STATUS[note.status];
        return (
          <li key={note.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-text-primary truncate text-body-sm font-medium" title={note.id}>
                {note.title}
              </p>
              {note.submittedOn && <p className="text-text-tertiary text-body-xs">{note.submittedOn}</p>}
            </div>
            {note.reviewUrl ? (
              <a
                href={note.reviewUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(badge, status.className, 'hover:underline')}
              >
                {status.label}
              </a>
            ) : (
              <span className={cn(badge, status.className)}>{status.label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
