import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `Dockerfile` production image (`output` copy step).
  output: "standalone",
  serverExternalPackages: [
    "better-sqlite3",
    "pdf-parse",
    "@anthropic-ai/sdk",
  ],
};

export default nextConfig;
