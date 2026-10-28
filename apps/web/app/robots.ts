import type { MetadataRoute } from 'next';

// A private B2B tool: agent pages sit behind login and customer proposal links
// are private — nothing here should be indexed by search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
