import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly set distDir to avoid Vercel path resolution issues
  distDir: ".next",
  // Allow larger request bodies for scan content
  serverExternalPackages: [],
};

export default nextConfig;
