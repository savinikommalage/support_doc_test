export const EDIT_REASONS = {
  'wrong-fact': 'Something is wrong',
  unclear: 'It is unclear or hard to follow',
  'missing-step': 'A step or detail is missing',
  'wrong-term': 'A term or name is wrong',
  outdated: 'It is out of date',
  typo: 'Typo or formatting',
} as const;

export type EditReason = keyof typeof EDIT_REASONS;

export const EDIT_BRANCH_PREFIX = 'edit/';

export const EDITS_DIR = 'content/edits';

export const MAX_EDIT_BYTES = 200 * 1024;

export const UNEDITABLE_PAGES = ['/docs/glossary'];
