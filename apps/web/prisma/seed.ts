// Seed script — creates a super-admin + a default agency + sample templates + default commission rules.
// Run: `npx tsx prisma/seed.ts` (after `npm install tsx` or via npm script).

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  console.log('🌱  Seeding Global Guides…');

  // 1. Super-Admin (Bipin in his platform-owner hat)
  const superAdminEmail = 'admin@globalguides.com';
  const superAdminPwd   = 'admin123';
  const adminHash = await bcrypt.hash(superAdminPwd, 10);

  await db.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: { email: superAdminEmail, name: 'Bipin (Super-Admin)', passwordHash: adminHash, role: 'SUPER_ADMIN', agencyId: null },
  });
  console.log(`   • super-admin   ${superAdminEmail} / ${superAdminPwd}`);

  // 2. Default agency for Bipin's own travel ops
  const agency = await db.agency.upsert({
    where: { code: 'GGN000001' },
    // NEVER overwrite branding on re-seed. The seed runs on every deploy, and the
    // agency edits logo/colors/tagline in Settings (saved to the DB). An update block
    // here would clobber those edits back to defaults on each deploy. Create-only.
    update: {},
    create: {
      code: 'GGN000001',
      slug: 'global-guides',
      name: 'Global Guides DMC LLP',
      contact: '8378073375',
      email: 'travel@globalguidesdmc.com',
      status: 'ACTIVE',
      logoUrl: '/brand/ggdmc-logo.svg',
      primaryColor: '#630909',
      accentColor: '#FFBA06',
      tagline: 'One World. One DMC.',
      supportEmail: 'travel@globalguidesdmc.com',
      supportPhone: '8378073375',
      footerText: 'Global Guides DMC LLP · Pune · India',
      markupPct: 15,
    },
  });
  console.log(`   • agency        ${agency.name} [${agency.code}]`);

  // 3. Bipin as agency owner of that agency
  const ownerEmail = 'travel@globalguidesdmc.com';
  const ownerPwd   = 'agent123';
  const ownerHash = await bcrypt.hash(ownerPwd, 10);
  await db.user.upsert({
    where: { email: ownerEmail },
    update: { agencyId: agency.id, role: 'AGENCY_OWNER' },
    create: { email: ownerEmail, name: 'Bipin (Global Guides)', passwordHash: ownerHash, role: 'AGENCY_OWNER', agencyId: agency.id },
  });
  console.log(`   • agency owner  ${ownerEmail} / ${ownerPwd}`);

  // 4. A second demo agency so multi-tenancy is visible
  const demoAgency = await db.agency.upsert({
    where: { code: 'GGN000002' },
    update: {},
    create: {
      code: 'GGN000002', slug: 'wandermark-travels',
      name: 'Wandermark Travels Pvt Ltd',
      email: 'demo@wandermark.in', contact: '9000000000',
      status: 'ACTIVE',
      primaryColor: '#7C3AED', accentColor: '#F59E0B',
      tagline: 'Curated journeys, curated for you.',
      supportEmail: 'demo@wandermark.in', supportPhone: '9000000000',
      markupPct: 18,
    },
  });
  await db.user.upsert({
    where: { email: 'demo@wandermark.in' },
    update: { agencyId: demoAgency.id, role: 'AGENCY_OWNER' },
    create: { email: 'demo@wandermark.in', name: 'Wandermark Owner', passwordHash: ownerHash, role: 'AGENCY_OWNER', agencyId: demoAgency.id },
  });
  console.log(`   • demo agency   ${demoAgency.name} [${demoAgency.code}]`);

  // 5. Default platform-wide commission rules
  const defaultRules = [
    { productType: 'FLIGHT',         percent: 3,   appliesTo: 'TOTAL', note: 'Platform commission on flight bookings' },
    { productType: 'HOTEL',          percent: 8,   appliesTo: 'TOTAL', note: 'Platform commission on hotel bookings' },
    { productType: 'TRANSFER',       percent: 10,  appliesTo: 'TOTAL', note: 'Platform commission on transfers' },
    { productType: 'ACTIVITY',       percent: 12,  appliesTo: 'TOTAL', note: 'Platform commission on activities/tours' },
    { productType: 'VISA',           percent: 5,   appliesTo: 'TOTAL', note: 'Platform commission on visa services' },
    { productType: 'INSURANCE',      percent: 20,  appliesTo: 'TOTAL', note: 'Platform commission on insurance' },
  ];
  for (const r of defaultRules) {
    const existing = await db.commissionRule.findFirst({ where: { agencyId: null, productType: r.productType } });
    if (!existing) await db.commissionRule.create({ data: { ...r } });
  }
  console.log(`   • commission rules: ${defaultRules.length} platform defaults`);

  // 6. A couple of starter Itinerary Templates
  const templates = [
    {
      code: 'TPL-EUR-7N',
      title: 'Best of Western Europe · 7N',
      region: 'EUROPE', category: 'LEISURE',
      totalNights: 7,
      startingPricePaise: BigInt(15_50_000 * 100),
      blurb: 'Paris romance, Amsterdam canals, Zurich Alps — a sampler perfect for first-timers.',
      destinations: JSON.stringify([
        { cityCode: 'PAR', cityName: 'Paris',    countryCode: 'FR', nights: 3 },
        { cityCode: 'AMS', cityName: 'Amsterdam',countryCode: 'NL', nights: 2 },
        { cityCode: 'ZRH', cityName: 'Zurich',   countryCode: 'CH', nights: 2 },
      ]),
      daysJson: '[]', visaJson: '[]', insuranceJson: '{}',
    },
    {
      code: 'TPL-MLE-5N',
      title: 'Maldives Honeymoon · 5N',
      region: 'SE_ASIA', category: 'HONEYMOON',
      totalNights: 5,
      startingPricePaise: BigInt(2_25_000 * 100),
      blurb: 'Overwater villa in a quiet atoll, snorkel reef, sunset dolphin cruise.',
      destinations: JSON.stringify([
        { cityCode: 'MLE', cityName: 'Maldives', countryCode: 'MV', nights: 5 },
      ]),
      daysJson: '[]', visaJson: '[]', insuranceJson: '{}',
    },
    {
      code: 'TPL-DXB-4N',
      title: 'Dubai Family Quick Break · 4N',
      region: 'MIDDLE_EAST', category: 'FAMILY',
      totalNights: 4,
      startingPricePaise: BigInt(85_000 * 100),
      blurb: 'Burj Khalifa, desert safari, JBR beach. Direct flights, easy logistics.',
      destinations: JSON.stringify([
        { cityCode: 'DXB', cityName: 'Dubai', countryCode: 'AE', nights: 4 },
      ]),
      daysJson: '[]', visaJson: '[]', insuranceJson: '{}',
    },
  ];
  for (const t of templates) {
    await db.itineraryTemplate.upsert({ where: { code: t.code }, update: {}, create: t });
  }
  console.log(`   • templates     ${templates.length} starter itineraries`);

  console.log('\n✓ Seed done. Login at /login with:');
  console.log(`    Super-Admin:   admin@globalguides.com         / admin123`);
  console.log(`    Agency Owner:  travel@globalguidesdmc.com     / agent123`);
  console.log(`    Demo Agency:   demo@wandermark.in             / agent123`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
