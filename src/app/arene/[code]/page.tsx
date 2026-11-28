import { requireUser } from "@/lib/auth";
import { joinRoom } from "@/lib/arena/service";
import ArenaRoom from "./ArenaRoom";
import Link from "next/link";
import PremiumRequis from "@/components/PremiumRequis";

export const dynamic = "force-dynamic";

export default async function Partie({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const u = await requireUser();
  if (!u.premium) return <PremiumRequis titre="L'Arène" texte="Les duels en direct, les parties contre des bots et le jeu de plateau sont réservés aux comptes premium." />;
  const r = await joinRoom(u.id, code);
  if (r.status !== 200) {
    return (
      <main className="page">
        <div className="card space-y-3">
          <p className="font-semibold text-ko" role="alert">{String(r.body.error)}</p>
          <Link href="/arene" className="btn-white">Retour à l&apos;Arène</Link>
        </div>
      </main>
    );
  }
  return <ArenaRoom code={code.toUpperCase()} />;
}
