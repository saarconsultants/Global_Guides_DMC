// Markets offered for nationality and country of residence (ISO-2). Names are spelled
// out because server and browser locale data disagree (Hong Kong), which breaks hydration.
const NAMES: Record<string, string> = {
  AE: 'United Arab Emirates', AU: 'Australia', BD: 'Bangladesh', BH: 'Bahrain', CA: 'Canada', CH: 'Switzerland',
  CN: 'China', DE: 'Germany', EG: 'Egypt', ES: 'Spain', FR: 'France', GB: 'United Kingdom', HK: 'Hong Kong',
  ID: 'Indonesia', IT: 'Italy', JP: 'Japan', KE: 'Kenya', KR: 'South Korea', KW: 'Kuwait', LK: 'Sri Lanka',
  MU: 'Mauritius', MY: 'Malaysia', NL: 'Netherlands', NP: 'Nepal', NZ: 'New Zealand', OM: 'Oman', PH: 'Philippines',
  QA: 'Qatar', SA: 'Saudi Arabia', SG: 'Singapore', TH: 'Thailand', TR: 'Türkiye', US: 'United States',
  VN: 'Vietnam', ZA: 'South Africa',
};

export const COUNTRIES = [
  { code: 'IN', name: 'India' },
  ...Object.entries(NAMES).map(([code, name]) => ({ code, name })).sort((a, b) => (a.name < b.name ? -1 : 1)),
];
