'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Button, Input, buttonStyles, cn } from '@/components/ui';
import { EDIT_REASONS, MAX_EDIT_BYTES } from '@/lib/edits-config';
import { lineDiff } from '@/lib/line-diff';
import { MarkdownEditor } from './MarkdownEditor';
import { MdxPreview } from './MdxPreview';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; pullRequestUrl?: string }
  | { kind: 'error'; message: string };

const AUTHOR_KEY = 'support-docs.author';

const CONTEXT_LINES = 2;

const fieldClass =
  'w-full rounded-lg border px-3 py-2.5 text-body-sm outline-none transition-colors bg-surface-bg text-text-primary placeholder:text-text-tertiary border-line-structure focus:border-line-brand-soft focus:ring-line-brand-soft focus:ring-1';

export function EditForm({
  page,
  title,
  body: original,
  sha,
}: {
  page: string;
  title: string;
  body: string;
  sha: string;
}) {
  const [body, setBody] = useState(original);
  const [tab, setTab] = useState<'write' | 'preview' | 'changes'>('write');
  const [author, setAuthor] = useState('');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  const changed = body.replace(/\r\n/g, '\n').trim() !== original.replace(/\r\n/g, '\n').trim();
  const tooLarge = new Blob([body]).size > MAX_EDIT_BYTES;

  useEffect(() => {
    try {
      setAuthor(localStorage.getItem(AUTHOR_KEY) ?? '');
    } catch {
      // localStorage throws when storage is blocked
    }
  }, []);

  useEffect(() => {
    if (!changed || state.kind === 'saved') return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed, state.kind]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set('body', body);

    setState({ kind: 'saving' });
    try {
      const response = await fetch('/api/edit', { method: 'POST', body: data });
      const result = (await response.json().catch(() => null)) as { error?: string; pullRequestUrl?: string } | null;
      if (!response.ok) {
        setState({ kind: 'error', message: result?.error ?? `Saving failed (${response.status}).` });
        return;
      }
      try {
        localStorage.setItem(AUTHOR_KEY, author);
      } catch {}
      setState({ kind: 'saved', pullRequestUrl: result?.pullRequestUrl });
    } catch {
      setState({ kind: 'error', message: 'Could not reach the server. Check your connection and try again.' });
    }
  }

  if (state.kind === 'saved') {
    return (
      <div className="border-line-structure bg-surface-bg flex flex-col items-start gap-3 rounded-xl border p-6">
        <p className="text-text-primary text-body font-semibold">Thanks, your edit was sent for review.</p>
        <p className="text-text-secondary text-body-sm">
          The page changes once a reviewer approves it. Until then everyone still sees the current version.
        </p>
        <div className="flex flex-wrap gap-2">
          {state.pullRequestUrl && (
            <a href={state.pullRequestUrl} target="_blank" rel="noreferrer" className={buttonStyles('primary', 'md')}>
              View the review on GitHub
            </a>
          )}
          <Link href={page} className={buttonStyles('neutral', 'md')}>
            Back to {title}
          </Link>
        </div>
        {!state.pullRequestUrl && (
          <p className="text-text-tertiary text-body-xs">
            GitHub is not configured here, so the change was written straight to the files on this machine.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="sha" value={sha} />

      <div className="flex flex-col gap-2">
        <div className="border-line-structure flex items-end gap-4 border-b" role="tablist">
          <TabButton active={tab === 'write'} onClick={() => setTab('write')}>
            Write
          </TabButton>
          <TabButton active={tab === 'preview'} onClick={() => setTab('preview')}>
            Preview
          </TabButton>
          <TabButton active={tab === 'changes'} onClick={() => setTab('changes')}>
            Changes
          </TabButton>
          {changed && tab === 'write' && (
            <button
              type="button"
              onClick={() => setBody(original)}
              className="text-text-tertiary hover:text-text-primary ms-auto pb-2 text-body-xs"
            >
              Undo all changes
            </button>
          )}
        </div>

        {tab === 'write' && (
          <>
            <MarkdownEditor
              value={body}
              onChange={(value) => {
                setBody(value);
                if (state.kind === 'error') setState({ kind: 'idle' });
              }}
            />
            <p className="text-text-tertiary text-body-xs">
              Select text and use the toolbar to format it, then check it in Preview. Use bold for buttons and code
              for error codes and on-screen messages. Leave tags like <code>&lt;Callout&gt;</code> as they are unless
              you mean to change them.
            </p>
            {tooLarge && <p className="text-text-danger text-body-xs">The page is too long to save.</p>}
          </>
        )}
        {tab === 'preview' && (
          <div className="border-line-structure bg-surface-bg min-h-60 rounded-lg border px-5 py-4">
            <MdxPreview source={body} />
          </div>
        )}
        {tab === 'changes' && <ChangeReview before={original} after={body} />}
      </div>

      <Field label="What was wrong?" htmlFor="edit-reason">
        <select id="edit-reason" name="reason" required defaultValue="" className={cn(fieldClass, 'h-9 py-0')}>
          <option value="" disabled>
            Choose one
          </option>
          {Object.entries(EDIT_REASONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="What did you change and why?"
        htmlFor="edit-summary"
        hint="A reviewer reads this before approving. Say how you know, e.g. “Did this on site today, the menu moved.”"
      >
        <textarea id="edit-summary" name="summary" required maxLength={500} rows={3} className={fieldClass} />
      </Field>

      <Field label="Your name" htmlFor="edit-author" hint="Optional. Lets a reviewer ask you about the edit.">
        <Input
          id="edit-author"
          name="author"
          maxLength={80}
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!changed || tooLarge || state.kind === 'saving'}>
          {state.kind === 'saving' ? 'Sending...' : 'Send for review'}
        </Button>
        <Link href={page} className={buttonStyles('subtle', 'md')}>
          Cancel
        </Link>
        {!changed && <p className="text-text-tertiary text-body-sm">Make a change to send it for review.</p>}
        {state.kind === 'error' && (
          <p role="alert" className="text-text-danger text-body-sm">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function ChangeReview({ before, after }: { before: string; after: string }) {
  const rows = useMemo(() => {
    const lines = lineDiff(before, after);
    const near = lines.map((line, index) =>
      lines
        .slice(Math.max(0, index - CONTEXT_LINES), index + CONTEXT_LINES + 1)
        .some((other) => other.type !== 'same'),
    );
    const result: ({ gap: true } | { gap: false; type: string; text: string })[] = [];
    lines.forEach((line, index) => {
      if (near[index]) result.push({ gap: false, ...line });
      else if (!result.at(-1)?.gap) result.push({ gap: true });
    });
    return result;
  }, [before, after]);

  if (!rows.some((row) => !row.gap && row.type !== 'same')) {
    return (
      <p className="border-line-structure text-text-tertiary rounded-lg border border-dashed px-4 py-8 text-center text-body-sm">
        No changes yet.
      </p>
    );
  }

  return (
    <div className="border-line-structure bg-surface-bg overflow-x-auto rounded-lg border font-mono text-body-xs">
      {rows.map((row, index) =>
        row.gap ? (
          <div key={index} className="bg-surface-1 text-text-tertiary px-3 py-1">
            ⋯
          </div>
        ) : (
          <div
            key={index}
            className={cn(
              'flex min-h-6 gap-3 px-3 whitespace-pre',
              row.type === 'added' && 'bg-badge-green text-badge-green-fg',
              row.type === 'removed' && 'bg-badge-red text-badge-red-fg line-through decoration-1',
              row.type === 'same' && 'text-text-secondary',
            )}
          >
            <span aria-hidden className="w-3 shrink-0 select-none">
              {row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ''}
            </span>
            <span className="sr-only">{row.type === 'same' ? '' : `${row.type}: `}</span>
            <span>{row.text}</span>
          </div>
        ),
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 pb-2 text-body-sm font-medium transition-colors',
        active ? 'border-text-brand text-text-brand' : 'text-text-secondary hover:text-text-primary border-transparent',
      )}
    >
      {children}
    </button>
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
