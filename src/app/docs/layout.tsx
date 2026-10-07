import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { SectionTabs, TopNav } from '@/components/layout/TopNav';
import { TopNavMobile } from '@/components/layout/TopNavMobile';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <div className="docs-chrome flex min-h-screen flex-col">
      <TopNav />
      <SectionTabs />
      <DocsLayout
        tree={source.getPageTree()}
        nav={{ component: <TopNavMobile /> }}
        searchToggle={{ enabled: false }}
        sidebar={{ collapsible: false }}
      >
        {children}
      </DocsLayout>
    </div>
  );
}
