import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { APP_NAME } from "@/config/constants";
import { BASE } from "@/lib/url";
import { Geist, Bricolage_Grotesque, Barlow_Condensed } from "next/font/google";
import TopBar from "@/components/TopBar";

// Trois rôles : le texte (Geist), les titres (Bricolage Grotesque), les chiffres de tableau d'affichage (Barlow Condensed).
const texte = Geist({ subsets: ["latin"], variable: "--nf-texte", display: "swap" });
const titre = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--nf-titre", display: "swap" });
const num = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--nf-num", display: "swap" });

export const metadata: Metadata = { title: APP_NAME, description: "Révisions gamifiées entre amis", manifest: `${BASE}/manifest.webmanifest` };
export const viewport: Viewport = { themeColor: "#16151a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${texte.variable} ${titre.variable} ${num.variable}`}>
      <body className="font-sans antialiased">
        <TopBar />
        {children}
      </body>
    </html>
  );
}
