import type { Metadata } from 'next';
import { NoteForm } from '@/components/notes/NoteForm';
import { NoteList } from '@/components/notes/NoteList';
import { PageHeading, SectionHeading } from '@/components/ui';
import { listNotes } from '@/lib/notes';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notes',
};

export default async function NotesPage(props: PageProps<'/notes'>) {
  const { page } = await props.searchParams;
  const linkedPage = typeof page === 'string' && page.startsWith('/docs') ? page : undefined;
  const notes = await listNotes().catch((error: unknown) => {
    console.error('Listing notes failed', error);
    return null;
  });

  return (
    <>
      <PageHeading
        title="Notes"
        subtitle="Write down a fix, a procedure or anything else worth keeping, or upload OneNote exports. Notes are turned into knowledge base pages and reviewed before they go live."
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <SectionHeading title="Add a note" />
          <NoteForm page={linkedPage} />
        </section>
        <section>
          <SectionHeading
            title="Submitted notes"
            description="Waiting means not processed yet. In review means pages were drafted and are waiting for approval. Added means they are live."
          />
          {notes ? (
            <NoteList notes={notes} />
          ) : (
            <p className="text-text-danger text-body-sm">Could not load notes right now.</p>
          )}
        </section>
      </div>
    </>
  );
}
