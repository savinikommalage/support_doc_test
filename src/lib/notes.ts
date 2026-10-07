import { readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  ALLOWED_EXTENSIONS,
  ARCHIVE_DIR,
  MAX_UPLOAD_BYTES,
  NOTES_DIR,
  NOTE_KINDS,
  REVIEW_BRANCH_PREFIX,
  type NoteKind,
  type NoteStatus,
  type NoteSummary,
} from './notes-config';
import { GitHubError, commitFiles, gh, ghAll, githubConfig, writeLocalFiles, type GitHubConfig } from './github';

export class NoteError extends Error {}

export interface NoteInput {
  title: string;
  author: string;
  kind: string;
  body: string;
  page?: string;
  files: File[];
}

export async function saveNote(input: NoteInput): Promise<{ id: string }> {
  const title = input.title.trim();
  const body = input.body.trim();
  validate({ ...input, title, body });

  const submittedAt = new Date();
  const id = noteId(title, submittedAt);
  const names = attachmentNames(input.files);
  const attachments = await Promise.all(
    input.files.map(async (file, index) => ({
      path: `${NOTES_DIR}/${id}/${names[index]}`,
      content: Buffer.from(await file.arrayBuffer()),
    })),
  );
  const kind: NoteKind = input.kind in NOTE_KINDS ? (input.kind as NoteKind) : 'new';
  const note = noteMarkdown({ title, author: input.author.trim(), kind, body, page: input.page, submittedAt, names });
  const files = [{ path: `${NOTES_DIR}/${id}/note.md`, content: Buffer.from(note) }, ...attachments];

  const github = githubConfig();
  if (github) await commitFiles(github, files, `Add note ${id}`);
  else await writeLocalFiles(files);
  return { id };
}

export async function listNotes(): Promise<NoteSummary[]> {
  const github = githubConfig();
  const [waiting, archived, inReview] = github
    ? await Promise.all([
        listGitHubDir(github, NOTES_DIR),
        listGitHubDir(github, ARCHIVE_DIR),
        notesInReview(github),
      ])
    : await Promise.all([listLocalDir(NOTES_DIR), listLocalDir(ARCHIVE_DIR), new Map<string, string>()]);

  const notes = [
    ...waiting.map((id) => summary(id, inReview.has(id) ? 'in-review' : 'pending', inReview.get(id))),
    ...archived.map((id) => summary(id, 'published')),
  ];
  return notes.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 100);
}

function validate(input: NoteInput) {
  if (!input.title) throw new NoteError('Give the note a title.');
  if (input.title.length > 120) throw new NoteError('Keep the title under 120 characters.');
  if (!input.body && input.files.length === 0) throw new NoteError('Write something or attach a file.');
  if (input.body.length > 100_000) throw new NoteError('The note is too long. Attach it as a file instead.');
  if (input.page && !input.page.startsWith('/docs')) throw new NoteError('The linked page is not a knowledge base page.');

  const total = input.files.reduce((sum, file) => sum + file.size, Buffer.byteLength(input.body));
  if (total > MAX_UPLOAD_BYTES) {
    throw new NoteError(`A note can be at most ${MAX_UPLOAD_BYTES / 1024 / 1024} MB. Split the files across several notes.`);
  }
  for (const file of input.files) {
    const extension = path.extname(file.name).toLowerCase();
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
      throw new NoteError(`${file.name} is not a supported file type.`);
    }
  }
}

function slugify(value: string, max: number): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');
}

// ids sort by submission time, which the automation relies on to take the oldest first
function noteId(title: string, date: Date): string {
  const iso = date.toISOString();
  const time = iso.slice(11, 19).replaceAll(':', '');
  return `${iso.slice(0, 10)}-${time}-${slugify(title, 50) || 'note'}`;
}

function attachmentNames(files: File[]): string[] {
  const used = new Set(['note.md']);
  return files.map((file) => {
    const extension = path.extname(file.name).toLowerCase();
    const stem = slugify(path.basename(file.name, path.extname(file.name)), 60) || 'attachment';
    let name = `${stem}${extension}`;
    for (let n = 2; used.has(name); n++) name = `${stem}-${n}${extension}`;
    used.add(name);
    return name;
  });
}

function noteMarkdown(note: {
  title: string;
  author: string;
  kind: NoteKind;
  body: string;
  page?: string;
  submittedAt: Date;
  names: string[];
}): string {
  // json strings are valid yaml double quoted scalars
  const lines = [
    '---',
    `title: ${JSON.stringify(note.title)}`,
    `submittedBy: ${JSON.stringify(note.author || 'anonymous')}`,
    `submittedAt: ${note.submittedAt.toISOString()}`,
    `kind: ${note.kind}`,
  ];
  if (note.page) lines.push(`page: ${JSON.stringify(note.page)}`);
  if (note.names.length > 0) lines.push('attachments:', ...note.names.map((name) => `  - ${JSON.stringify(name)}`));
  lines.push('---', '', note.body, '');
  return lines.join('\n');
}

const ID_PATTERN = /^(\d{4}-\d{2}-\d{2})-\d{6}-(.+)$/;

function summary(id: string, status: NoteStatus, reviewUrl?: string): NoteSummary {
  const match = ID_PATTERN.exec(id);
  const words = (match ? match[2] : id.replace(/\.[a-z0-9]+$/i, '')).replace(/[-_]+/g, ' ').trim();
  return {
    id,
    title: words.charAt(0).toUpperCase() + words.slice(1),
    submittedOn: match?.[1],
    status,
    reviewUrl,
  };
}

function isNoteEntry(name: string): boolean {
  return name !== 'archive' && !name.startsWith('.');
}


async function listLocalDir(dir: string): Promise<string[]> {
  try {
    return (await readdir(path.join(/*turbopackIgnore: true*/ process.cwd(), dir))).filter(isNoteEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function listGitHubDir(config: GitHubConfig, dir: string): Promise<string[]> {
  try {
    const entries = await gh<{ name: string }[]>(config, `/contents/${dir}?ref=${encodeURIComponent(config.branch)}`);
    return entries.map((entry) => entry.name).filter(isNoteEntry);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return [];
    throw error;
  }
}

// a note is in review when an open automation PR moves it out of raw-notes
async function notesInReview(config: GitHubConfig): Promise<Map<string, string>> {
  const claimed = new Map<string, string>();
  const pulls = await ghAll<{ number: number; html_url: string; head: { ref: string } }>(config, '/pulls?state=open');
  await Promise.all(
    pulls
      .filter((pull) => pull.head.ref.startsWith(REVIEW_BRANCH_PREFIX))
      .map(async (pull) => {
        const files = await ghAll<{ filename: string; previous_filename?: string; status: string }>(
          config,
          `/pulls/${pull.number}/files`,
        );
        for (const file of files) {
          const from =
            file.status === 'renamed' ? file.previous_filename : file.status === 'removed' ? file.filename : undefined;
          const id = from && noteIdFromPath(from);
          if (id) claimed.set(id, pull.html_url);
        }
      }),
  );
  return claimed;
}

function noteIdFromPath(filePath: string): string | undefined {
  if (!filePath.startsWith(`${NOTES_DIR}/`)) return undefined;
  const rest = filePath.slice(NOTES_DIR.length + 1);
  if (rest.startsWith('archive/')) return undefined;
  return rest.split('/')[0];
}
