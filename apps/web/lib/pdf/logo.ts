// Resolve an agency logo URL into something @react-pdf's <Image> can actually
// embed. PDFs CANNOT render SVG, so:
//   - bundled brand SVGs (/brand/*.svg) → swap to their PNG sibling (we ship PNGs)
//   - any other SVG URL → return null (the PDF falls back to a text wordmark)
//   - raster URLs / data URLs → absolutize and pass through
export function pdfLogoUrl(raw: string | null | undefined, origin: string): string | null {
  if (!raw) return null;
  let url = raw;
  if (/\.svg$/i.test(url)) {
    if (url.startsWith('/brand/')) url = url.replace(/\.svg$/i, '.png');
    else return null; // external SVG we can't rasterize → wordmark fallback
  }
  return url.startsWith('/') ? `${origin}${url}` : url;
}
