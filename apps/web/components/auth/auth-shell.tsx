import { Card, CardContent } from '@/components/ui/card';

/**
 * The one sign-in / sign-up layout: an ink (or photo) brand panel on the left
 * at lg+, the form card on the right. Below lg the panel is hidden and the
 * logo sits at the top of the card instead.
 */
export function AuthShell({
  panelTitle,
  panelBody,
  panelExtra,
  title,
  subtitle,
  children,
  footer,
}: {
  panelTitle: string;
  panelBody?: string;
  panelExtra?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      <div className="hidden lg:flex relative overflow-hidden bg-ink text-white items-end p-12">
        {/* Optional photo (public/promos/login.jpg). A CSS background so a missing
            file simply leaves the plain ink plate — no broken-image box. The
            scrim keeps the headline legible over a photo. */}
        <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/promos/login.jpg)' }} />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,18,0.15)_0%,rgba(10,12,18,0.35)_45%,rgba(10,12,18,0.9)_100%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/ggdmc-logo-white.svg" alt="Global Guides DMC" className="absolute top-10 left-12 h-11 w-auto" />
        <div className="relative max-w-lg">
          <p className="text-[40px] leading-[1.02] font-extrabold tracking-[-0.02em] [text-wrap:balance]">{panelTitle}</p>
          {panelBody && <p className="mt-4 text-white/80 leading-relaxed text-[15px]">{panelBody}</p>}
          {panelExtra && <div className="mt-6">{panelExtra}</div>}
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-8 sm:p-6 lg:p-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 px-5 sm:px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/ggdmc-logo.svg" alt="Global Guides DMC" className="lg:hidden h-10 w-auto mb-6" />
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
            {subtitle && <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">{subtitle}</p>}
            <div className="mt-6">{children}</div>
            {footer && <p className="mt-6 text-sm text-[rgb(var(--text-secondary))] text-center">{footer}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
