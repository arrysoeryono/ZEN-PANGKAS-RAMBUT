import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" hanya untuk self-host/sandbox; di Vercel pakai default output
output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
