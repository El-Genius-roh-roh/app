import { NextResponse } from "next/server";
import { closeStaleAttempts, freezePastDays, generateUpcoming } from "@/lib/quiz/service";

// Jobs planifiés (docs/05) : déclenchés par un cron externe avec l'en-tête x-job-secret.
async function run(req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (req.headers.get("x-job-secret") !== (process.env.JOB_SECRET ?? "dev-job-secret"))
    return NextResponse.json({ error: "interdit" }, { status: 403 });
  const { name } = await params;
  if (name === "generate") return NextResponse.json(await generateUpcoming());
  if (name === "close") return NextResponse.json({ cloturees: await closeStaleAttempts() });
  if (name === "freeze") return NextResponse.json({ figes: await freezePastDays() });
  if (name === "midnight") { // enchaînement de 00h00 : clôture + gel des résultats de la veille, puis génération J et J+1
    const figes = await freezePastDays();
    return NextResponse.json({ figes, ...(await generateUpcoming()) });
  }
  return NextResponse.json({ error: "job inconnu" }, { status: 404 });
}
export { run as GET, run as POST };
