import { getHotelDetail, isLive } from '@gg/hotelbeds';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { HotelDetailGallery } from '@/components/hotels/hotel-detail-gallery';
import { Star, MapPin, Mail, Phone, Globe, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function HotelDetailPage({ params, searchParams }: PageProps) {
  const { code: raw } = await params;
  const sp = await searchParams;
  const code = parseInt(raw.replace(/^HB-/, ''), 10);

  if (!isLive('hotels')) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <PageHeader title="Hotel details" description="Live hotel content isn't available — set HOTELBEDS_API_KEY to enable property pages." />
      </div>
    );
  }

  if (!Number.isFinite(code)) notFound();
  const hotel = await getHotelDetail(code);
  if (!hotel) notFound();

  const backHref = sp.from ? decodeURIComponent(sp.from) : '/hotels';

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <Link href={backHref as any} className="inline-flex items-center gap-1.5 text-sm text-crimson-700 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to results
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {hotel.stars && (
            <span className="inline-flex items-center gap-0.5 text-gold-500">
              {Array.from({ length: hotel.stars }).map((_, i) => <Star key={i} className="w-4 h-4 fill-gold-500" />)}
            </span>
          )}
          <Pill variant="success">LIVE · Hotelbeds</Pill>
        </div>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">{hotel.name}</h1>
        {hotel.address && (
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1 inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> {hotel.address}{hotel.city ? `, ${hotel.city}` : ''}
          </p>
        )}
      </div>

      {/* Gallery */}
      {hotel.images.length > 0 && <HotelDetailGallery images={hotel.images} hotelName={hotel.name} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main */}
        <div className="space-y-6">
          {hotel.description && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-navy-900 mb-2">About this property</h2>
                <p className="text-sm text-[rgb(var(--text-primary))] leading-relaxed whitespace-pre-line">{hotel.description}</p>
              </CardContent>
            </Card>
          )}

          {hotel.facilities.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold text-navy-900 mb-3">Facilities &amp; amenities</h2>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  {hotel.facilities.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-[rgb(var(--text-primary))]">
                      <Check className="w-4 h-4 text-success-500 flex-shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: contact + map */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="text-sm font-semibold text-navy-900">Property contact</h3>
              {hotel.phone && (
                <a href={`tel:${hotel.phone}`} className="flex items-center gap-2 text-sm text-[rgb(var(--text-primary))] hover:text-crimson-700">
                  <Phone className="w-4 h-4 text-crimson-700" /> {hotel.phone}
                </a>
              )}
              {hotel.email && (
                <a href={`mailto:${hotel.email}`} className="flex items-center gap-2 text-sm text-[rgb(var(--text-primary))] hover:text-crimson-700 break-all">
                  <Mail className="w-4 h-4 text-crimson-700" /> {hotel.email}
                </a>
              )}
              {hotel.web && (
                <a href={hotel.web.startsWith('http') ? hotel.web : `https://${hotel.web}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[rgb(var(--text-primary))] hover:text-crimson-700 break-all">
                  <Globe className="w-4 h-4 text-crimson-700" /> Website
                </a>
              )}
              {!hotel.phone && !hotel.email && !hotel.web && (
                <p className="text-xs text-[rgb(var(--text-secondary))]">Contact details not published for this property.</p>
              )}
            </CardContent>
          </Card>

          {hotel.latitude && hotel.longitude && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-navy-900 mb-2 inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-crimson-700" />Location</h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`}
                  target="_blank" rel="noreferrer"
                  className="block"
                >
                  <div className="aspect-video rounded-md bg-navy-50 border border-border-subtle flex items-center justify-center text-sm text-crimson-700 hover:bg-navy-100 transition-colors">
                    Open in Google Maps →
                  </div>
                </a>
                <p className="text-[10px] text-[rgb(var(--text-tertiary))] mt-1.5 font-mono">{hotel.latitude.toFixed(4)}, {hotel.longitude.toFixed(4)}</p>
              </CardContent>
            </Card>
          )}

          <Link href={backHref as any} className="block">
            <Button variant="secondary" className="w-full">Back to search results</Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
