// VÉRIFICATEUR SIMULÉ : second « appel » indépendant. Il ne reçoit PAS correct_index, seulement les slides sources.
import { norm, MARQUE_VF, type GenQuestion } from "./generate";

export type Verdict = { ok: boolean; answer: number | null; ambiguous: boolean; raison?: string };

export function verifyQuestion(q: Omit<GenQuestion, "correct_index"> & { correct_index?: number }, sourceTexts: string[], expected: number): Verdict {
  const src = norm(sourceTexts.join("\n"));
  let answer: number | null = null;
  let ambiguous = false;

  if (q.type === "qcm") {
    const hits = q.choix.map((c, i) => (src.includes(norm(c)) ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 1) answer = hits[0];
    else ambiguous = hits.length > 1;
  } else {
    const m = q.enonce.startsWith(MARQUE_VF) ? q.enonce.slice(MARQUE_VF.length).split("» : ") : [];
    const fait = m.length >= 2 ? m.slice(1).join("» : ") : "";
    if (fait) answer = src.includes(norm(fait)) ? 0 : 1;
  }
  if (ambiguous) return { ok: false, answer, ambiguous, raison: "ambiguë (plusieurs réponses possibles)" };
  if (answer === null) return { ok: false, answer, ambiguous, raison: "hors programme (aucune réponse trouvée dans les slides)" };
  if (answer !== expected) return { ok: false, answer, ambiguous, raison: "le correcteur trouve une autre réponse" };
  return { ok: true, answer, ambiguous };
}
