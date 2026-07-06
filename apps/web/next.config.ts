import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@heist-mind/database', '@heist-mind/shared', '@heist-mind/ui'],
  // Expose the deployment environment to the browser so the production-only coming-soon gate
  // (lib/coming-soon.ts) is consistent across the server, middleware, and client bundles. Vercel
  // sets VERCEL_ENV at build (production/preview/development); undefined locally → the gate is off.
  env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? '' },
};

export default nextConfig;
