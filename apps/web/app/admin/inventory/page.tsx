import { requireSuperAdmin } from '@/lib/auth/ctx';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { inventoryStatus } from '@/lib/inventory-status';
import { Plane, Hotel, Car, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ICONS: Record<string, any> = { flights: Plane, hotels: Hotel, transfers: Car, activities: MapPin };

export default async function AdminInventoryPage() {
  await requireSuperAdmin();
  const apis = inventoryStatus();
  const liveCount = apis.filter((a) => a.live).length;
  const allLive = liveCount === apis.length;

  return (
    <div className="p-8 space-y-6 ambient">
      <PageHeader
        eyebrow="Platform"
        title="Inventory APIs"
        description="Live status of every supplier API powering the itinerary builder. 'Live' means the credentials are present in this environment."
        actions={<Pill variant={allLive ? 'success' : 'warning'}>{liveCount}/{apis.length} live</Pill>}
      />

      {allLive ? (
        <div className="rounded-md border border-success-500/30 bg-success-100 text-success-500 px-4 py-3 text-sm inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> All four inventory APIs are live. Agents get real flights, hotels, transfers, and activities end-to-end.
        </div>
      ) : (
        <div className="rounded-md border border-warning-500/30 bg-amber-50 text-amber-700 px-4 py-3 text-sm inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {apis.length - liveCount} API{apis.length - liveCount !== 1 ? 's are' : ' is'} on mock data. Set the env vars below in Vercel and redeploy to go live.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {apis.map((a) => {
          const Icon = ICONS[a.key] ?? Plane;
          return (
            <Card key={a.key} className="lift">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-md inline-flex items-center justify-center ${a.live ? 'bg-success-100 text-success-500' : 'bg-amber-500/15 text-amber-700'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy-900">{a.label}</p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">{a.provider}</p>
                    </div>
                  </div>
                  <Pill variant={a.live ? 'success' : 'warning'}>{a.live ? 'LIVE' : 'MOCK'}</Pill>
                </div>
                <p className="text-sm text-[rgb(var(--text-secondary))] mt-3">{a.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6 text-xs text-[rgb(var(--text-secondary))] space-y-2">
          <p className="text-navy-900 font-semibold text-sm">How status is determined</p>
          <p>Each API is "live" when its credentials are present in this deployment's environment variables. This page reads them server-side — it does not make a test call, so a "LIVE" badge means "keys are configured", not "supplier is currently responding". For a real round-trip check, run a search on the relevant page (Flights, Hotels) and look for the LIVE pill on the results.</p>
          <p className="pt-2">Env vars: <span className="font-mono">TRIPJACK_PROXY_TOKEN</span> (flights), <span className="font-mono">HOTELBEDS_HOTELS_API_KEY</span>, <span className="font-mono">HOTELBEDS_TRANSFERS_API_KEY</span>, <span className="font-mono">HOTELBEDS_ACTIVITIES_API_KEY</span> — each with its matching <span className="font-mono">_SECRET</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
