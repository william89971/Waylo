import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
