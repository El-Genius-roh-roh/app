import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { APP_NAME } from "@/config/constants";
import { BASE } from "@/lib/url";
import { Inter } from "next/font/google";

// Police façon iOS : San Francisco (police système) sur Mac/iPhone ; ailleurs, Inter, très proche.
const inter = Inter({ subsets: ["latin"], variable: "--nf-inter", display: "swap" });

export const metadata: Metadata = { title: APP_NAME, description: "Révisions gamifiées entre amis", manifest: `${BASE}/manifest.webmanifest` };
export const viewport: Viewport = { themeColor: "#f2f2f7", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
