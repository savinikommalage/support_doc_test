'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  IconBold,
  IconCode,
  IconItalic,
  IconLink,
  IconList,
  IconListOrdered,
  IconQuote,
  IconTable,
  IconTriangleAlert,
} from '@/components/layout/icons';
import { cn } from '@/components/ui';
import {
  code,
  continueList,
  formatLines,
  link,
  pasteLink,
  table,
  warning,
  wrap,
  type Change,
  type Selection,
} from './markdown-format';

type Action = (selection: Selection) => Change;

const bold: Action = (s) => wrap(s, '**', 'bold text');
const italic: Action = (s) => wrap(s, '_', 'italic text');

// execCommand keeps the native undo history
function apply(textarea: HTMLTextAreaElement, change: Change) {
  textarea.focus();
  textarea.setSelectionRange(change.start, change.end);
  const inserted =
    change.text === ''
      ? document.execCommand('delete', false)
      : document.execCommand('insertText', false, change.text);
  if (!inserted || textarea.value.slice(change.start, change.start + change.text.length) !== change.text) {
    textarea.setRangeText(change.text, change.start, change.end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  textarea.setSelectionRange(change.selectStart, change.selectEnd);
}

export function MarkdownEditor({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mod, setMod] = useState('Ctrl');

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setMod('⌘');
  }, []);

  function run(action: Action) {
    const textarea = ref.current;
    if (!textarea) return;
    apply(textarea, action({ value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    const selection = { value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd };

    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.nativeEvent.isComposing) return;
      const change = continueList(selection);
      if (change) {
        event.preventDefault();
        apply(textarea, change);
      }
      return;
    }

    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const shortcut: Action | undefined = event.shiftKey
      ? { Period: (s: Selection) => formatLines(s, 'quote'), Digit7: (s: Selection) => formatLines(s, 'numbered'), Digit8: (s: Selection) => formatLines(s, 'bullet') }[
          event.code
        ]
      : { b: bold, i: italic, k: link, e: code }[event.key.toLowerCase()];
    if (shortcut) {
      event.preventDefault();
      apply(textarea, shortcut(selection));
    }
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    const change = pasteLink(
      { value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd },
      event.clipboardData.getData('text/plain'),
    );
    if (change) {
      event.preventDefault();
      apply(textarea, change);
    }
  }

  return (
    <div
      className={cn(
        'border-line-structure bg-surface-bg focus-within:border-line-brand-soft focus-within:ring-line-brand-soft overflow-hidden rounded-lg border transition-colors focus-within:ring-1',
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label="Formatting"
        className="border-line-structure bg-surface-1 flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1"
      >
        <Tool label="Section heading" onClick={() => run((s) => formatLines(s, 'h2'))}>
          <span className="text-body-xs font-bold">H2</span>
        </Tool>
        <Tool label="Subheading" onClick={() => run((s) => formatLines(s, 'h3'))}>
          <span className="text-body-tiny font-bold">H3</span>
        </Tool>
        <Divider />
        <Tool label={`Bold (${mod}+B)`} onClick={() => run(bold)}>
          <IconBold />
        </Tool>
        <Tool label={`Italic (${mod}+I)`} onClick={() => run(italic)}>
          <IconItalic />
        </Tool>
        <Tool label={`Code or on-screen text (${mod}+E)`} onClick={() => run(code)}>
          <IconCode />
        </Tool>
        <Tool label={`Link (${mod}+K)`} onClick={() => run(link)}>
          <IconLink />
        </Tool>
        <Divider />
        <Tool label={`Bulleted list (${mod}+Shift+8)`} onClick={() => run((s) => formatLines(s, 'bullet'))}>
          <IconList />
        </Tool>
        <Tool label={`Numbered steps (${mod}+Shift+7)`} onClick={() => run((s) => formatLines(s, 'numbered'))}>
          <IconListOrdered />
        </Tool>
        <Tool label={`Quote (${mod}+Shift+.)`} onClick={() => run((s) => formatLines(s, 'quote'))}>
          <IconQuote />
        </Tool>
        <Divider />
        <Tool label="Warning box" onClick={() => run(warning)}>
          <IconTriangleAlert />
        </Tool>
        <Tool label="Table" onClick={() => run(table)}>
          <IconTable />
        </Tool>
      </div>
      <textarea
        ref={ref}
        aria-label="Page content"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        rows={24}
        spellCheck
        className="text-text-primary placeholder:text-text-tertiary block w-full resize-y bg-transparent px-3 py-2.5 font-mono text-body-xs leading-relaxed outline-none"
      />
    </div>
  );
}

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // stops the button taking focus and clearing the textarea selection
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="text-text-secondary hover:bg-surface-neutral-soft hover:text-text-primary focus-visible:ring-line-cta flex size-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="bg-line-structure mx-1 h-5 w-px" />;
}
