import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSubjectFor } from "@/lib/subjects";
import { buildChatPrompt } from "@/lib/quiz/chat";
import ChatPanel from "./ChatPanel";
import NextButton from "@/components/NextButton";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx || !ctx.canManage) notFound();
  const p = await buildChatPrompt(id);
  return (
    <main className="page">
      <Link href={`/matieres/${id}`} className="back">{ctx.subject.nom}</Link>
      <header className="hero">
        <h1 className="text-2xl">Générer avec le chat</h1>
        <p className="mt-1 font-semibold text-white/90">1. Copie le prompt · 2. Colle-le dans Claude · 3. Recolle sa réponse ici</p>
      </header>
      {p ? <ChatPanel subjectId={id} prompt={p.prompt} dates={p.dates} />
        : <p className="card font-semibold">Rien à générer : les prochains quiz ont déjà leurs questions (ou aucun cours n&apos;est importé).</p>}
      <NextButton href={`/matieres/${id}/questions`} sub="Relire et corriger les questions générées">Vérifier les questions</NextButton>
    </main>
  );
}
