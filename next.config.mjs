import { readFileSync } from 'node:fs';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// the automation appends here when it moves, merges or renames a page so old links keep working
const redirects = JSON.parse(readFileSync(new URL('./content/redirects.json', import.meta.url), 'utf8'));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // stops next dev from generating AGENTS.md and CLAUDE.md
  agentRules: false,
  async redirects() {
    return redirects.map(({ from, to }) => ({ source: from, destination: to, permanent: true }));
  },
};

export default withMDX(config);
