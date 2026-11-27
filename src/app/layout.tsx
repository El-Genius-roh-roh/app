import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { APP_NAME } from "@/config/constants";
import { BASE } from "@/lib/url";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import TopBar from "@/components/TopBar";

// Trois rôles : le texte (Geist), les titres (Bricolage Grotesque), les chiffres et étiquettes (Geist Mono).
const texte = Geist({ subsets: ["latin"], variable: "--nf-texte", display: "swap" });
const titre = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--nf-titre", display: "swap" });
const num = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--nf-num", display: "swap" });

export const metadata: Metadata = { title: APP_NAME, description: "Révisions gamifiées entre amis", manifest: `${BASE}/manifest.webmanifest` };
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4f7fb" }, { media: "(prefers-color-scheme: dark)", color: "#181c21" }],
  colorScheme: "light dark", width: "device-width", initialScale: 1,
};

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
