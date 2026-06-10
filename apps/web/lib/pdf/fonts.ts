// Display font for branded PDFs — Fraunces, the same serif the web app uses,
// so the customer PDF and the customer share page speak one visual language.
// Static per-weight TTFs from the Google Fonts CDN (fetched at render time;
// callers keep a fonts-off fallback render in case the CDN is unreachable).
import { Font } from '@react-pdf/renderer';

let registered = false;

export function registerPdfDisplayFont() {
  if (registered) return;
  registered = true;
  Font.register({
    family: 'Fraunces',
    fonts: [
      // 600 upright — headings. (Do not reorder: URL↔variant mapping is exact.)
      { src: 'https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIcaRyjDg.ttf', fontWeight: 600 },
      // 500 italic — the hero tagline accent.
      { src: 'https://fonts.gstatic.com/s/fraunces/v38/6NVf8FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnbB-gzTK0K1ChJdt9vIVYX9G37lvd9sPEKsxx664UJf1h5Tf7W.ttf', fontWeight: 500, fontStyle: 'italic' },
    ],
  });
}
