'use server';
// Server action wrapper around the Hotelbeds Activities adapter.
// Falls back to empty array (caller merges with mock) when keys missing,
// city unmapped, or upstream fails.

import { searchActivities, type HotelbedsActivity } from '@gg/hotelbeds';
import type { Activity } from '@/lib/itinerary/types';

interface Input {
  cityCode: string;
  fromDate: string;
  toDate: string;
  paxAdults: number;
  paxChildren?: number;
}

interface Output {
  ok: true;
  activities: Activity[];
  source: 'live' | 'mock' | 'unsupported-city';
  warning?: string;
}
interface ErrOutput {
  ok: false;
  error: string;
}

export async function searchActivitiesAction(input: Input): Promise<Output | ErrOutput> {
  try {
    const res = await searchActivities(input);
    return {
      ok: true,
      activities: res.activities.map(hbActivityToAppActivity),
      source: res.source,
      warning: res.warning,
    };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

function hbActivityToAppActivity(a: HotelbedsActivity): Activity {
  return {
    id: a.id,
    name: a.name,
    category: 'tour',        // Hotelbeds activities are all tour/experience-style
    durationMin: a.durationMin,
    pricePaise: a.pricePaise,
    cityCode: a.cityCode,
  };
}
