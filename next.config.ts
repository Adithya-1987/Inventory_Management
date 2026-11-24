import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  // Off on purpose: Strict Mode's dev-only double mount makes the React Bits WebGL backgrounds release their
  // context and then reuse the dead canvas (blank screen + broken-image icon). Production never double-mounts.
  reactStrictMode: false,
  devIndicators: { position: "bottom-right" }, // default bottom-left covers the sidebar's Log out button
  // Request form uploads files up to 5MB through a server action (default limit is 1MB).
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react", "motion"],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
