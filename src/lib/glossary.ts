import { z } from 'zod';
import rawTerms from '../../content/glossary.json';
import { source } from '@/lib/source';

export const GLOSSARY_CATEGORIES = {
  teams: 'Teams & regions',
  systems: 'Systems & tools',
  tickets: 'Tickets & processes',
  products: 'Products & equipment',
  general: 'General',
} as const;

export type GlossaryCategory = keyof typeof GLOSSARY_CATEGORIES;

const categoryKeys = Object.keys(GLOSSARY_CATEGORIES) as [GlossaryCategory, ...GlossaryCategory[]];

const termSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be lowercase kebab-case'),
    term: z.string().min(1),
    definition: z.string().min(1),
    synonyms: z.array(z.string()).default([]),
    categories: z.array(z.enum(categoryKeys)).min(1),
    related: z.array(z.string()).default([]),
    pages: z.array(z.string().startsWith('/docs')).default([]),
    sources: z.array(z.string()).default([]),
    lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

export type GlossaryTerm = z.infer<typeof termSchema>;

export interface ResolvedGlossaryTerm extends GlossaryTerm {
  pageLinks: { url: string; title: string }[];
}

export function loadGlossary(): ResolvedGlossaryTerm[] {
  const result = z.array(termSchema).safeParse(rawTerms);
  if (!result.success) {
    throw new Error(`content/glossary.json is invalid:\n${z.prettifyError(result.error)}`);
  }

  const terms = result.data;
  const ids = new Set<string>();
  const problems: string[] = [];

  for (const term of terms) {
    if (ids.has(term.id)) problems.push(`duplicate id "${term.id}"`);
    ids.add(term.id);
  }

  const resolved = terms.map((term) => {
    for (const id of term.related) {
      if (!ids.has(id)) problems.push(`"${term.id}" is related to unknown id "${id}"`);
    }
    const pageLinks = term.pages.flatMap((url) => {
      const page = source.getPage(url.replace(/^\/docs\/?/, '').split('/').filter(Boolean));
      if (!page) {
        problems.push(`"${term.id}" links to missing page "${url}"`);
        return [];
      }
      return [{ url: page.url, title: page.data.title }];
    });
    return { ...term, pageLinks };
  });

  if (problems.length > 0) {
    throw new Error(`content/glossary.json is invalid:\n- ${problems.join('\n- ')}`);
  }

  return resolved.sort((a, b) => a.term.localeCompare(b.term));
}
