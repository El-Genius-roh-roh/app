import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { APP_NAME } from "@/config/constants";
import { BASE } from "@/lib/url";

export const metadata: Metadata = { title: APP_NAME, description: "Révisions gamifiées entre amis", manifest: `${BASE}/manifest.webmanifest` };
export const viewport: Viewport = { themeColor: "#a21caf", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
