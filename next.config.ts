import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Keep the dev badge off the sidebar's user avatar (bottom-left)
  devIndicators: { position: "bottom-right" },
  experimental: { agentUpgrade: "security" },
}

export default nextConfig
