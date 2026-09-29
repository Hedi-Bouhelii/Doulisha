import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { UtmCapture } from '@/components/layout/utm-capture';

/** Public pages: header, content, green footer band. */
export default function SiteLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
      <UtmCapture />
    </>
  );
}
