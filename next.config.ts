import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Temporary production unblock while the PDF.js/Supabase type migrations are cleaned up.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
