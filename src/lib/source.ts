import { llms, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins/remark-mdx-mermaid';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

export const pageTypes = ['troubleshooting', 'procedure', 'reference', 'overview'] as const;

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      type: z.enum(pageTypes),
      appliesTo: z.array(z.string()).default([]),
      keywords: z.array(z.string()).default([]),
      sources: z.array(z.string()).default([]),
      status: z.enum(['current', 'outdated']).default('current'),
      replacedBy: z.string().optional(),
      // yaml turns an unquoted date into a Date object
      lastUpdated: z
        .union([z.string(), z.date()])
        .transform((value) => (typeof value === 'string' ? value : value.toISOString().slice(0, 10)))
        .optional(),
    }),
    // a collection level mdxOptions replaces the preset so the preset is reapplied here
    mdxOptions: applyMdxPreset({
      remarkPlugins: (plugins) => [remarkMdxMermaid, ...plugins],
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});
