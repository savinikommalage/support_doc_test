// vercel rejects request bodies over 4.5 MB
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  '.md',
  '.txt',
  '.html',
  '.htm',
  '.docx',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.heic',
] as const;

export const NOTES_DIR = 'raw-notes';
export const ARCHIVE_DIR = 'raw-notes/archive';

// must match the branch name the cursor automation opens its PRs from
export const REVIEW_BRANCH_PREFIX = 'kb/build-';

export const NOTE_KINDS = {
  new: 'Something new',
  update: 'An addition or correction to a page',
  outdated: 'Something that no longer applies',
} as const;

export type NoteKind = keyof typeof NOTE_KINDS;

export type NoteStatus = 'pending' | 'in-review' | 'published';

export interface NoteSummary {
  id: string;
  title: string;
  submittedOn?: string;
  status: NoteStatus;
  reviewUrl?: string;
}
