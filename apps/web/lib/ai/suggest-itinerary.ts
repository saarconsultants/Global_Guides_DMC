// AI Suggester — takes free-text destinations + total nights and returns an
// ordered, optimised city plan using Claude tool-use for guaranteed JSON shape.

import { anthropic, aiModel } from './anthropic';
import { CITY_BANK } from '@/lib/itinerary/mock-inventory';
import { IATA_TO_HOTELBEDS_DESTINATION } from '@gg/hotelbeds';
import { findCity } from '@/lib/cities';

export interface SuggestInput {
  destinationsText: string;     // "Paris, Amsterdam, Zurich, London"
  totalNights: number;          // 7
  budget?: 'standard' | 'premium' | 'luxury';
  travelers?: { adults: number; children: number };
  notes?: string;               // free text e.g. "honeymoon, prefers boutique"
}

export interface SuggestedCity {
  cityCode: string;             // 'PAR'
  cityName: string;             // 'Paris'
  nights: number;
  rationale: string;            // one-liner why this many nights
}

export interface SuggestResult {
  cities: SuggestedCity[];
  summary: string;              // 1-2 sentence overall recommendation
  warnings: string[];           // e.g. "Visa-on-arrival not available for IN passport in country X"
}

// Supported = union of mock CITY_BANK and the cities Hotelbeds is live for.
// This lets the AI suggest any destination that will resolve to real,
// bookable hotel inventory (not just the original ~10 curated cities).
const SUPPORTED_CITY_CODES = Array.from(new Set([
  ...Object.keys(CITY_BANK),
  ...Object.keys(IATA_TO_HOTELBEDS_DESTINATION),
]));

// "CODE Name" pairs to give the model the right names for codes outside CITY_BANK.
const SUPPORTED_CITY_LIST = SUPPORTED_CITY_CODES
  .map((code) => `${code} (${findCity(code)?.name ?? code})`)
  .join(', ');

const SYSTEM = `You are an expert outbound travel agent assembling multi-city European/Asian/Middle-East itineraries for B2B travel agents in India.

Hard rules:
- You may ONLY suggest cities from this supported list (code + name): ${SUPPORTED_CITY_LIST}.
- City codes MUST be the exact 3-letter codes from the list above.
- The sum of nights across all cities MUST equal exactly the user-requested total nights.
- Order cities for a sensible travel route (minimise long backtracks, group neighbours).
- Each city should get at least 2 nights for stays (except transit stops).
- For 7+ night trips with 3+ cities, allocate more nights to the marquee city (e.g. Paris gets 3 if it's in a 7N + 3-city plan).
- Prefer popular routes. Refuse cities not on the list (don't translate; just drop them with a warning).

Output via the suggest_itinerary tool. Always call the tool exactly once. Never reply with plain text.`;

const TOOL = {
  name: 'suggest_itinerary',
  description: 'Return the recommended multi-city itinerary as structured data.',
  input_schema: {
    type: 'object',
    properties: {
      cities: {
        type: 'array',
        description: 'Cities in visit order. Sum of nights must equal totalNights.',
        items: {
          type: 'object',
          properties: {
            cityCode:  { type: 'string', enum: SUPPORTED_CITY_CODES, description: '3-letter city code' },
            cityName:  { type: 'string', description: 'Human-readable city name' },
            nights:    { type: 'integer', minimum: 1, description: 'Number of nights in this city' },
            rationale: { type: 'string', description: 'One short sentence on why this allocation' },
          },
          required: ['cityCode', 'cityName', 'nights', 'rationale'],
        },
      },
      summary:  { type: 'string', description: '1-2 sentence overview for the agent' },
      warnings: { type: 'array', items: { type: 'string' }, description: 'Any dropped cities, visa caveats, or seasonality notes' },
    },
    required: ['cities', 'summary', 'warnings'],
  },
} as const;

export async function suggestItinerary(input: SuggestInput): Promise<SuggestResult> {
  const client = anthropic();
  const userMsg = [
    `Destinations the customer wants to visit: ${input.destinationsText}`,
    `Total nights: ${input.totalNights}`,
    input.travelers ? `Travellers: ${input.travelers.adults} adult${input.travelers.adults !== 1 ? 's' : ''}${input.travelers.children ? `, ${input.travelers.children} child${input.travelers.children !== 1 ? 'ren' : ''}` : ''}` : '',
    input.budget ? `Budget tier: ${input.budget}` : '',
    input.notes ? `Notes: ${input.notes}` : '',
    '',
    'Return your recommendation via the suggest_itinerary tool.',
  ].filter(Boolean).join('\n');

  const res = await client.messages.create({
    model: aiModel(),
    max_tokens: 2048,
    system: SYSTEM,
    tools: [TOOL as any],
    tool_choice: { type: 'tool', name: TOOL.name } as any,
    messages: [{ role: 'user', content: userMsg }],
  });

  const toolUse = res.content.find((b) => b.type === 'tool_use') as any;
  if (!toolUse) throw new Error('AI did not call the suggest_itinerary tool. Response: ' + JSON.stringify(res.content).slice(0, 200));

  const raw = toolUse.input as SuggestResult;

  // Defensive validation — Claude usually obeys but never trust LLM output blindly.
  if (!Array.isArray(raw.cities) || raw.cities.length === 0) {
    throw new Error('AI returned no cities.');
  }
  const cleanCities = raw.cities
    .filter((c) => SUPPORTED_CITY_CODES.includes(c.cityCode))
    .map((c) => ({ ...c, cityName: CITY_BANK[c.cityCode]?.name ?? c.cityName, nights: Math.max(1, Math.round(c.nights)) }));

  if (cleanCities.length === 0) throw new Error('AI suggested only unsupported cities. Try different destinations.');

  // Normalise total nights — if AI over/undershot, distribute the delta on the largest stay.
  const sum = cleanCities.reduce((s, c) => s + c.nights, 0);
  if (sum !== input.totalNights && cleanCities.length > 0) {
    const delta = input.totalNights - sum;
    cleanCities.sort((a, b) => b.nights - a.nights);
    const biggest = cleanCities[0]!;
    biggest.nights = Math.max(1, biggest.nights + delta);
  }

  return { cities: cleanCities, summary: raw.summary ?? '', warnings: raw.warnings ?? [] };
}
