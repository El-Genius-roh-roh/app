import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/config/constants";

export const metadata: Metadata = { title: APP_NAME, description: "Révisions gamifiées entre amis", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#4f46e5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
