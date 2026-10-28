import { join } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@gg/tripjack', '@gg/hotelbeds', '@gg/leamigo'],
  // Static artwork (/promos, /brand) has fixed, un-hashed names, so it can't be
  // `immutable` — but caching for a day (and serving stale while revalidating for
  // a week) stops every page view re-validating ~1 MB of images.
  async headers() {
    const cache = [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }];
    return [
      { source: '/promos/:path*', headers: cache },
      { source: '/brand/:path*', headers: cache },
    ];
  },
  typedRoutes: true,
  // Trace from the monorepo root so Vercel's file tracer picks up workspace deps
  outputFileTracingRoot: join(process.cwd(), '../..'),
  // Force-include Next.js internal modules that nft sometimes misses on Vercel.
  // Fixes runtime "Cannot find module 'next/dist/compiled/source-map'" 500s.
  outputFileTracingIncludes: {
    '*': [
      './node_modules/next/dist/compiled/source-map/**/*',
      './node_modules/next/dist/compiled/source-map08/**/*',
    ],
  },
};
export default nextConfig;
