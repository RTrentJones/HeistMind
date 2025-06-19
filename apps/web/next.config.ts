import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@heist-mind/database', '@heist-mind/shared'],
};

export default nextConfig;
