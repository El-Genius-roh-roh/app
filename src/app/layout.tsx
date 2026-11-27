import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { APP_NAME } from "@/config/constants";
import { BASE } from "@/lib/url";
import { Nunito, Fredoka, Lilita_One } from "next/font/google";

// Trois polices : texte (Nunito), titres (Fredoka), éléments cliquables (Lilita One).
const texte = Nunito({ subsets: ["latin"], variable: "--nf-texte", display: "swap" });
const titre = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--nf-titre", display: "swap" });
const action = Lilita_One({ subsets: ["latin"], weight: "400", variable: "--nf-action", display: "swap" });

export const metadata: Metadata = { title: APP_NAME, description: "Révisions gamifiées entre amis", manifest: `${BASE}/manifest.webmanifest` };
export const viewport: Viewport = { themeColor: "#a21caf", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${texte.variable} ${titre.variable} ${action.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
