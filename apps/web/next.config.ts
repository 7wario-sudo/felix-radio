import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages configuration
  // Remove standalone output - Pages needs standard build output

  // Disable image optimization (Cloudflare has its own)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
