import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright and the shared preview open the app on 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
};

export default nextConfig;
