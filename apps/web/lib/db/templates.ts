// Columns needed to render an itinerary-template card. Template rows also carry
// the full day-by-day / visa / insurance JSON snapshots (daysJson, visaJson,
// insuranceJson) which are only needed when cloning — list pages must not pull them.
export const TEMPLATE_CARD_SELECT = {
  id: true,
  code: true,
  title: true,
  hero: true,
  blurb: true,
  destinations: true,
  totalNights: true,
  category: true,
  region: true,
  startingPricePaise: true,
  published: true,
  createdAt: true,
} as const;
