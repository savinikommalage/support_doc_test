import type { Metadata } from 'next';
import Link from 'next/link';
import { EditForm } from '@/components/edits/EditForm';
import { EmptyState, PageHeading, buttonStyles } from '@/components/ui';
import { loadEditablePage } from '@/lib/edits';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Suggest an edit',
  robots: { index: false },
};

export default async function EditPage(props: PageProps<'/edit'>) {
  const { page: pageParam } = await props.searchParams;
  const url = typeof pageParam === 'string' && pageParam.startsWith('/docs') ? pageParam : undefined;
  const page = url
    ? await loadEditablePage(url).catch((error: unknown) => {
        console.error('Loading page for edit failed', error);
        return undefined;
      })
    : null;

  if (!page) {
    return (
      <>
        <PageHeading title="Suggest an edit" />
        <EmptyState
          title={page === undefined ? 'Could not load this page right now' : 'This page cannot be edited'}
          description={
            page === undefined
              ? 'Try again in a minute.'
              : 'Open a knowledge base page and use Suggest an edit from there.'
          }
          action={
            <Link href="/docs" className={buttonStyles('neutral', 'md')}>
              Go to the knowledge base
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Suggest an edit"
        subtitle={
          <>
            Fix something on{' '}
            <Link href={page.url} className="text-text-links font-medium hover:underline">
              {page.title}
            </Link>
            . A reviewer approves the change before anyone sees it.
          </>
        }
      />
      <div className="max-w-4xl">
        <EditForm page={page.url} title={page.title} body={page.body} sha={page.sha} />
      </div>
    </>
  );
}
