import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
  // TypeScript remains a hard gate in the package build script. Disabling the
  // duplicate Next worker avoids a macOS/Turbopack worker deadlock observed
  // after compilation while preserving the same `tsc --noEmit` verification.
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["remotion", "@remotion/player"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
