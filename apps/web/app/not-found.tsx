import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-full bg-navy-900 text-gold-500 mb-6">
          <Compass className="w-9 h-9" />
        </div>
        <p className="text-[11px] uppercase tracking-widest text-crimson-700 font-bold">404 · off the map</p>
        <h1 className="mt-3 text-3xl font-bold text-navy-900 tracking-tight">This destination doesn't exist.</h1>
        <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">The link may be broken, the proposal may have been deleted, or the agent may have un-shared it.</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link href="/dashboard" className="px-5 h-10 inline-flex items-center rounded-md bg-crimson-900 text-white text-sm font-semibold hover:bg-crimson-700">Back to dashboard</Link>
          <Link href="/itinerary/new" className="px-5 h-10 inline-flex items-center rounded-md text-sm font-semibold text-navy-700 hover:bg-navy-50">Create a trip</Link>
        </div>
      </div>
    </div>
  );
}
