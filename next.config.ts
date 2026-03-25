import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables `Dockerfile` production image (`output` copy step).
  output: "standalone",
  // Pin Turbopack root when multiple lockfiles exist above this folder
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: [
    "better-sqlite3",
    "pdf-parse",
    "@anthropic-ai/sdk",
  ],
};

export default nextConfig;
