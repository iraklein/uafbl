import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build configuration to prevent common errors
  eslint: {
    // Don't fail builds on ESLint errors in development
    ignoreDuringBuilds: process.env.NODE_ENV === "development",
  },
  typescript: {
    // Don't fail builds on TypeScript errors in development
    ignoreBuildErrors: process.env.NODE_ENV === "development",
  },
  // Improve build performance
  experimental: {
    typedRoutes: false, // Can cause build issues
  },
  // Handle static optimization better
  output: undefined, // Let Next.js decide
  trailingSlash: false,
  // swcMinify is now default in Next.js 15
  // Handle external packages better
  transpilePackages: [],
  // Reduce build verbosity
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
