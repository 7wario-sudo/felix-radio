import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages uses Node.js runtime
  // No need for experimental edge runtime configuration

  // Output standalone for better performance
  output: 'standalone',

  // Disable image optimization (Cloudflare has its own)
  images: {
    unoptimized: true,
  },

  // Ensure ESLint runs during builds
  eslint: {
    dirs: ['app', 'components', 'lib'],
  },
};

export default nextConfig;
