export interface Selection {
  value: string;
  start: number;
  end: number;
}

// replaces value from start to end with text then selects selectStart to selectEnd
export interface Change {
  start: number;
  end: number;
  text: string;
  selectStart: number;
  selectEnd: number;
}

export type LineFormat = 'h2' | 'h3' | 'quote' | 'bullet' | 'numbered';

const LINE_PREFIX = /^(#{1,6} |[-*+] |\d+\. |> ?)/;

export function wrap({ value, start, end }: Selection, marker: string, placeholder: string): Change {
  const selected = value.slice(start, end);
  const m = marker.length;

  if (value.slice(start - m, start) === marker && value.slice(end, end + m) === marker) {
    return { start: start - m, end: end + m, text: selected, selectStart: start - m, selectEnd: end - m };
  }
  if (selected.length >= m * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(m, -m);
    return { start, end, text: inner, selectStart: start, selectEnd: start + inner.length };
  }

  // spaces stay outside the markers because "**bold **" does not render as bold
  const lead = /^\s*/.exec(selected)![0];
  const trail = /\s*$/.exec(selected.slice(lead.length))![0];
  const inner = selected.trim() || placeholder;
  const text = `${lead}${marker}${inner}${marker}${trail}`;
  const selectStart = start + lead.length + m;
  return { start, end, text, selectStart, selectEnd: selectStart + inner.length };
}

export function code(selection: Selection): Change {
  const { value, start, end } = selection;
  const selected = value.slice(start, end);
  if (!selected.includes('\n')) return wrap(selection, '`', 'code');

  const inner = selected.replace(/\n$/, '');
  const before = start === 0 || value[start - 1] === '\n' ? '' : '\n';
  const after = end === value.length || value[end] === '\n' ? '' : '\n';
  const text = `${before}\`\`\`\n${inner}\n\`\`\`${after}`;
  const selectStart = start + before.length + 4;
  return { start, end, text, selectStart, selectEnd: selectStart + inner.length };
}

export function formatLines({ value, start, end }: Selection, format: LineFormat): Change {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let blockEnd = end > start && value[end - 1] === '\n' ? end - 1 : end;
  blockEnd = value.indexOf('\n', blockEnd);
  if (blockEnd === -1) blockEnd = value.length;

  const lines = value.slice(lineStart, blockEnd).split('\n');
  const filled = lines.filter((line) => line.trim());
  const has = (line: string) => {
    switch (format) {
      case 'h2':
        return line.startsWith('## ');
      case 'h3':
        return line.startsWith('### ');
      case 'quote':
        return line.startsWith('>');
      case 'bullet':
        return /^[-*+] /.test(line);
      case 'numbered':
        return /^\d+\. /.test(line);
    }
  };
  const removing = filled.length > 0 && filled.every(has);

  let number = 0;
  const next = lines.map((line) => {
    if (removing) return line.replace(LINE_PREFIX, '');
    if (!line.trim() && lines.length > 1) return line;
    const bare = format === 'quote' ? line : line.replace(LINE_PREFIX, '');
    switch (format) {
      case 'h2':
        return `## ${bare}`;
      case 'h3':
        return `### ${bare}`;
      case 'quote':
        return `> ${bare}`;
      case 'bullet':
        return `- ${bare}`;
      case 'numbered':
        return `${++number}. ${bare}`;
    }
  });

  if (!removing && lines.length === 1 && !lines[0].trim() && (format === 'h2' || format === 'h3')) {
    const prefix = format === 'h2' ? '## ' : '### ';
    const placeholder = 'Heading';
    return {
      start: lineStart,
      end: blockEnd,
      text: `${prefix}${placeholder}`,
      selectStart: lineStart + prefix.length,
      selectEnd: lineStart + prefix.length + placeholder.length,
    };
  }

  const text = next.join('\n');
  if (start === end) {
    const caret = Math.max(lineStart, lineStart + text.length - (blockEnd - end));
    return { start: lineStart, end: blockEnd, text, selectStart: caret, selectEnd: caret };
  }
  return { start: lineStart, end: blockEnd, text, selectStart: lineStart, selectEnd: lineStart + text.length };
}

export function link({ value, start, end }: Selection): Change {
  const selected = value.slice(start, end).trim();
  if (/^https?:\/\/\S+$/.test(selected)) {
    const label = 'link text';
    return { start, end, text: `[${label}](${selected})`, selectStart: start + 1, selectEnd: start + 1 + label.length };
  }
  if (!selected) {
    const label = 'link text';
    return { start, end, text: `[${label}](url)`, selectStart: start + 1, selectEnd: start + 1 + label.length };
  }
  const text = `[${selected}](url)`;
  const selectStart = start + selected.length + 3;
  return { start, end, text, selectStart, selectEnd: selectStart + 3 };
}

export function pasteLink({ value, start, end }: Selection, pasted: string): Change | null {
  const url = pasted.trim();
  const selected = value.slice(start, end);
  if (start === end || selected.includes('\n') || !/^https?:\/\/\S+$/.test(url)) return null;
  const text = `[${selected}](${url})`;
  return { start, end, text, selectStart: start + text.length, selectEnd: start + text.length };
}

function block({ value, start, end }: Selection, body: string, selectFrom: number, selectLength: number): Change {
  const head = value.slice(0, start);
  const tail = value.slice(end);
  const before = start === 0 || head.endsWith('\n\n') ? '' : head.endsWith('\n') ? '\n' : '\n\n';
  const after = end === value.length || tail.startsWith('\n\n') ? '' : tail.startsWith('\n') ? '\n' : '\n\n';
  const selectStart = start + before.length + selectFrom;
  return { start, end, text: `${before}${body}${after}`, selectStart, selectEnd: selectStart + selectLength };
}

export function warning(selection: Selection): Change {
  const inner = selection.value.slice(selection.start, selection.end).trim() || 'What the reader must be careful about.';
  const open = '<Callout type="warn">\n';
  return block(selection, `${open}${inner}\n</Callout>`, open.length, inner.length);
}

export function table(selection: Selection): Change {
  const header = '| Column 1 | Column 2 |\n| --- | --- |\n| ';
  return block(selection, `${header}Text | Text |`, header.length, 'Text'.length);
}

export function continueList({ value, start, end }: Selection): Change | null {
  if (start !== end) return null;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIndex = value.indexOf('\n', start);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const before = value.slice(lineStart, start);

  const match = /^(\s*)(?:(>) ?|([-*+])\s+(\[[ xX]\]\s+)?|(\d+)\.\s+)/.exec(before);
  if (!match) return null;

  const isEmpty = !value.slice(lineStart + match[0].length, lineEnd).trim();
  if (isEmpty) {
    return { start: lineStart, end: lineEnd, text: '', selectStart: lineStart, selectEnd: lineStart };
  }

  const [, indent, quote, bullet, task, number] = match;
  const marker = quote ? '> ' : bullet ? `${bullet} ${task ? '[ ] ' : ''}` : `${Number(number) + 1}. `;
  const text = `\n${indent}${marker}`;
  return { start, end, text, selectStart: start + text.length, selectEnd: start + text.length };
}
