import { join } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@gg/tripjack', '@gg/hotelbeds'],
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
