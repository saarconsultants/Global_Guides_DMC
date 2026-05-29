'use server';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { revalidatePath } from 'next/cache';

export async function saveAgencyBrandingAction(formData: FormData): Promise<void> {
  const actor = await requireAgency();
  const name         = String(formData.get('name')         ?? '').trim();
  const tagline      = String(formData.get('tagline')      ?? '').trim();
  const logoUrl      = String(formData.get('logoUrl')      ?? '').trim();
  const primaryColor = String(formData.get('primaryColor') ?? '').trim();
  const accentColor  = String(formData.get('accentColor')  ?? '').trim();
  const footerText   = String(formData.get('footerText')   ?? '').trim();
  const supportEmail = String(formData.get('supportEmail') ?? '').trim();
  const supportPhone = String(formData.get('supportPhone') ?? '').trim();
  const markupPctStr = String(formData.get('markupPct')    ?? '');
  const markupPct    = markupPctStr ? parseFloat(markupPctStr) : undefined;

  if (!name) { console.error('[branding] name required'); return; }
  if (primaryColor && !/^#[0-9a-fA-F]{6}$/.test(primaryColor)) { console.error('[branding] bad primary'); return; }
  if (accentColor  && !/^#[0-9a-fA-F]{6}$/.test(accentColor))  { console.error('[branding] bad accent');  return; }

  await db.agency.update({
    where: { id: actor.agencyId },
    data: {
      name, tagline: tagline || null, logoUrl: logoUrl || null,
      primaryColor: primaryColor || null, accentColor: accentColor || null,
      footerText: footerText || null, supportEmail: supportEmail || null, supportPhone: supportPhone || null,
      ...(typeof markupPct === 'number' && !Number.isNaN(markupPct) ? { markupPct } : {}),
    },
  });
  revalidatePath('/settings');
  revalidatePath('/');
}

export async function saveSalesSettingsAction(formData: FormData): Promise<void> {
  const actor = await requireAgency();
  const defaultPct = parseFloat(String(formData.get('markupPct') ?? '15'));
  if (isNaN(defaultPct) || defaultPct < 0 || defaultPct > 100) return;

  const types = ['FLIGHT', 'HOTEL', 'TRANSFER', 'ACTIVITY', 'VISA', 'INSURANCE'] as const;
  const overrides: Record<string, number> = {};
  for (const t of types) {
    const raw = String(formData.get(`markup_${t}`) ?? '').trim();
    if (raw === '') continue;
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= 0 && v <= 100) overrides[t] = v;
  }

  await db.agency.update({
    where: { id: actor.agencyId },
    data: {
      markupPct: defaultPct,
      markupConfigJson: Object.keys(overrides).length ? JSON.stringify(overrides) : null,
    },
  });
  revalidatePath('/settings');
  revalidatePath('/settings/sales');
}
