import { NextResponse } from 'next/server';
import { NoteError, saveNote } from '@/lib/notes';

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a multipart form.' }, { status: 400 });
  }

  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value : '';
  };
  const files = form.getAll('files').filter((value): value is File => value instanceof File && value.size > 0);

  try {
    const note = await saveNote({
      title: text('title'),
      author: text('author'),
      kind: text('kind'),
      body: text('body'),
      page: text('page') || undefined,
      files,
    });
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof NoteError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Saving note failed', error);
    return NextResponse.json({ error: 'Could not save the note. Try again in a minute.' }, { status: 502 });
  }
}
