import { NextResponse } from 'next/server';
import { EditError, saveEdit } from '@/lib/edits';

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a form.' }, { status: 400 });
  }

  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === 'string' ? value : '';
  };

  try {
    const result = await saveEdit({
      page: text('page'),
      body: text('body'),
      sha: text('sha'),
      reason: text('reason'),
      summary: text('summary'),
      author: text('author'),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof EditError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Saving edit failed', error);
    return NextResponse.json({ error: 'Could not save the edit. Try again in a minute.' }, { status: 502 });
  }
}
