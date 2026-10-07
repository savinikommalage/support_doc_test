'use client';

import { useEffect, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, IconButton, Input, cn } from '@/components/ui';
import { IconFile, IconUpload, IconX } from '@/components/layout/icons';
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, NOTE_KINDS } from '@/lib/notes-config';

type SubmitState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

const AUTHOR_KEY = 'support-docs.author';

const textareaClass =
  'w-full rounded-lg border px-3 py-2.5 text-body-sm outline-none transition-colors bg-surface-bg text-text-primary placeholder:text-text-tertiary border-line-structure focus:border-line-brand-soft focus:ring-line-brand-soft focus:ring-1';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NoteForm({ page }: { page?: string }) {
  const router = useRouter();
  const [author, setAuthor] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  useEffect(() => {
    try {
      setAuthor(localStorage.getItem(AUTHOR_KEY) ?? '');
    } catch {
      // storage can be blocked, the field just starts empty
    }
  }, []);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const tooLarge = totalBytes > MAX_UPLOAD_BYTES;

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setFiles((current) => [...current, ...Array.from(list)]);
    setState({ kind: 'idle' });
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    for (const file of files) data.append('files', file);

    setState({ kind: 'saving' });
    try {
      const response = await fetch('/api/ingest', { method: 'POST', body: data });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setState({ kind: 'error', message: body?.error ?? `Saving failed (${response.status}).` });
        return;
      }
      try {
        localStorage.setItem(AUTHOR_KEY, author);
      } catch {
        // remembering the name is a convenience only
      }
      form.reset();
      setFiles([]);
      setState({ kind: 'saved' });
      router.refresh();
    } catch {
      setState({ kind: 'error', message: 'Could not reach the server. Check your connection and try again.' });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {page && (
        <div className="bg-surface-brand-soft text-text-brand flex items-center gap-2 rounded-lg px-3 py-2 text-body-sm">
          <input type="hidden" name="page" value={page} />
          <span className="min-w-0 flex-1 truncate">
            About{' '}
            <Link href={page} className="font-medium underline">
              {page}
            </Link>
          </span>
          <Link href="/notes" aria-label="Unlink page" className="hover:text-text-primary">
            <IconX className="size-4" />
          </Link>
        </div>
      )}

      <Field label="Title" htmlFor="note-title">
        <Input
          id="note-title"
          name="title"
          required
          maxLength={120}
          placeholder="e.g. Printer shows E42 after firmware update"
        />
      </Field>

      <Field label="Your name" htmlFor="note-author" hint="Optional. Lets a reviewer ask you about the note.">
        <Input
          id="note-author"
          name="author"
          maxLength={80}
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        />
      </Field>

      <Field label="What is this?" htmlFor="note-kind">
        <select
          id="note-kind"
          name="kind"
          defaultValue={page ? 'update' : 'new'}
          className="bg-surface-bg text-text-primary border-line-structure focus:border-line-brand-soft focus:ring-line-brand-soft h-9 w-full rounded-lg border px-3 text-body-sm outline-none transition-colors focus:ring-1"
        >
          {Object.entries(NOTE_KINDS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Note"
        htmlFor="note-body"
        hint="Write it however you like. What happened, what you tried, what fixed it. Spell out any abbreviations or team names so they can be added to the glossary."
      >
        <textarea
          id="note-body"
          name="body"
          rows={12}
          className={textareaClass}
          placeholder="Customer site had the X200 showing E42 after the 3.2 update. Power cycling did nothing..."
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-text-secondary text-body-xs font-medium">Files</span>
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'border-line-structure bg-surface-bg text-text-secondary hover:border-line-brand-soft flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center text-body-sm transition-colors',
            dragging && 'border-line-cta bg-surface-brand-soft',
          )}
        >
          <IconUpload className="size-5" />
          <span>
            <span className="text-text-brand font-medium">Choose files</span> or drop them here
          </span>
          <span className="text-text-tertiary text-body-xs">
            OneNote exports (.html .md .txt .docx .pdf) and screenshots or photos (.png .jpg .webp .heic), up to{' '}
            {MAX_UPLOAD_BYTES / 1024 / 1024} MB in total
          </span>
          <input
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(',')}
            className="sr-only"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        {files.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="border-line-structure bg-surface-bg flex items-center gap-2 rounded-lg border px-3 py-2 text-body-sm"
              >
                <FilePreview file={file} />
                <span className="text-text-primary min-w-0 flex-1 truncate">{file.name}</span>
                <span className="text-text-tertiary text-body-xs">{formatSize(file.size)}</span>
                <IconButton
                  type="button"
                  variant="subtle"
                  size="sm"
                  aria-label={`Remove ${file.name}`}
                  icon={<IconX />}
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>
        )}
        {tooLarge && (
          <p className="text-text-danger text-body-xs">
            These files add up to {formatSize(totalBytes)}. Split them across several notes.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={state.kind === 'saving' || tooLarge}>
          {state.kind === 'saving' ? 'Saving...' : 'Save note'}
        </Button>
        {state.kind === 'saved' && (
          <p role="status" className="text-text-secondary text-body-sm">
            Saved. It will be turned into knowledge base pages on the next run.
          </p>
        )}
        {state.kind === 'error' && (
          <p role="alert" className="text-text-danger text-body-sm">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith('image/')) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // most browsers can't draw heic, so those fall back to the icon
  if (!url) return <IconFile className="text-text-tertiary size-4 shrink-0" />;
  return (
    <img
      src={url}
      alt=""
      className="border-line-structure size-10 shrink-0 rounded border object-cover"
      onError={() => setUrl(null)}
    />
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-text-secondary text-body-xs font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-text-tertiary text-body-xs">{hint}</p>}
    </div>
  );
}
