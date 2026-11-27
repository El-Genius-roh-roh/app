import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSubjectFor } from "@/lib/subjects";
import { buildChatPrompt } from "@/lib/quiz/chat";
import ChatPanel from "./ChatPanel";
import NextButton from "@/components/NextButton";
import Icon from "@/components/Icon";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser();
  const ctx = await getSubjectFor(id, u.id);
  if (!ctx || !ctx.canManage) notFound();
  const p = await buildChatPrompt(id);
  return (
    <main className="page">
      <Link href={`/matieres/${id}`} className="back"><Icon name="arrowLeft" size={16} />{ctx.subject.nom}</Link>
      <header className="entree">
        <p className="eyebrow flex items-center gap-1.5"><Icon name="sparkles" size={14} />Générer avec un chat</p>
        <h1 className="title mt-1">Questions par Claude</h1>
        <p className="mt-2 max-w-2xl text-texte-2">Copie le prompt, colle-le dans Claude, puis recolle sa réponse ici. Les questions sont vérifiées avant d&apos;entrer dans les quiz.</p>
      </header>
      {p ? <ChatPanel subjectId={id} prompt={p.prompt} dates={p.dates} />
        : (
          <div className="card space-y-1">
            <p className="font-semibold">Rien à générer pour l&apos;instant</p>
            <p className="muted">Les prochains quiz ont déjà leurs questions, ou aucun cours n&apos;est encore importé dans la matière.</p>
          </div>
        )}
      <NextButton href={`/matieres/${id}/questions`} sub="Relire et corriger les questions générées">Vérifier les questions</NextButton>
    </main>
  );
}
