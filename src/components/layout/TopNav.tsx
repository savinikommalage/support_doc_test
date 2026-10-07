'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { IconBook, IconBookA, IconMoon, IconNotebookPen, IconSearch, IconSun } from './icons';
import { IconButton, cn } from '@/components/ui';

export const SECTIONS = [
  { title: 'Knowledge Base', href: '/docs', Icon: IconBook },
  { title: 'Glossary', href: '/docs/glossary', Icon: IconBookA },
  { title: 'Notes', href: '/notes', Icon: IconNotebookPen },
] as const;

function sectionIsActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === '/docs' && pathname === '/docs/glossary') return false;
  return pathname === href || pathname.startsWith(href + '/');
}

function SearchBar() {
  const { setOpenSearch, enabled } = useSearchContext();
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className="border-line-structure bg-surface-bg text-text-tertiary hover:border-line-brand-soft flex h-9 w-full max-w-105 items-center gap-2 rounded-lg border px-3 text-body-sm transition-colors"
    >
      <IconSearch className="size-4 shrink-0" />
      <span className="flex-1 text-left">Search the knowledge base...</span>
      <kbd className="border-line-structure bg-surface-1 text-text-tertiary rounded border px-1.5 py-0.5 text-body-tiny">
        Ctrl K
      </kbd>
    </button>
  );
}

function SearchBarCompact() {
  const { setOpenSearch, enabled } = useSearchContext();
  if (!enabled) return null;
  return (
    <IconButton
      variant="neutral"
      aria-label="Search"
      onClick={() => setOpenSearch(true)}
      icon={<IconSearch className="size-4" />}
    />
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <IconButton
      variant="neutral"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      icon={
        mounted && resolvedTheme === 'dark' ? <IconMoon className="size-4" /> : <IconSun className="size-4" />
      }
    />
  );
}

function Logo() {
  return (
    <Link href="/docs" className="flex shrink-0 items-baseline gap-2">
      <span className="text-heading font-semibold tracking-tight text-text-primary">Support</span>
      <span className="hidden text-body-sm font-medium text-text-tertiary md:inline">Docs</span>
    </Link>
  );
}

export function TopNav() {
  return (
    <header
      className="bg-surface-1 border-line-structure sticky z-50 h-(--nav-primary-height) border-b"
      style={{ top: 'var(--fd-banner-height, 0px)' }}
    >
      <nav className="mx-auto flex h-full max-w-380 items-center gap-4 px-4">
        <div className="flex min-w-0 shrink-0 items-center lg:w-60">
          <Logo />
        </div>
        <div className="hidden flex-1 justify-center lg:flex">
          <SearchBar />
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 lg:w-60 lg:flex-none">
          <div className="lg:hidden">
            <SearchBarCompact />
          </div>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

// inside docs the mobile sidebar header takes over, other pages keep the tabs on small screens
export function SectionTabs({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const pathname = usePathname();
  return (
    <div
      className={cn(
        'bg-surface-1 sticky z-50 overflow-x-auto overflow-y-hidden',
        alwaysVisible ? 'block' : 'hidden md:block',
      )}
      style={{ top: 'calc(var(--fd-banner-height, 0px) + var(--nav-primary-height))' }}
    >
      <nav className="border-line-structure mx-auto max-w-380 border-b px-4">
        <div className="flex items-stretch gap-6">
          {SECTIONS.map((item) => {
            const isActive = sectionIsActive(item.href, pathname);
            return (
              <Link
                href={item.href}
                key={item.href}
                className={cn(
                  '-mb-px flex h-(--nav-secondary-height) shrink-0 items-center gap-2 border-b-2 text-body-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-text-brand text-text-brand'
                    : 'text-text-secondary hover:text-text-primary border-transparent',
                )}
              >
                <item.Icon className="size-4 shrink-0" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
