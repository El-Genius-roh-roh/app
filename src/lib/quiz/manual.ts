// ÉDITION MANUELLE DES QUESTIONS par les gestionnaires d'une matière.
// Une question créée ou modifiée à la main est marquée `manuelle` : la génération (chat ou simulée) la conserve
// et ne remplit que les places restantes. Un quiz déjà commencé par un joueur, ou passé, n'est plus modifiable.
import { CONFIG } from "@/config/constants";
import { q } from "../db";
import { todayParis } from "../clock";
import { validateTechnical } from "./generate";

export type EditDay = { id: string; date: string; saison: number; jour: number; statut: string; nb: number; joue: boolean };
export type EditQuestion = {
  id: string; type: "qcm" | "vrai_faux"; kind: "new" | "revision"; enonce: string; choix: string[]; correct_index: number;
  explication: string; manuelle: boolean; source: { document_id: string; pages: number[] } | null;
};
export type QuestionInput = {
  id?: string; dayId: string; type: "qcm" | "vrai_faux"; enonce: string; choix: string[]; correct_index: number;
  explication: string; documentId?: string; page?: number;
};

/** Jours modifiables (aujourd'hui et la suite), avec leur nombre de questions. */
export async function editableDays(subjectId: string): Promise<EditDay[]> {
  return q<EditDay>(
    `select g.id, to_char(g.date,'YYYY-MM-DD') as date, g.saison, g.jour_dans_saison as jour, g.statut_generation as statut,
            (select count(*) from questions qq where qq.game_day_id=g.id)::int as nb,
            exists (select 1 from attempts a where a.game_day_id=g.id) as joue
       from game_days g where g.subject_id=$1 and g.date >= $2::date order by g.date`, [subjectId, await todayParis()]);
}

export async function dayQuestions(dayId: string): Promise<EditQuestion[]> {
  return q<EditQuestion>(
    `select id, type, kind, enonce, choix, correct_index, coalesce(explication,'') as explication, manuelle, source_pages as source
       from questions where game_day_id=$1 order by kind, id`, [dayId]);
}

/** Raison pour laquelle le jour n'est plus modifiable, ou null. */
async function verrou(subjectId: string, dayId: string): Promise<string | null> {
  const [d] = await q<{ date: string; joue: boolean }>(
    `select to_char(date,'YYYY-MM-DD') as date, exists (select 1 from attempts a where a.game_day_id=g.id) as joue
       from game_days g where id=$1 and subject_id=$2`, [dayId, subjectId]);
  if (!d) return "Quiz introuvable.";
  if (d.date < (await todayParis())) return "Ce quiz est passé : il ne peut plus être modifié.";
  if (d.joue) return "Des joueurs ont déjà commencé ce quiz : il ne peut plus être modifié.";
  return null;
}

/** 10 questions → quiz prêt ; moins → en attente (la génération complétera en gardant les questions manuelles). */
async function majStatut(dayId: string) {
  const [{ n }] = await q<{ n: number }>("select count(*)::int n from questions where game_day_id=$1", [dayId]);
  await q("update game_days set statut_generation=$2 where id=$1", [dayId, n >= CONFIG.QUESTIONS_PAR_JOUR ? "ok" : "attente"]);
}

export async function saveQuestion(subjectId: string, x: QuestionInput): Promise<string | null> {
  const lock = await verrou(subjectId, x.dayId);
  if (lock) return lock;
  const choix = x.type === "vrai_faux" ? ["Vrai", "Faux"] : x.choix.map((c) => c.trim());
  const enonce = x.enonce.trim();
  if (enonce.length < 3) return "L'énoncé est trop court.";

  let source: { document_id: string; pages: number[]; page_ids: string[] } | null = null;
  if (x.documentId) {
    const [p] = await q<{ id: string; numero: number }>(
      `select p.id, p.numero from document_pages p join documents d on d.id=p.document_id
        where d.id=$1 and d.subject_id=$2 and p.numero=$3`, [x.documentId, subjectId, x.page ?? 1]);
    if (!p) return `La slide ${x.page ?? 1} n'existe pas dans ce cours.`;
    source = { document_id: x.documentId, pages: [p.numero], page_ids: [p.id] };
  }

  // doublons : même question déjà posée dans la saison (hors question modifiée)
  const used = new Set((await q<{ k: string }>(
    `select qq.enonce || '||' || (qq.choix ->> qq.correct_index) as k from questions qq join game_days g on g.id=qq.game_day_id
      where g.subject_id=$1 and g.saison=(select saison from game_days where id=$2) and qq.id is distinct from $3::uuid`,
    [subjectId, x.dayId, x.id ?? null])).map((r) => r.k));
  const cand = { type: x.type, kind: "new" as const, enonce, choix, correct_index: x.correct_index, explication: x.explication, source: source ?? { document_id: "", pages: [], page_ids: [] }, notion: "" };
  const err = validateTechnical(cand, used);
  if (err) return ({ "4 choix distincts requis": "Il faut 4 choix différents et non vides.", "doublon de question": "Cette question existe déjà dans la saison." } as Record<string, string>)[err] ?? `Question invalide : ${err}.`;

  if (x.id) {
    const r = await q(
      `update questions set type=$3, enonce=$4, choix=$5, correct_index=$6, explication=$7, source_pages=coalesce($8, source_pages),
              manuelle=true, verifiee=true where id=$1 and game_day_id=$2 returning id`,
      [x.id, x.dayId, x.type, enonce, JSON.stringify(choix), x.correct_index, x.explication.trim(), source && JSON.stringify(source)]);
    if (!r.length) return "Question introuvable.";
  } else {
    const [{ n }] = await q<{ n: number }>("select count(*)::int n from questions where game_day_id=$1", [x.dayId]);
    if (n >= CONFIG.QUESTIONS_PAR_JOUR) return `Ce quiz a déjà ${CONFIG.QUESTIONS_PAR_JOUR} questions : modifie ou supprime-en une.`;
    const [{ kind }] = await q<{ kind: "new" | "revision" }>(
      `select case when count(*) filter (where kind='new') < $2 then 'new' else 'revision' end as kind from questions where game_day_id=$1`,
      [x.dayId, CONFIG.QUESTIONS_NOUVELLES]);
    await q(
      `insert into questions(subject_id,game_day_id,kind,type,enonce,choix,correct_index,explication,source_pages,notion,verifiee,manuelle)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true)`,
      [subjectId, x.dayId, kind, x.type, enonce, JSON.stringify(choix), x.correct_index, x.explication.trim(), source && JSON.stringify(source), enonce.slice(0, 80)]);
  }
  await majStatut(x.dayId);
  return null;
}

export async function deleteQuestion(subjectId: string, dayId: string, questionId: string): Promise<string | null> {
  const lock = await verrou(subjectId, dayId);
  if (lock) return lock;
  await q("delete from questions where id=$1 and game_day_id=$2", [questionId, dayId]);
  // le reste du quiz a été relu : on le garde, la génération ne remplacera que la question supprimée
  await q("update questions set manuelle=true where game_day_id=$1", [dayId]);
  await majStatut(dayId);
  return null;
}
