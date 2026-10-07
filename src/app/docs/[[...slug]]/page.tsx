import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { Callout } from 'fumadocs-ui/components/callout';
import { getPageImageUrl, getPageMarkdownUrl } from '@/lib/shared';
import { TagPill, buttonStyles } from '@/components/ui';
import { IconNotebookPen, IconPencil } from '@/components/layout/icons';
import { UNEDITABLE_PAGES } from '@/lib/edits-config';

const TYPE_LABELS = {
  troubleshooting: 'Troubleshooting',
  procedure: 'Procedure',
  reference: 'Reference',
  overview: 'Overview',
} as const;

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row flex-wrap gap-2 items-center border-b pb-6">
        <TagPill label={TYPE_LABELS[page.data.type]} tone="brand" />
        {page.data.lastUpdated && (
          <span className="text-body-xs text-text-tertiary">Updated {page.data.lastUpdated}</span>
        )}
        <div className="ms-auto flex flex-row gap-2 items-center">
          <Link href={`/notes?page=${encodeURIComponent(page.url)}`} className={buttonStyles('neutral', 'md')}>
            <IconNotebookPen className="me-1" />
            Add a note
          </Link>
          {!UNEDITABLE_PAGES.includes(page.url) && (
            <Link href={`/edit?page=${encodeURIComponent(page.url)}`} className={buttonStyles('neutral', 'md')}>
              <IconPencil className="me-1" />
              Suggest an edit
            </Link>
          )}
          <MarkdownCopyButton markdownUrl={markdownUrl} />
        </div>
      </div>
      {page.data.status === 'outdated' && <OutdatedBanner replacedBy={page.data.replacedBy} />}
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

function OutdatedBanner({ replacedBy }: { replacedBy?: string }) {
  const replacement = replacedBy
    ? source.getPage(replacedBy.replace(/^\/docs\/?/, '').split('/').filter(Boolean))
    : undefined;

  return (
    <Callout type="warn" title="This page is outdated">
      {replacement ? (
        <>
          Use <Link href={replacement.url}>{replacement.data.title}</Link> instead.
        </>
      ) : (
        'It is kept for older equipment and reference, and may no longer apply.'
      )}
    </Callout>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImageUrl(page).url,
    },
  };
}
