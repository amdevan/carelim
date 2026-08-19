import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {
    root: ".",
  },
  // Allow the sandbox preview domain and localhost variants to hot-reload /
  // fetch _next/* assets without triggering cross-origin warnings in dev.
  // Next.js matches on hostname (with optional leading dot for subdomain wildcard).
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "carelim.health",
    ".carelim.health",
    "app.carelim.health",
    "dental.carelim.health",
    "ivf.carelim.health",
    "admin.carelim.health",
    "ms.carelim.health",
    "rx.carelim.health",
  ],
};

export default nextConfig;
