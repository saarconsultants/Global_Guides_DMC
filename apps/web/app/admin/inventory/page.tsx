import { requireSuperAdmin } from '@/lib/auth/ctx';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { inventoryStatus } from '@/lib/inventory-status';
import { Plane, Hotel, Car, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import { InventoryProbe } from '@/components/admin/inventory-probe';
import { AdminPage, Disclosure } from '@/components/admin/admin-ui';

export const dynamic = 'force-dynamic';

const ICONS: Record<string, any> = { flights: Plane, hotels: Hotel, transfers: Car, leamigo: Car, activities: MapPin };

/** Two suppliers both provide transfers, so the card title names the supplier. */
function cardTitle(key: string, label: string, provider: string) {
  if (key === 'transfers' || key === 'leamigo') return `${label} · ${provider.replace(/\s*\(.*\)$/, '')}`;
  return label;
}

/** Owner-only setup help: which keys each supplier needs. */
const SETUP: { name: string; keys: string[] }[] = [
  { name: 'Flights · Tripjack', keys: ['TRIPJACK_PROXY_TOKEN (or TRIPJACK_API_KEY)'] },
  { name: 'Hotels · Hotelbeds', keys: ['HOTELBEDS_HOTELS_API_KEY', 'HOTELBEDS_HOTELS_API_SECRET'] },
  { name: 'Transfers · Hotelbeds', keys: ['HOTELBEDS_TRANSFERS_API_KEY', 'HOTELBEDS_TRANSFERS_API_SECRET'] },
  { name: 'Activities · Hotelbeds', keys: ['HOTELBEDS_ACTIVITIES_API_KEY', 'HOTELBEDS_ACTIVITIES_API_SECRET'] },
  { name: 'Transfers · Leamigo', keys: ['LEAMIGO_API_KEY', 'LEAMIGO_BASE_URL (optional, defaults to the test server)'] },
];

export default async function AdminInventoryPage() {
  await requireSuperAdmin();
  const apis = inventoryStatus();
  const liveCount = apis.filter((a) => a.live).length;
  const allLive = liveCount === apis.length;
  const offCount = apis.length - liveCount;

  return (
    <AdminPage>
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">Inventory APIs</h1>
          <Pill variant={allLive ? 'success' : 'neutral'}>{liveCount} of {apis.length} connected</Pill>
        </div>
        <p className="text-[14.5px] text-[rgb(var(--text-secondary))] mt-2 max-w-2xl leading-relaxed">
          The suppliers behind the itinerary builder. Use &ldquo;Check now&rdquo; on a card to test the connection right now.
        </p>
      </header>

      {allLive ? (
        <div className="rounded-md border border-success-500/30 bg-success-100 text-success-600 px-4 py-3 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden /> All {apis.length} suppliers are connected. Agents get real flights, hotels, transfers and activities.
        </div>
      ) : (
        <div className="rounded-md border border-amber-300/60 bg-amber-100 text-amber-900 px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          {offCount} supplier{offCount !== 1 ? 's are' : ' is'} not connected yet. Agents see sample rates for {offCount !== 1 ? 'those' : 'it'} until connected.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {apis.map((a) => {
          const Icon = ICONS[a.key] ?? Plane;
          return (
            <Card key={a.key}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-5 shrink-0 inline-flex justify-center ${a.live ? 'text-success-500' : 'text-[rgb(var(--text-tertiary))]'}`}>
                      <Icon className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{cardTitle(a.key, a.label, a.provider)}</p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">{a.provider}</p>
                    </div>
                  </div>
                  <Pill variant={a.live ? 'success' : 'warning'}>{a.live ? 'Live' : 'Not connected'}</Pill>
                </div>
                <p className="text-sm text-[rgb(var(--text-secondary))] mt-3">
                  {a.live ? a.note.replace(/STAGING/g, 'test server') : 'Using sample rates until connected.'}
                </p>
                <InventoryProbe apiKey={a.key} live={a.live} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-5 text-[13px] text-[rgb(var(--text-secondary))] space-y-2">
          <p className="text-ink font-bold text-[15px]">How the status works</p>
          <p className="leading-relaxed">
            &ldquo;Live&rdquo; means the supplier&apos;s keys are in place, not that the supplier is answering right now. &ldquo;Check now&rdquo; makes a real call and shows whether it responded. Results are reused for about 5 minutes so busy suppliers aren&apos;t called too often.
          </p>
          <Disclosure summary="Setup details">
            <div className="space-y-3">
              <p>To connect a supplier, ask your developer to add its keys to the live site&apos;s settings and publish a new build.</p>
              <ul className="space-y-2">
                {SETUP.map((s) => (
                  <li key={s.name}>
                    <p className="font-semibold text-ink">{s.name}</p>
                    <p className="font-mono text-[11.5px] break-all">{s.keys.join(' · ')}</p>
                  </li>
                ))}
              </ul>
              <p>The Leamigo card&apos;s &ldquo;Check now&rdquo; also lists the countries its operators cover.</p>
            </div>
          </Disclosure>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
