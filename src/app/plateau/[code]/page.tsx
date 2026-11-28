import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { joinRoom } from "@/lib/plateau/service";
import PlateauRoom from "./PlateauRoom";
import JeuxVerrouilles from "@/components/JeuxVerrouilles";
import { accesJeux } from "@/lib/acces";

export const dynamic = "force-dynamic";

export default async function Partie({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const u = await requireUser();
  const acces = await accesJeux(u.id);
  if (!acces.ouvert) return <JeuxVerrouilles jeu={"Jeu de plateau"} acces={acces} />;
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
  return <PlateauRoom code={code.toUpperCase()} />;
}
