import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/ctx';
import { listAllCommissions } from '@/lib/db/commissions';
import { db } from '@/lib/db/client';
import { csvFromRows } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await requireSuperAdmin();
  const url = new URL(req.url);
  const days = url.searchParams.get('days') ?? '30';
  let since: Date | undefined;
  if (days !== 'all') { since = new Date(); since.setDate(since.getDate() - parseInt(days, 10)); }

  const [rows, agencies] = await Promise.all([
    listAllCommissions({ take: 5000 }),
    db.agency.findMany({ select: { id: true, name: true, code: true } }),
  ]);
  const filtered = rows.filter((r) => (!since || r.createdAt >= since));

  const headers = ['Date', 'Agency code', 'Agency name', 'Proposal ID', 'Product', 'Basis (INR)', 'Amount (INR)', 'Note'];
  const tableRows = filtered.map((r) => {
    const a = agencies.find((x) => x.id === r.agencyId);
    return [
      r.createdAt.toISOString().slice(0, 19).replace('T', ' '),
      a?.code ?? '',
      a?.name ?? '',
      r.proposalId,
      r.productType,
      Number(r.basisPaise) / 100,
      Number(r.amountPaise) / 100,
      r.note ?? '',
    ];
  });
  const csv = csvFromRows(headers, tableRows);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="revenue-${days}-${new Date().toISOString().slice(0,10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
