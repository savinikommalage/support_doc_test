import { glob, readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

// mermaid renders in the browser so next build never sees a broken diagram
const { window } = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = window;
globalThis.document = window.document;
globalThis.DOMParser = window.DOMParser;
globalThis.Element = window.Element;

const { default: mermaid } = await import('mermaid');
mermaid.initialize({ startOnLoad: false });

const block = /^```mermaid[^\n]*\n([\s\S]*?)^```/gm;
let diagrams = 0;
let failures = 0;

for await (const file of glob(['content/docs/**/*.mdx', 'templates/*.mdx'])) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(block)) {
    diagrams++;
    const line = source.slice(0, match.index).split('\n').length;
    try {
      await mermaid.parse(match[1]);
    } catch (error) {
      failures++;
      console.error(`${file}:${line} ${String(error?.message ?? error).split('\n').slice(0, 3).join(' ')}`);
    }
  }
}

console.log(`${diagrams} mermaid diagram(s) checked, ${failures} broken`);
process.exit(failures > 0 ? 1 : 0);
