/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@gg/tripjack'],
  typedRoutes: true,
  outputFileTracingRoot: process.cwd(),
};
export default nextConfig;
