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
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <PageHeader
        title="Settings"
        description="Agency profile, white-label branding, and markup defaults. These affect what your customers see on every share link."
        actions={<span className="text-xs text-[rgb(var(--text-secondary))]">Agency ID · <span className="font-mono">{agency.code}</span></span>}
      />
      <nav className="flex flex-wrap gap-3 text-sm">
        <a href="/settings" className="px-3 py-1.5 rounded-md bg-navy-900 text-white font-medium">Profile &amp; branding</a>
        <a href="/settings/sales" className="px-3 py-1.5 rounded-md text-navy-700 hover:bg-navy-50 font-medium">Sales &amp; markup</a>
        <a href="/settings/team" className="px-3 py-1.5 rounded-md text-navy-700 hover:bg-navy-50 font-medium">Team</a>
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
