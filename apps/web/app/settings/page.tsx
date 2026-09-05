import { PageHeader } from '@/components/ui/page-header';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { BrandingForm } from '@/components/settings/branding-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const actor = await requireAgency();
  const agency = await db.agency.findUnique({ where: { id: actor.agencyId } });
  if (!agency) return null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:py-10 space-y-6">
      <PageHeader
        title="Settings"
        description="Agency profile, white-label branding, and markup defaults. These affect what your customers see on every share link."
        actions={<span className="text-xs text-[rgb(var(--text-secondary))]">Agency ID · <span className="font-mono">{agency.code}</span></span>}
      />
      <nav className="flex flex-wrap gap-2 text-[13px]">
        <a href="/settings" className="px-3.5 h-9 inline-flex items-center rounded-md bg-ink text-white font-bold">Profile &amp; branding</a>
        <a href="/settings/sales" className="px-3.5 h-9 inline-flex items-center rounded-md bg-surface border border-border text-navy-700 hover:border-border-strong font-bold">Sales &amp; markup</a>
        <a href="/settings/team" className="px-3.5 h-9 inline-flex items-center rounded-md bg-surface border border-border text-navy-700 hover:border-border-strong font-bold">Team</a>
      </nav>
      <BrandingForm
        initial={{
          name: agency.name, tagline: agency.tagline, logoUrl: agency.logoUrl,
          primaryColor: agency.primaryColor, accentColor: agency.accentColor,
          footerText: agency.footerText, supportEmail: agency.supportEmail ?? agency.email,
          supportPhone: agency.supportPhone ?? agency.contact, markupPct: agency.markupPct,
        }}
      />
    </div>
  );
}
