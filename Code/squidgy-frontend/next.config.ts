import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // This completely disables ESLint during the build process
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;