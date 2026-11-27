import type { NextConfig } from "next";

// NEXT_PUBLIC_BASE_PATH : préfixe d'URL derrière un proxy (ex. /absproxy/3000). APP_ORIGIN : hôte public autorisé.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;
const origin = process.env.APP_ORIGIN;

const nextConfig: NextConfig = {
  basePath,
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas", "pg"],
  experimental: { serverActions: { bodySizeLimit: "50mb", allowedOrigins: origin ? [origin] : undefined } },
  allowedDevOrigins: origin ? [origin] : undefined,
};
export default nextConfig;
