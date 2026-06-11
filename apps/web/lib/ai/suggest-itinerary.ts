// AI Suggester — takes free-text destinations + total nights and returns an
// ordered, optimised city plan. Powered by OpenRouter (default model: NVIDIA
// Nemotron). Free models don't reliably support tool-calling, so we ask for raw
// JSON in the prompt and parse it defensively.

import { chat } from './openrouter';
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

Respond with ONLY a single JSON object (no markdown code fences, no commentary before or after) of exactly this shape:
{
  "cities": [
    { "cityCode": "PAR", "cityName": "Paris", "nights": 3, "rationale": "one short sentence" }
  ],
  "summary": "1-2 sentence overview for the agent",
  "warnings": ["any dropped cities, visa caveats, or seasonality notes"]
}
Rules for the JSON: cityCode MUST be one of the exact 3-letter supported codes; nights is a positive integer; the sum of all nights MUST equal the requested total.`;

// Pull the JSON object out of a model reply that may be wrapped in markdown
// fences, prefixed with prose, or preceded by a <think> reasoning block.
function extractJson(text: string): any {
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('The AI response did not contain a JSON itinerary. Please try again.');
  }
  return JSON.parse(t.slice(start, end + 1));
}

export async function suggestItinerary(input: SuggestInput): Promise<SuggestResult> {
  const userMsg = [
    `Destinations the customer wants to visit: ${input.destinationsText}`,
    `Total nights: ${input.totalNights}`,
    input.travelers ? `Travellers: ${input.travelers.adults} adult${input.travelers.adults !== 1 ? 's' : ''}${input.travelers.children ? `, ${input.travelers.children} child${input.travelers.children !== 1 ? 'ren' : ''}` : ''}` : '',
    input.budget ? `Budget tier: ${input.budget}` : '',
    input.notes ? `Notes: ${input.notes}` : '',
    '',
    'Return ONLY the JSON object described in the instructions.',
  ].filter(Boolean).join('\n');

  const text = await chat({ system: SYSTEM, user: userMsg, maxTokens: 4000, temperature: 0.3 });

  let raw: SuggestResult;
  try {
    raw = extractJson(text) as SuggestResult;
  } catch (e: any) {
    console.error('[suggestItinerary] JSON parse failed. Raw:', text.slice(0, 400));
    throw new Error(e?.message ?? 'Could not read the AI itinerary. Please try again.');
  }

  // Defensive validation — never trust LLM output blindly.
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
