import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/auth/ctx';
import { listWalletTxns, getWalletBalance } from '@/lib/db/wallet';
import { csvFromRows } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await requireAgency();
  const [txns, balance] = await Promise.all([listWalletTxns(), getWalletBalance()]);

  const headers = ['Date', 'Type', 'Reference', 'Note', 'Amount (INR)'];
  const rows = txns.map((t) => [
    t.createdAt.toISOString().slice(0, 10),
    t.type,
    t.ref ?? '',
    t.note ?? '',
    (t.type === 'DEBIT' ? -1 : 1) * (Number(t.amountPaise) / 100),
  ]);
  rows.push([]); // separator
  rows.push(['', '', '', 'Balance', Number(balance) / 100]);
  const csv = csvFromRows(headers, rows);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="account-statement-${actor.agency?.code ?? 'agency'}-${new Date().toISOString().slice(0,10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
