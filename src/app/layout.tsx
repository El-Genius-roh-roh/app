import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { APP_NAME } from "@/config/constants";
import { BASE } from "@/lib/url";
import { Geist, Russo_One, Chakra_Petch } from "next/font/google";
import TopBar from "@/components/TopBar";

// Trois rôles : le texte (Geist), les titres (Russo One), les chiffres et étiquettes (Chakra Petch).
const texte = Geist({ subsets: ["latin"], variable: "--nf-texte", display: "swap" });
const titre = Russo_One({ subsets: ["latin"], weight: "400", variable: "--nf-titre", display: "swap" });
const num = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--nf-num", display: "swap" });

export const metadata: Metadata = { title: APP_NAME, description: "Révisions gamifiées entre amis", manifest: `${BASE}/manifest.webmanifest` };
export const viewport: Viewport = { themeColor: "#0a0d14", colorScheme: "dark", width: "device-width", initialScale: 1 };

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
