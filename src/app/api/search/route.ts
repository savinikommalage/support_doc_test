import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const { GET } = createFromSource(source, {
  buildIndex: async (page) => {
    const { structuredData, keywords } = page.data;
    return {
      id: page.url,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      // the advanced index only searches content so keywords ride along as an extra paragraph
      structuredData: keywords.length
        ? { ...structuredData, contents: [...structuredData.contents, { heading: undefined, content: keywords.join(', ') }] }
        : structuredData,
    };
  },
});
