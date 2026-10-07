import { SectionTabs, TopNav } from '@/components/layout/TopNav';

export default function Layout({ children }: LayoutProps<'/edit'>) {
  return (
    <div className="docs-chrome-plain">
      <TopNav />
      <SectionTabs alwaysVisible />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
