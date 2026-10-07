import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { source } from '@/lib/source';
import { findMdxProblem } from './mdx-safety';
import { githubConfig, openPullRequest, readRepoFile, writeLocalFiles, type RepoFile } from './github';
import {
  EDITS_DIR,
  EDIT_BRANCH_PREFIX,
  EDIT_REASONS,
  MAX_EDIT_BYTES,
  UNEDITABLE_PAGES,
  type EditReason,
} from './edits-config';

export class EditError extends Error {}

export interface EditablePage {
  url: string;
  title: string;
  filePath: string;
  frontmatter: string;
  body: string;
  sha: string;
}

export interface EditInput {
  page: string;
  body: string;
  sha: string;
  reason: string;
  summary: string;
  author: string;
}

export async function loadEditablePage(url: string): Promise<EditablePage | null> {
  if (UNEDITABLE_PAGES.includes(url)) return null;
  const page = source.getPage(url.replace(/^\/docs\/?/, '').split('/').filter(Boolean));
  if (!page) return null;

  const filePath = `content/docs/${page.path}`;
  const github = githubConfig();
  const file = github ? await readRepoFile(github, filePath) : await readLocal(filePath);
  if (!file) return null;

  const { frontmatter, body } = splitFrontmatter(file.content);
  return { url: page.url, title: page.data.title, filePath, frontmatter, body, sha: file.sha };
}

export async function saveEdit(input: EditInput): Promise<{ pullRequestUrl?: string }> {
  const summary = input.summary.trim();
  const author = input.author.trim();
  const reason = input.reason as EditReason;
  if (!(input.reason in EDIT_REASONS)) throw new EditError('Choose what was wrong with the page.');
  if (!summary) throw new EditError('Say briefly what you changed and why.');
  if (summary.length > 500) throw new EditError('Keep the explanation under 500 characters.');
  if (Buffer.byteLength(input.body) > MAX_EDIT_BYTES) throw new EditError('The page is too long to save.');

  const page = await loadEditablePage(input.page);
  if (!page) throw new EditError('This page cannot be edited.');
  if (page.sha !== input.sha) {
    throw new EditError('Someone changed this page while you were editing. Copy your changes, reload and try again.');
  }

  const body = normaliseBody(input.body);
  if (body === normaliseBody(page.body)) throw new EditError('Nothing was changed.');
  await checkMdx(body);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const id = `${today}-${now.toISOString().slice(11, 19).replaceAll(':', '')}-${page.filePath
    .replace(/^content\/docs\//, '')
    .replace(/\.mdx?$/, '')
    .replaceAll('/', '-')}`;

  const files: RepoFile[] = [
    {
      path: page.filePath,
      content: Buffer.from(page.frontmatter ? `${withLastUpdated(page.frontmatter, today)}\n${body}` : body),
    },
    {
      path: `${EDITS_DIR}/${id}.md`,
      content: Buffer.from(editRecord({ page: page.url, reason, summary, author, submittedAt: now })),
    },
  ];

  const github = githubConfig();
  if (!github) {
    await writeLocalFiles(files);
    return {};
  }

  const pull = await openPullRequest(github, {
    branch: `${EDIT_BRANCH_PREFIX}${id}`,
    files,
    message: `Suggested edit to ${page.url}`,
    title: `Suggested edit: ${page.title}`,
    body: pullRequestBody({ page, reason, summary, author }),
  });
  return { pullRequestUrl: pull.url };
}

async function checkMdx(body: string) {
  const problem = await findMdxProblem(body);
  if (problem) throw new EditError(problem);
}

function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const text = content.replace(/\r\n/g, '\n');
  const match = /^---\n[\s\S]*?\n---\n/.exec(text);
  if (!match) return { frontmatter: '', body: text };
  return { frontmatter: match[0], body: text.slice(match[0].length).replace(/^\n/, '') };
}

function withLastUpdated(frontmatter: string, today: string): string {
  const line = `lastUpdated: "${today}"`;
  if (/^lastUpdated:.*$/m.test(frontmatter)) return frontmatter.replace(/^lastUpdated:.*$/m, line);
  return frontmatter.replace(/\n---\n$/, `\n${line}\n---\n`);
}

function normaliseBody(body: string): string {
  return `${body.replace(/\r\n/g, '\n').trim()}\n`;
}

function editRecord(edit: { page: string; reason: EditReason; summary: string; author: string; submittedAt: Date }) {
  return [
    '---',
    `page: ${JSON.stringify(edit.page)}`,
    `reason: ${edit.reason}`,
    `submittedBy: ${JSON.stringify(edit.author || 'anonymous')}`,
    `submittedAt: ${edit.submittedAt.toISOString()}`,
    '---',
    '',
    edit.summary,
    '',
  ].join('\n');
}

function pullRequestBody(edit: { page: EditablePage; reason: EditReason; summary: string; author: string }) {
  return [
    `Suggested from the site by **${edit.author || 'anonymous'}**.`,
    '',
    `| Page | What was wrong |`,
    `| --- | --- |`,
    `| [${edit.page.title.replaceAll('|', '\\|')}](${edit.page.url}) | ${EDIT_REASONS[edit.reason]} |`,
    '',
    '## What they changed and why',
    '',
    edit.summary.replace(/\r\n/g, '\n').split('\n').map((line) => `> ${line}`).join('\n'),
    '',
    '## Before merging',
    '',
    '- Check the change in **Files changed**. Only the page body and `lastUpdated` were edited.',
    '- The page was checked to compile as MDX. Mermaid diagrams were not checked.',
    `- The reason is saved in \`${EDITS_DIR}/\` so the knowledge base automation can learn from it.`,
  ].join('\n');
}

async function readLocal(filePath: string): Promise<{ content: string; sha: string } | null> {
  try {
    const buffer = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), filePath));
    const sha = createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
    return { content: buffer.toString('utf8'), sha };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

