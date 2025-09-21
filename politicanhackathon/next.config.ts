import type { NextConfig } from "next";

const isGhPages = process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'gh-pages';
const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  // Deployment target
  output: isGhPages ? 'export' : 'standalone',
  // Optional base path/asset prefix for GitHub Pages project sites
  ...(isGhPages && basePathEnv
    ? {
        basePath: basePathEnv,
        assetPrefix: basePathEnv,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
