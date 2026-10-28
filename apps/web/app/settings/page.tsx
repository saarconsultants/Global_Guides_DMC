import { PageHeader } from '@/components/ui/page-header';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { BrandingForm } from '@/components/settings/branding-form';
import { SettingsTabs, SETTINGS_CONTAINER } from '@/components/settings/settings-tabs';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const actor = await requireAgency();
  const agency = await db.agency.findUnique({ where: { id: actor.agencyId } });
  if (!agency) return null;

  return (
    <div className={SETTINGS_CONTAINER}>
      <PageHeader
        title="Settings"
        description="Agency profile, white-label branding, markup and team. These affect what your customers see on every share link."
        actions={<span className="text-xs text-[rgb(var(--text-secondary))]">Agency ID · <span className="font-mono">{agency.code}</span></span>}
      />
      <SettingsTabs active="profile" />
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
