// Single source of truth for "which inventory APIs are live right now".
// Live = the relevant credentials are present in the environment. Used by
// /api/health and the admin Inventory Status page. Server-only (reads env).

import { isLive as hotelbedsIsLive } from '@gg/hotelbeds';

export interface ApiStatus {
  key: string;
  label: string;
  provider: string;
  live: boolean;
  note: string;
}

export function inventoryStatus(): ApiStatus[] {
  // Flights: Tripjack — live in proxy mode (TRIPJACK_PROXY_TOKEN) or direct (TRIPJACK_API_KEY).
  const flightsLive = !!(process.env.TRIPJACK_PROXY_TOKEN || process.env.TRIPJACK_API_KEY);

  return [
    {
      key: 'flights',
      label: 'Flights',
      provider: 'Tripjack',
      live: flightsLive,
      note: flightsLive
        ? (process.env.TRIPJACK_PROXY_TOKEN ? 'Live via Railway fixed-IP proxy' : 'Live (direct)')
        : 'Mock — set TRIPJACK_PROXY_TOKEN (or TRIPJACK_API_KEY)',
    },
    {
      key: 'hotels',
      label: 'Hotels',
      provider: 'Hotelbeds (HBX Group)',
      live: hotelbedsIsLive('hotels'),
      note: hotelbedsIsLive('hotels') ? 'Live · 250k+ properties' : 'Mock — set HOTELBEDS_HOTELS_API_KEY',
    },
    {
      key: 'transfers',
      label: 'Transfers',
      provider: 'Hotelbeds (HBX Group)',
      live: hotelbedsIsLive('transfers'),
      note: hotelbedsIsLive('transfers') ? 'Live · airport ↔ hotel' : 'Mock — set HOTELBEDS_TRANSFERS_API_KEY',
    },
    {
      key: 'activities',
      label: 'Activities',
      provider: 'Hotelbeds (HBX Group)',
      live: hotelbedsIsLive('activities'),
      note: hotelbedsIsLive('activities') ? 'Live · tours & excursions' : 'Mock — set HOTELBEDS_ACTIVITIES_API_KEY',
    },
  ];
}
