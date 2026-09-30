import type { NextConfig } from "next";

const rawBackendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8787";
// Remove trailing slash if present to avoid double-slashes in the rewrite destination
const backendUrl = rawBackendUrl.endsWith("/")
  ? rawBackendUrl.slice(0, -1)
  : rawBackendUrl;

const nextConfig: NextConfig = {
  images: {
    // Album covers come from the iTunes catalog (see migration 0004).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.mzstatic.com",
        pathname: "/image/thumb/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
