import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  // Generate a fully static site (no Node server required)
  output: 'export',
  // Safer for static hosts (S3, CF Pages, etc.)
  trailingSlash: true,
  // Base path for GitHub Pages deployment
  basePath: process.env.NODE_ENV === 'production' ? '/USDog' : '',

  images: {
    // next/image optimization is not available on static export
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  outputFileTracingRoot: path.resolve(__dirname, '../../'),

  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [LOADER]
      }
    }
  },

  webpack: (config) => {
    // Avoid optional deps causing SSR/import errors during build/runtime.
    // These are pulled by wallet SDKs but not needed in web build.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  }
};

export default nextConfig;
