// Display font for branded PDFs — Archivo (semi/extra-bold), the heavy geometric
// sans matching the owner's reference proposal design. Static per-weight TTFs
// from the Google Fonts CDN (fetched at render time; callers keep a fonts-off
// fallback render in case the CDN is unreachable).
import { Font } from '@react-pdf/renderer';

let registered = false;

export function registerPdfDisplayFont() {
  if (registered) return;
  registered = true;
  Font.register({
    family: 'Archivo',
    fonts: [
      // (Do not reorder: URL↔weight mapping is exact, fetched per-weight.)
      { src: 'https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTT6jRp8A.ttf', fontWeight: 600 },
      { src: 'https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTtDRp8A.ttf', fontWeight: 800 },
    ],
  });
}
