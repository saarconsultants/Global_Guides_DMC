'use server';
import { db } from '@/lib/db/client';
import { requireSuperAdmin } from '@/lib/auth/ctx';
import { revalidatePath } from 'next/cache';

export async function setAgencyStatusAction(agencyId: string, formData: FormData) {
  await requireSuperAdmin();
  const status = String(formData.get('status') ?? 'ACTIVE');
  if (!['ACTIVE', 'PENDING', 'SUSPENDED'].includes(status)) return;
  await db.agency.update({ where: { id: agencyId }, data: { status } });
  revalidatePath('/admin/agencies');
  revalidatePath(`/admin/agencies/${agencyId}`);
}

export async function createAgencyManualAction(formData: FormData) {
  await requireSuperAdmin();
  const name    = String(formData.get('name') ?? '').trim();
  const email   = String(formData.get('email') ?? '').trim().toLowerCase();
  const contact = (formData.get('contact') as string) || null;
  const markup  = parseFloat(String(formData.get('markupPct') ?? '15')) || 15;
  if (!name || !email) throw new Error('Agency name and email are required');

  const count = await db.agency.count();
  const code  = `GGN${String(count + 1).padStart(6, '0')}`;
  const slug  = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || `agency-${Date.now().toString(36)}`;
  const slugTaken = await db.agency.findUnique({ where: { slug } });
  const finalSlug = slugTaken ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;

  const agency = await db.agency.create({
    data: {
      code, slug: finalSlug, name, email, contact,
      status: 'ACTIVE', markupPct: markup,
      primaryColor: '#0369A1', accentColor: '#C9A24A',
    },
  });
  revalidatePath('/admin/agencies');
  const { redirect } = await import('next/navigation');
  redirect(`/admin/agencies/${agency.id}`);
}

export async function updateAgencyMarkupAction(agencyId: string, formData: FormData) {
  await requireSuperAdmin();
  const markupPct = parseFloat(String(formData.get('markupPct') ?? '15'));
  if (isNaN(markupPct) || markupPct < 0 || markupPct > 100) return;
  await db.agency.update({ where: { id: agencyId }, data: { markupPct } });
  revalidatePath(`/admin/agencies/${agencyId}`);
}

export async function creditAgencyWalletAction(agencyId: string, formData: FormData) {
  await requireSuperAdmin();
  const rupees = parseInt(String(formData.get('rupees') ?? '0'), 10);
  if (!rupees || rupees < 0) return;
  const note = (formData.get('note') as string) || 'Admin manual credit';
  const paise = BigInt(rupees * 100);
  await db.$transaction(async (tx) => {
    await tx.walletTxn.create({ data: { agencyId, type: 'CREDIT', amountPaise: paise, note, ref: 'admin-manual' } });
    await tx.agency.update({ where: { id: agencyId }, data: { walletPaise: { increment: paise } } });
  });
  revalidatePath(`/admin/agencies/${agencyId}`);
}

export async function saveCommissionRuleAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get('id') ?? '');
  const data = {
    agencyId: (formData.get('agencyId') as string) || null,
    productType: String(formData.get('productType') ?? 'INVOICE_TOTAL'),
    percent: formData.get('percent') ? parseFloat(String(formData.get('percent'))) : null,
    flatPaise: formData.get('flatPaise') ? BigInt(formData.get('flatPaise') as string) : null,
    appliesTo: String(formData.get('appliesTo') ?? 'TOTAL'),
    active: formData.get('active') === 'on',
    note: (formData.get('note') as string) || null,
  };
  if (id) await db.commissionRule.update({ where: { id }, data });
  else await db.commissionRule.create({ data });
  revalidatePath('/admin/commissions');
}

export async function deleteCommissionRuleAction(id: string) {
  await requireSuperAdmin();
  await db.commissionRule.delete({ where: { id } });
  revalidatePath('/admin/commissions');
}

export async function saveTemplateAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get('id') ?? '');
  const data: any = {
    code:          String(formData.get('code')          ?? `TPL-${Date.now().toString(36).toUpperCase()}`),
    title:         String(formData.get('title')         ?? 'Untitled template'),
    region:        String(formData.get('region')        ?? 'EUROPE'),
    category:      String(formData.get('category')      ?? 'LEISURE'),
    totalNights:   parseInt(String(formData.get('totalNights') ?? '7'), 10),
    startingPricePaise: BigInt(parseInt(String(formData.get('startingPriceRupees') ?? '0'), 10) * 100),
    blurb:         String(formData.get('blurb')         ?? ''),
    destinations:  String(formData.get('destinations')  ?? '[]'),
    daysJson:      String(formData.get('daysJson')      ?? '[]'),
    visaJson:      String(formData.get('visaJson')      ?? '[]'),
    insuranceJson: String(formData.get('insuranceJson') ?? '{}'),
    published:     formData.get('published') === 'on',
    hero:          (formData.get('hero') as string) || null,
  };
  if (id) await db.itineraryTemplate.update({ where: { id }, data });
  else await db.itineraryTemplate.create({ data });
  revalidatePath('/admin/templates');
  revalidatePath('/suggested');
}

export async function deleteTemplateAction(id: string) {
  await requireSuperAdmin();
  await db.itineraryTemplate.delete({ where: { id } });
  revalidatePath('/admin/templates');
  revalidatePath('/suggested');
}

export async function toggleTemplatePublishedAction(id: string) {
  await requireSuperAdmin();
  const t = await db.itineraryTemplate.findUnique({ where: { id }, select: { published: true } });
  if (!t) return;
  await db.itineraryTemplate.update({ where: { id }, data: { published: !t.published } });
  revalidatePath('/admin/templates');
  revalidatePath('/suggested');
}

export async function saveTemplateRedirectAction(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get('id') ?? '');
  const data: any = {
    code:          String(formData.get('code')          || `TPL-${Date.now().toString(36).toUpperCase()}`),
    title:         String(formData.get('title')         ?? 'Untitled template'),
    region:        String(formData.get('region')        ?? 'EUROPE'),
    category:      String(formData.get('category')      ?? 'LEISURE'),
    totalNights:   parseInt(String(formData.get('totalNights') ?? '7'), 10),
    startingPricePaise: BigInt(parseInt(String(formData.get('startingPriceRupees') ?? '0'), 10) * 100),
    blurb:         String(formData.get('blurb')         ?? ''),
    destinations:  String(formData.get('destinations')  ?? '[]'),
    daysJson:      String(formData.get('daysJson')      ?? '[]'),
    visaJson:      String(formData.get('visaJson')      ?? '[]'),
    insuranceJson: String(formData.get('insuranceJson') ?? '{}'),
    published:     formData.get('published') === 'on',
    hero:          (formData.get('hero') as string) || null,
  };
  if (id) await db.itineraryTemplate.update({ where: { id }, data });
  else    await db.itineraryTemplate.create({ data });
  revalidatePath('/admin/templates');
  revalidatePath('/suggested');
  const { redirect } = await import('next/navigation');
  redirect('/admin/templates');
}
