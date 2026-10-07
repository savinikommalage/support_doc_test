import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class GitHubError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface GitHubConfig {
  token: string;
  repo: string;
  branch: string;
}

export interface RepoFile {
  path: string;
  content: Buffer;
}

export async function writeLocalFiles(files: RepoFile[]) {
  for (const file of files) {
    const target = path.join(/*turbopackIgnore: true*/ process.cwd(), file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
}

export function githubConfig(): GitHubConfig | null {
  const { GITHUB_TOKEN: token, GITHUB_REPO: repo, GITHUB_BRANCH: branch = 'main' } = process.env;
  if (token && repo) return { token, repo, branch };
  if (process.env.NODE_ENV === 'production') {
    throw new Error('GITHUB_TOKEN and GITHUB_REPO must be set in production');
  }
  return null;
}

export async function gh<T>(config: GitHubConfig, pathname: string, init?: { method: string; body: unknown }): Promise<T> {
  const response = await fetch(`https://api.github.com/repos/${config.repo}${pathname}`, {
    method: init?.method ?? 'GET',
    body: init ? JSON.stringify(init.body) : undefined,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new GitHubError(
      response.status,
      `GitHub ${init?.method ?? 'GET'} ${pathname} failed with ${response.status}: ${await response.text()}`,
    );
  }
  return response.json() as Promise<T>;
}

export async function ghAll<T>(config: GitHubConfig, pathname: string): Promise<T[]> {
  const items: T[] = [];
  const separator = pathname.includes('?') ? '&' : '?';
  for (let page = 1; ; page++) {
    const batch = await gh<T[]>(config, `${pathname}${separator}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

async function createCommit(config: GitHubConfig, files: RepoFile[], message: string, parentSha: string) {
  const blobs = await Promise.all(
    files.map((file) =>
      gh<{ sha: string }>(config, '/git/blobs', {
        method: 'POST',
        body: { content: file.content.toString('base64'), encoding: 'base64' },
      }),
    ),
  );
  const tree = files.map((file, index) => ({ path: file.path, mode: '100644', type: 'blob', sha: blobs[index].sha }));
  const parent = await gh<{ tree: { sha: string } }>(config, `/git/commits/${parentSha}`);
  const newTree = await gh<{ sha: string }>(config, '/git/trees', {
    method: 'POST',
    body: { base_tree: parent.tree.sha, tree },
  });
  return gh<{ sha: string }>(config, '/git/commits', {
    method: 'POST',
    body: { message, tree: newTree.sha, parents: [parentSha] },
  });
}

export async function commitFiles(config: GitHubConfig, files: RepoFile[], message: string) {
  // retry when another commit lands between reading the branch and moving it
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh<{ object: { sha: string } }>(config, `/git/ref/heads/${config.branch}`);
    const commit = await createCommit(config, files, message, ref.object.sha);
    try {
      await gh(config, `/git/refs/heads/${config.branch}`, { method: 'PATCH', body: { sha: commit.sha } });
      return;
    } catch (error) {
      if (!(error instanceof GitHubError && error.status === 422)) throw error;
    }
  }
  throw new Error(`Could not update ${config.branch} after 3 attempts`);
}

export async function openPullRequest(
  config: GitHubConfig,
  input: { branch: string; files: RepoFile[]; message: string; title: string; body: string },
): Promise<{ url: string; number: number }> {
  const base = await gh<{ object: { sha: string } }>(config, `/git/ref/heads/${config.branch}`);
  const commit = await createCommit(config, input.files, input.message, base.object.sha);
  await gh(config, '/git/refs', { method: 'POST', body: { ref: `refs/heads/${input.branch}`, sha: commit.sha } });
  const pull = await gh<{ html_url: string; number: number }>(config, '/pulls', {
    method: 'POST',
    body: { title: input.title, body: input.body, head: input.branch, base: config.branch },
  });
  return { url: pull.html_url, number: pull.number };
}

export async function readRepoFile(config: GitHubConfig, filePath: string): Promise<{ content: string; sha: string } | null> {
  try {
    const file = await gh<{ content: string; sha: string }>(
      config,
      `/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(config.branch)}`,
    );
    return { content: Buffer.from(file.content, 'base64').toString('utf8'), sha: file.sha };
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null;
    throw error;
  }
}
