'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconSearch, IconX } from '@/components/layout/icons';
import { Button, EmptyState, Input, cn } from '@/components/ui';
import type { GlossaryCategory, ResolvedGlossaryTerm } from '@/lib/glossary';

const CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  teams: 'bg-badge-blue text-badge-blue-fg',
  systems: 'bg-badge-green text-badge-green-fg',
  tickets: 'bg-badge-yellow text-badge-yellow-fg',
  products: 'bg-badge-red text-badge-red-fg',
  general: 'bg-badge-gray text-badge-gray-fg',
};

type Categories = Record<GlossaryCategory, string>;

function CategoryBadge({
  label,
  category,
  onClick,
  isActive,
}: {
  label: string;
  category: GlossaryCategory;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const className = cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-body-xs font-medium transition-all',
    CATEGORY_COLORS[category],
    onClick && 'cursor-pointer hover:opacity-80',
    isActive && 'ring-line-cta ring-2 ring-offset-1',
  );
  if (!onClick) return <span className={className}>{label}</span>;
  return (
    <button type="button" onClick={onClick} aria-pressed={isActive} className={className}>
      {label}
    </button>
  );
}

function GlossaryEntry({
  term,
  termsById,
  categories,
}: {
  term: ResolvedGlossaryTerm;
  termsById: Map<string, ResolvedGlossaryTerm>;
  categories: Categories;
}) {
  const related = term.related.flatMap((id) => termsById.get(id) ?? []);

  return (
    <div id={term.id} className="scroll-mt-48 border-b border-line-structure py-4 last:border-b-0">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-heading-sm font-semibold">{term.term}</h3>
          {term.synonyms.length > 0 && (
            <span className="text-body-sm text-text-tertiary">({term.synonyms.join(', ')})</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {term.categories.map((category) => (
            <CategoryBadge key={category} category={category} label={categories[category]} />
          ))}
        </div>
        <p className="m-0 mt-1 text-body-sm text-text-secondary">{term.definition}</p>
        {term.pageLinks.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-body-tiny font-medium text-text-tertiary">Used in:</span>
            {term.pageLinks.map((page, i) => (
              <Fragment key={page.url}>
                <Link href={page.url} className="text-body-sm text-text-links hover:underline">
                  {page.title}
                </Link>
                {i < term.pageLinks.length - 1 && <span className="text-text-tertiary">·</span>}
              </Fragment>
            ))}
          </div>
        )}
        {related.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-tiny font-medium text-text-tertiary">Related:</span>
            {related.map((other, i) => (
              <Fragment key={other.id}>
                <a href={`#${other.id}`} className="text-body-sm text-text-links hover:underline">
                  {other.term}
                </a>
                {i < related.length - 1 && <span className="text-text-tertiary">·</span>}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GlossaryBrowser({ terms, categories }: { terms: ResolvedGlossaryTerm[]; categories: Categories }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<GlossaryCategory[]>([]);

  const termsById = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);
  // only offer filters for categories that have terms
  const usedCategories = (Object.keys(categories) as GlossaryCategory[]).filter((category) =>
    terms.some((term) => term.categories.includes(category)),
  );

  const toggleCategory = (category: GlossaryCategory) =>
    setActiveCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );

  const clearFilters = () => {
    setActiveCategories([]);
    setSearchQuery('');
  };

  const filteredTerms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return terms.filter((term) => {
      const matchesSearch =
        q === '' ||
        term.term.toLowerCase().includes(q) ||
        term.definition.toLowerCase().includes(q) ||
        term.synonyms.some((s) => s.toLowerCase().includes(q));
      const matchesCategories =
        activeCategories.length === 0 || term.categories.some((c) => activeCategories.includes(c));
      return matchesSearch && matchesCategories;
    });
  }, [terms, searchQuery, activeCategories]);

  const groupedTerms = useMemo(() => {
    const groups = new Map<string, ResolvedGlossaryTerm[]>();
    for (const term of filteredTerms) {
      const letter = term.term[0].toUpperCase();
      groups.set(letter, [...(groups.get(letter) ?? []), term]);
    }
    return groups;
  }, [filteredTerms]);

  const alphabet = Array.from(new Set(terms.map((term) => term.term[0].toUpperCase()))).sort();
  const hasActiveFilters = activeCategories.length > 0 || searchQuery !== '';

  return (
    <div className="mt-6">
      <div className="sticky top-(--fd-nav-height) z-10 -mt-2 mb-4 border-b border-line-structure bg-surface-1/95 pb-4 pt-2 backdrop-blur">
        <Input
          className="mb-4"
          type="text"
          placeholder="Search terms..."
          aria-label="Search terms"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leadingIcon={<IconSearch className="size-4" />}
          trailingAction={
            searchQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="hover:text-text-primary"
              >
                <IconX className="size-4" />
              </button>
            ) : undefined
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-body-sm text-text-tertiary">Filter:</span>
          {usedCategories.map((category) => (
            <CategoryBadge
              key={category}
              category={category}
              label={categories[category]}
              onClick={() => toggleCategory(category)}
              isActive={activeCategories.includes(category)}
            />
          ))}
          {hasActiveFilters && (
            <Button variant="subtle" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-1 text-sm">
          {alphabet.map((letter) => {
            const active = groupedTerms.has(letter);
            return (
              <a
                key={letter}
                href={active ? `#letter-${letter}` : undefined}
                className={cn(
                  'flex size-7 items-center justify-center rounded-lg text-body-sm no-underline transition-colors',
                  active
                    ? 'font-medium text-text-brand hover:bg-surface-brand-soft-hover'
                    : 'cursor-default text-text-disabled',
                )}
              >
                {letter}
              </a>
            );
          })}
        </div>
      </div>

      <p className="mb-4 text-body-sm text-text-tertiary">
        Showing {filteredTerms.length} of {terms.length} terms
      </p>

      {filteredTerms.length === 0 ? (
        <EmptyState
          title="No terms found"
          description="Nothing matches the current search and filters."
          action={
            <Button variant="neutral" size="md" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        Array.from(groupedTerms.entries()).map(([letter, group]) => (
          <div key={letter} id={`letter-${letter}`} className="mb-6">
            <h2 className="mb-2 scroll-mt-48 border-b border-line-structure pb-2 text-heading font-semibold text-text-primary">
              {letter}
            </h2>
            {group.map((term) => (
              <GlossaryEntry key={term.id} term={term} termsById={termsById} categories={categories} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
