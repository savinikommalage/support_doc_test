'use client';

import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { baseMdxComponents } from '@/components/mdx-base';

type Rendered = { kind: 'loading' } | { kind: 'ready'; Content: ComponentType<{ components: typeof baseMdxComponents }> } | { kind: 'error'; message: string };

export function MdxPreview({ source }: { source: string }) {
  const [rendered, setRendered] = useState<Rendered>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [{ evaluate }, runtime, { remarkGfm }, { remarkMdxMermaid }] = await Promise.all([
          import('@mdx-js/mdx'),
          import('react/jsx-runtime'),
          import('fumadocs-core/mdx-plugins/remark-gfm'),
          import('fumadocs-core/mdx-plugins/remark-mdx-mermaid'),
        ]);
        const { default: Content } = await evaluate(source, {
          ...runtime,
          remarkPlugins: [remarkGfm, remarkMdxMermaid],
        });
        if (!cancelled) setRendered({ kind: 'ready', Content });
      } catch (error) {
        if (!cancelled) setRendered({ kind: 'error', message: errorMessage(error) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (rendered.kind === 'loading') {
    return <p className="text-text-tertiary px-4 py-8 text-center text-body-sm">Loading preview...</p>;
  }
  if (rendered.kind === 'error') return <PreviewError message={rendered.message} />;

  const { Content } = rendered;
  return (
    <PreviewBoundary key={source}>
      <div className="prose max-w-none">
        <Content components={baseMdxComponents} />
      </div>
    </PreviewBoundary>
  );
}

function errorMessage(error: unknown): string {
  const detail = error as { message?: string; line?: number; place?: { line?: number } };
  const line = detail.line ?? detail.place?.line;
  return `${line ? `Line ${line}: ` : ''}${(detail.message ?? String(error)).split('\n')[0]}`;
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="bg-surface-danger-soft text-text-danger rounded-lg px-4 py-3 text-body-sm">
      <p className="font-medium">This page would not display.</p>
      <p className="mt-1">{message}</p>
      <p className="text-text-secondary mt-2 text-body-xs">
        Go back to Write and check the line. A bare &lt; or {'{'} in text needs to be inside backticks.
      </p>
    </div>
  );
}

class PreviewBoundary extends Component<{ children: ReactNode }, { message?: string }> {
  state: { message?: string } = {};

  static getDerivedStateFromError(error: unknown) {
    return { message: errorMessage(error) };
  }

  render() {
    return this.state.message ? <PreviewError message={this.state.message} /> : this.props.children;
  }
}
