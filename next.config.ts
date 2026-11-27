import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas", "pg"],
  experimental: { serverActions: { bodySizeLimit: "50mb" } },
};
export default nextConfig;
