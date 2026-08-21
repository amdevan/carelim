import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // Prevent Turbopack from bundling Prisma — must be resolved from node_modules at runtime
  serverExternalPackages: ["@prisma/client", "prisma"],
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
  // Security headers applied at the Next.js config level as a fallback
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
