import { prepareSiteData, deterministicBuildId } from './scripts/publication-build.mjs';
import type { NextConfig } from "next";

prepareSiteData();

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  generateBuildId: async () => deterministicBuildId(),
  trailingSlash: true,
  basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
