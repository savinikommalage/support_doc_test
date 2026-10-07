# Support Docs

A knowledge base for the support and field service team, built from unstructured notes.

1. People write notes or upload OneNote exports on the **Notes** page (`/notes`), or open **Add a note** from any page.
2. `/api/ingest` commits each note to `raw-notes/<id>/` on `main`.
3. A scheduled Cursor Automation turns waiting notes into pages under `content/docs/`, moves the notes to `raw-notes/archive/`, and opens a draft PR from a `kb/build-*` branch.
4. A reviewer merges the PR and the site redeploys.

People can also fix a page directly with **Suggest an edit**. `/api/edit` checks the page still compiles, commits the change and the reason for it (to `content/edits/`) on an `edit/*` branch, and opens a PR. Nothing changes on the site until that PR is merged.

The Notes page shows each note as **Waiting**, **In review** (an open `kb/build-*` PR moves it) or **Added** (archived on `main`).

## Layout

| Path | What it is |
| --- | --- |
| `content/docs/` | The knowledge base. Frontmatter is validated by the schema in `src/lib/source.ts` |
| `content/glossary.json` | Confirmed terms shown on `/docs/glossary`. Validated at build time by `src/lib/glossary.ts`. Terms nobody has explained stay out |
| `content/edits/` | One record per suggested edit: the page, what was wrong and why. Written by the site |
| `templates/` | One example page per page type: troubleshooting, procedure, reference, overview |
| `raw-notes/` | Waiting notes. `raw-notes/archive/` holds processed ones |
| `public/kb/` | Images used by pages |
| `.cursor/automations/build-knowledge-base.md` | Instructions for the Cursor Automation |
| `scripts/check-mermaid.mjs` | Parses every mermaid block, since `next build` does not |

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # mermaid syntax and TypeScript
npm run build
```

Without `GITHUB_TOKEN` and `GITHUB_REPO`, notes are written to `raw-notes/` and edits straight into `content/` on disk, which is handy locally. In production both must be set (see `.env.example`). The token needs **Contents: read and write** and **Pull requests: read and write** on this repo.
