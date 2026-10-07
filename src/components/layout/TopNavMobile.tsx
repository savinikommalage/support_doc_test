'use client';

import { usePathname } from 'next/navigation';
import { useSidebar } from 'fumadocs-ui/components/sidebar/base';
import { useTreePath } from 'fumadocs-ui/contexts/tree';
import { IconChevronRight, IconMenu, IconX } from './icons';
import { SECTIONS } from './TopNav';
import { IconButton } from '@/components/ui';

function pageNameFromPath(pathname: string | null): string | null {
  const slug = pathname?.split('/').filter(Boolean).pop();
  if (!slug) return null;
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function TopNavMobile() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const treePath = useTreePath();

  const activeSection = [...SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((section) => pathname?.startsWith(section.href));
  const treeNode = treePath.length > 0 ? treePath[treePath.length - 1] : null;
  const pageName = (treeNode && 'name' in treeNode ? treeNode.name : null) ?? pageNameFromPath(pathname);
  const isRoot = activeSection && pathname === activeSection.href;

  return (
    <div
      className="sticky z-40 flex h-(--nav-secondary-height) items-center gap-2 border-b border-line-structure bg-surface-1 px-3 md:hidden"
      style={{ top: 'calc(var(--fd-banner-height, 0px) + var(--nav-primary-height))' }}
    >
      <IconButton
        variant="subtle"
        size="sm"
        aria-label={open ? 'Close Sidebar' : 'Open Sidebar'}
        onClick={() => setOpen((prev) => !prev)}
        icon={open ? <IconX /> : <IconMenu />}
      />
      <span className="text-body-sm text-text-tertiary">{activeSection?.title ?? 'Knowledge Base'}</span>
      {pageName && !isRoot && (
        <>
          <IconChevronRight className="size-3.5 shrink-0 text-text-tertiary" />
          <span className="truncate text-body-sm font-medium text-text-primary">{pageName}</span>
        </>
      )}
    </div>
  );
}
