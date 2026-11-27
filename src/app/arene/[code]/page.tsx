import { requireUser } from "@/lib/auth";
import { joinRoom } from "@/lib/arena/service";
import ArenaRoom from "./ArenaRoom";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Partie({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const u = await requireUser();
  const r = await joinRoom(u.id, code);
  if (r.status !== 200) {
    return (
      <main className="mx-auto max-w-md p-6 space-y-3">
        <p className="text-red-600">{String(r.body.error)}</p>
        <Link href="/arene" className="text-accent-600">← Retour à l&apos;Arène</Link>
      </main>
    );
  }
  return <ArenaRoom code={code.toUpperCase()} />;
}
