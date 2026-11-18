import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Keep the dev badge off the sidebar's user avatar (bottom-left)
  devIndicators: { position: "bottom-right" },
  experimental: { agentUpgrade: "security" },
  // Quick tunnels (cloudflared --url) for testing on other devices
  allowedDevOrigins: ["*.trycloudflare.com"],
}

export default nextConfig
