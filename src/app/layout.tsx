import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Roboto, Roboto_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import { appName } from '@/lib/shared';

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: 'Troubleshooting guides, procedures and reference for the support and field service team',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${roboto.variable} ${robotoMono.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <RootProvider theme={{ defaultTheme: 'light', enableSystem: false }}>{children}</RootProvider>
      </body>
    </html>
  );
}
