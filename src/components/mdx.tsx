import type { MDXComponents } from 'mdx/types';
import { baseMdxComponents } from '@/components/mdx-base';
import { Glossary } from '@/components/glossary/Glossary';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...baseMdxComponents,
    Glossary,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
