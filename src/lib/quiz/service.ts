import { CONFIG } from "@/config/constants";
import { genererJourAvecIA } from "./ai";
import { pool, q } from "../db";
import { sqlToday, todayParis } from "../clock";
import { memberRole } from "../groups";
import { hashString, shuffled, secureRand } from "../rng";
import { classementDuJour } from "../scoring";
import { generateQuestions, validateTechnical, qkey, type GenQuestion, type SrcPage } from "./generate";
import { verifyQuestion } from "./verify";
import { formatDuJour, formatJouable, propositionVF, relierJuste, reserveRelier, vfJuste, type Format } from "./formats";

/* ------------------------------------------------------------------ génération */

const PAGES_SQL = `select p.id, p.document_id, p.numero, p.texte,
    coalesce(nullif(p.notions->>0,''), split_part(p.texte, E'\\n', 1)) as notion
  from document_pages p join documents d on d.id=p.document_id`;

async function logAi(subjectId: string, etape: string, ms: number, statut: string) {
  await q("insert into ai_calls(subject_id,etape,modele,duree_ms,statut) values ($1,$2,'mock',$3,$4)", [subjectId, etape, ms, statut]);
}

export type GenReport = { chat: number; simulees: number; manuelles: number; rejets: string[] };

type Cq = <T = any>(text: string, params?: unknown[]) => Promise<T[]>;
type DayInfo = { id: string; subject_id: string; saison: number; jour_dans_saison: number; statut_generation: string };

/** Tout ce qu'il faut pour générer les questions d'un jour (slides du jour, slides de révision, doublons…). */
export async function loadDayContext(cq: Cq, gd: DayInfo) {
  const today = await cq<SrcPage>(`${PAGES_SQL} join game_day_pages gp on gp.page_id=p.id
     where gp.game_day_id=$1 and coalesce(p.densite,0)>0 order by d.ordre, p.numero`, [gd.id]);
  const past = await cq<SrcPage>(`${PAGES_SQL}
     join game_day_pages gp on gp.page_id=p.id join game_days g on g.id=gp.game_day_id
     where g.subject_id=$1 and g.saison=$2 and g.jour_dans_saison<$3 and coalesce(p.densite,0)>0
     order by g.jour_dans_saison, d.ordre, p.numero`, [gd.subject_id, gd.saison, gd.jour_dans_saison]);
  const pool_ = await cq<SrcPage>(`${PAGES_SQL} where d.subject_id=$1 and d.categorie='cours' and d.statut='pret' and coalesce(p.densite,0)>0 order by d.ordre, p.numero`, [gd.subject_id]);
  const uses = new Map((await cq<{ pid: string; n: string }>(
    `select pid, count(*) n from questions qq, jsonb_array_elements_text(qq.source_pages->'page_ids') pid where qq.subject_id=$1 group by pid`, [gd.subject_id])).map((r) => [r.pid, Number(r.n)]));
  const errs = new Map((await cq<{ pid: string; n: string }>(
    `select pid, count(*) n from questions qq cross join lateral jsonb_array_elements_text(qq.source_pages->'page_ids') pid
       join attempt_answers aa on aa.question_id=qq.id where qq.subject_id=$1 and not aa.correct group by pid`, [gd.subject_id])).map((r) => [r.pid, Number(r.n)]));
  // questions déjà posées dans la saison, hors jour courant (D13 : une nouvelle saison reprend le cours)
  const used = new Set((await cq<{ k: string }>(
    `select qq.enonce || '||' || (qq.choix ->> qq.correct_index) as k from questions qq join game_days g on g.id=qq.game_day_id
      where qq.subject_id=$1 and g.saison=$2 and g.id<>$3`, [gd.subject_id, gd.saison, gd.id])).map((r) => r.k));

  const nNew = today.length ? (past.length ? CONFIG.QUESTIONS_NOUVELLES : CONFIG.QUESTIONS_PAR_JOUR) : 0;
  const nRev = CONFIG.QUESTIONS_PAR_JOUR - nNew;
  // révision : notions les moins revues d'abord, puis celles où le groupe a le plus échoué, puis les plus anciennes
  const revSource = (past.length ? past : today.length ? [] : pool_)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (uses.get(a.p.id) ?? 0) - (uses.get(b.p.id) ?? 0) || (errs.get(b.p.id) ?? 0) - (errs.get(a.p.id) ?? 0) || a.i - b.i)
    .map((x) => x.p);
  return { today, pool_, used, nNew, nRev, revSource: revSource.length ? revSource : pool_ };
}

/**
 * Génère (idempotent) les 10 questions d'un jour : 6 nouvelles + 4 révision.
 * `preset` = questions rédigées par le chat (copier-coller) : elles sont validées puis complétées par le générateur simulé.
 * Avec `preset`, un jour déjà généré est remplacé tant que personne n'a commencé le quiz.
 */
export async function ensureQuestions(gameDayId: string, preset?: GenQuestion[]): Promise<GenReport | null> {
  const client = await pool.connect();
  const cq: Cq = async (text, params = []) => (await client.query(text, params)).rows;
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [gameDayId]);
    const [gd] = await cq<DayInfo>("select id,subject_id,saison,jour_dans_saison,statut_generation from game_days where id=$1", [gameDayId]);
    if (!gd) throw new Error("jour introuvable");
    if (gd.statut_generation === "ok") {
      if (!preset) { await client.query("commit"); return null; }
      const [{ n }] = await cq<{ n: string }>("select count(*) n from attempts where game_day_id=$1", [gameDayId]);
      if (Number(n) > 0) throw new Error("des joueurs ont déjà commencé ce quiz");
    }
    const t0 = Date.now();
    const ctx = await loadDayContext(cq, gd);
    const { today, pool_, used, revSource } = ctx;
    // questions manuelles du jour : conservées telles quelles, la génération ne remplit que les places restantes
    const fixes = await cq<{ kind: "new" | "revision"; enonce: string; choix: string[]; correct_index: number }>(
      "select kind,enonce,choix,correct_index from questions where game_day_id=$1 and manuelle", [gameDayId]);
    for (const f of fixes) used.add(qkey(f));
    const besoin = Math.max(0, CONFIG.QUESTIONS_PAR_JOUR - fixes.length);
    const nNew = Math.min(besoin, Math.max(0, ctx.nNew - fixes.filter((f) => f.kind === "new").length));
    const nRev = besoin - nNew;

    const fail = async (msg: string) => {
      await client.query("update game_days set statut_generation='echec' where id=$1", [gameDayId]);
      await client.query("commit");
      await logAi(gd.subject_id, "generation", Date.now() - t0, "echec");
      throw new Error(msg);
    };
    if (pool_.length === 0 && besoin > 0) return fail("aucun contenu de cours");

    // 1) questions du chat : validation technique, puis répartition nouvelles / révision
    const rejets: string[] = [];
    const ok: GenQuestion[] = [];
    for (const p of preset ?? []) {
      const err = validateTechnical(p, used);
      if (err) { rejets.push(`« ${p.enonce.slice(0, 60)} » : ${err}`); continue; }
      ok.push(p);
      used.add(qkey(p));
    }
    const chatNew = ok.filter((x) => x.kind === "new").slice(0, nNew);
    const chatRev = ok.filter((x) => x.kind === "revision").slice(0, nRev);
    const extra = ok.filter((x) => !chatNew.includes(x) && !chatRev.includes(x));
    while (chatNew.length + chatRev.length < besoin && extra.length) chatRev.push(extra.shift()!);
    const fromChat = new Set([...chatNew, ...chatRev]);

    // 2) complément par le générateur simulé
    const seed = hashString(gameDayId);
    const textById = new Map(pool_.map((p) => [p.id, p.texte]));
    // produit `count` questions vérifiées, avec régénération (2 tentatives max) puis remplacement par une autre notion
    const produce = async (kind: "new" | "revision", count: number, pages: SrcPage[], offset: number) => {
      const accepted: GenQuestion[] = [];
      if (count <= 0) return accepted;
      const tryRound = async (src: SrcPage[], round: number) => {
        const need = count - accepted.length;
        if (need <= 0 || src.length === 0) return;
        const cands = generateQuestions({ kind, count: need, pages: src, pool: pool_, used, seed: seed + (kind === "new" ? 0 : 1), round, typeOffset: offset + accepted.length });
        for (const c of cands) {
          const texts = c.source.page_ids.map((id) => textById.get(id) ?? "");
          if (validateTechnical(c, used) || !verifyQuestion(c, texts, c.correct_index).ok) continue;
          accepted.push(c);
          used.add(qkey(c));
        }
      };
      for (let round = 0; round <= CONFIG.MAX_REGENERATIONS; round++) await tryRound(pages, round);
      if (accepted.length < count) { // remplacement : autres notions du cours
        const taken = new Set(accepted.map((a) => a.notion));
        await tryRound(pool_.filter((p) => !taken.has(p.notion)), 0);
      }
      return accepted;
    };

    const nouvelles = [...chatNew, ...(await produce("new", nNew - chatNew.length, today, chatNew.length))];
    const revision = [...chatRev, ...(await produce("revision", nRev - chatRev.length, revSource, nouvelles.length + chatRev.length))];
    let all = [...nouvelles, ...revision];
    if (all.length < besoin) all = [...all, ...(await produce("revision", besoin - all.length, pool_, all.length))];
    if (all.length < besoin) return fail(`seulement ${all.length + fixes.length} questions valides`);
    all = all.slice(0, besoin);

    await client.query("delete from questions where game_day_id=$1 and not manuelle", [gameDayId]);
    for (const x of all) {
      await client.query(
        `insert into questions(subject_id,game_day_id,kind,type,enonce,choix,correct_index,explication,source_pages,notion,verifiee)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [gd.subject_id, gameDayId, x.kind, x.type, x.enonce, JSON.stringify(x.choix), x.correct_index, x.explication, JSON.stringify(x.source), x.notion, !fromChat.has(x)]);
    }
    await client.query("update game_days set statut_generation='ok' where id=$1", [gameDayId]);
    await client.query("commit");
    const nChat = all.filter((x) => fromChat.has(x)).length;
    await logAi(gd.subject_id, nChat ? "generation_chat" : "generation", Date.now() - t0, "ok");
    return { chat: nChat, simulees: all.length - nChat, manuelles: fixes.length, rejets };
  } catch (e) {
    try { await client.query("rollback"); } catch { /* déjà commité */ }
    throw e;
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------ tentatives */

type Attempt = {
  id: string; game_day_id: string; user_id: string; ordre_questions: string[]; ordre_choix: Record<string, number[]>; started_at: Date;
  statut: "en_cours" | "terminee" | "cloturee";
  /** Format du défi du jour (D41), fixé au début. Vrai ou faux : ordre_choix[q] = [réponse proposée]. Relier : `reserve` = ordre des réponses. */
  format: Format; reserve: string[] | null;
};
/** Comment afficher la question en cours : QCM classique, Vrai ou faux sur une réponse proposée, ou Relier (choisir dans la réserve). */
export type QuizMode = "qcm" | "vf" | "relier";
export type QuizQuestion = {
  id: string; type: "qcm" | "vrai_faux"; mode: QuizMode; enonce: string; choices: string[];
  /** Vrai ou faux : la réponse proposée. */
  proposition?: string;
  /** Relier : les questions qui restent à relier (celle en cours comprise), pour montrer le plateau. */
  restantes?: string[];
};
export type QuizState = { attemptId: string; format: Format; index: number; total: number; question: QuizQuestion; elapsedMs: number };

type QRow = { id: string; type: "qcm" | "vrai_faux"; enonce: string; choix: string[]; correct_index: number };
const bonneReponse = (r: QRow) => r.choix[r.correct_index];

/** Mode d'une question selon le format : les vrai/faux natifs restent des vrai/faux dans tous les formats. */
const modeDe = (a: Attempt, type: QRow["type"]): QuizMode => (type === "vrai_faux" ? "qcm" : a.format);

/** Relier : la réserve encore disponible (réponses des QCM pas encore joués), avec le texte de chaque réponse. */
async function reserveCourante(a: Attempt): Promise<{ id: string; texte: string }[]> {
  const jouees = new Set((await q<{ question_id: string }>("select question_id from attempt_answers where attempt_id=$1", [a.id])).map((r) => r.question_id));
  const ids = reserveRelier(a.reserve ?? [], jouees);
  const rows = await q<QRow>("select id,type,enonce,choix,correct_index from questions where id = any($1::uuid[])", [ids]);
  const par = new Map(rows.map((r) => [r.id, r]));
  // deux questions peuvent avoir la même réponse : une seule case par texte (la correction compare les textes)
  const vus = new Set<string>();
  return ids.filter((id) => par.has(id)).map((id) => ({ id, texte: bonneReponse(par.get(id)!) }))
    .filter((r) => { const k = r.texte.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(); if (vus.has(k)) return false; vus.add(k); return true; });
}

export async function currentState(a: Attempt): Promise<QuizState | null> {
  const [{ n }] = await q<{ n: string }>("select count(*) n from attempt_answers where attempt_id=$1", [a.id]);
  const index = Number(n);
  const qid = a.ordre_questions[index];
  if (!qid) return null;
  const [row] = await q<QRow>("select id,type,enonce,choix,correct_index from questions where id=$1", [qid]);
  const perm = a.ordre_choix[qid];
  const mode = modeDe(a, row.type);
  const base = { attemptId: a.id, format: a.format, index, total: a.ordre_questions.length, elapsedMs: Date.now() - new Date(a.started_at).getTime() };
  // la bonne réponse n'est jamais renvoyée ici
  if (mode === "vf") return { ...base, question: { id: row.id, type: row.type, mode, enonce: row.enonce, choices: ["Vrai", "Faux"], proposition: row.choix[perm[0]] } };
  if (mode === "relier") {
    const reserve = await reserveCourante(a);
    const restantes = a.ordre_questions.slice(index).filter((id) => (a.reserve ?? []).includes(id));
    const enonces = new Map((await q<{ id: string; enonce: string }>("select id,enonce from questions where id = any($1::uuid[])", [restantes])).map((r) => [r.id, r.enonce]));
    return { ...base, question: { id: row.id, type: row.type, mode, enonce: row.enonce, choices: reserve.map((r) => r.texte), restantes: restantes.map((id) => enonces.get(id) ?? "") } };
  }
  return { ...base, question: { id: row.id, type: row.type, mode, enonce: row.enonce, choices: perm.map((i) => row.choix[i]) } };
}

/** Termine une tentative (terminée par le joueur, ou clôturée) et recalcule les résultats provisoires du jour. */
export async function finishAttempt(attemptId: string, statut: "terminee" | "cloturee") {
  const [a] = await q<Attempt>("select * from attempts where id=$1 and statut='en_cours'", [attemptId]);
  if (!a) return;
  const started = new Date(a.started_at).getTime();
  const end = statut === "terminee" ? Date.now() : Math.min(Date.now(), started + CONFIG.DUREE_MAX_TENTATIVE_MIN * 60_000);
  const [{ ok }] = await q<{ ok: string }>("select count(*) filter (where correct) ok from attempt_answers where attempt_id=$1", [attemptId]);
  const erreurs = a.ordre_questions.length - Number(ok);
  const done = await q(
    "update attempts set statut=$2, finished_at=$3, erreurs=$4, duree_ms=$5 where id=$1 and statut='en_cours' returning id",
    [attemptId, statut, new Date(end), erreurs, Math.max(0, end - started)]);
  if (done.length) await recomputeDay(a.game_day_id);
}

/** Résultats du jour (provisoires tant que le jour n'est pas figé). */
export async function recomputeDay(gameDayId: string) {
  const [gd] = await q<{ jour_dans_saison: number; fige: boolean }>("select jour_dans_saison,fige from game_days where id=$1", [gameDayId]);
  if (!gd) return;
  const rows = await q<{ userId: string; erreurs: number; dureeMs: number; retard: number }>(
    `select user_id as "userId", erreurs, duree_ms as "dureeMs", retard_jours as retard from attempts where game_day_id=$1 and statut in ('terminee','cloturee')`, [gameDayId]);
  const mult = (await import("../scoring")).multiplicateur(gd.jour_dans_saison);
  for (const r of classementDuJour(rows, gd.jour_dans_saison)) {
    await q(
      `insert into daily_results(game_day_id,user_id,rang,erreurs,duree_ms,joueurs_battus,points_base,multiplicateur,points,provisoire,retard_jours)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (game_day_id,user_id) do update set rang=excluded.rang, erreurs=excluded.erreurs, duree_ms=excluded.duree_ms,
         joueurs_battus=excluded.joueurs_battus, points_base=excluded.points_base, multiplicateur=excluded.multiplicateur,
         points=excluded.points, provisoire=excluded.provisoire, retard_jours=excluded.retard_jours`,
      [gameDayId, r.userId, r.rang, r.erreurs, r.dureeMs, r.battus, r.base, mult, r.points, !gd.fige, r.retard ?? 0]);
  }
}

/** Dernier jour encore jouable (rattrapage) : aujourd'hui − RATTRAPAGE_JOURS, en SQL, pour la matière de `col`. */
const sqlLimiteRattrapage = (col: string) => `(${sqlToday(col)} - ${CONFIG.RATTRAPAGE_JOURS})`;

/** Clôture les tentatives abandonnées : > 15 min, ou d'un jour qui n'est plus rattrapable. */
export async function closeStaleAttempts(): Promise<number> {
  const stale = await q<{ id: string }>(
    `select a.id from attempts a join game_days g on g.id=a.game_day_id
      where a.statut='en_cours' and (a.started_at < now() - ($1 || ' minutes')::interval or g.date < ${sqlLimiteRattrapage("g.subject_id")})`,
    [String(CONFIG.DUREE_MAX_TENTATIVE_MIN)]);
  for (const s of stale) await finishAttempt(s.id, "cloturee");
  return stale.length;
}

/** Gèle les jours qui ne sont plus rattrapables (job de 00h00) : clôture les tentatives abandonnées, puis fige les résultats. Idempotent. */
export async function freezePastDays(): Promise<number> {
  await closeStaleAttempts();
  const days = await q<{ id: string }>(`select g.id from game_days g where g.date < ${sqlLimiteRattrapage("g.subject_id")} and not g.fige`);
  for (const d of days) {
    await q("update game_days set fige=true where id=$1", [d.id]);
    await recomputeDay(d.id); // provisoire = not fige → résultats définitifs
  }
  return days.length;
}

type StartResult = { status: number; body: any };

/** Nombre de jours de `a` à `b` (dates AAAA-MM-JJ). */
export const joursEntre = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);

export async function startAttempt(gameDayId: string, userId: string): Promise<StartResult> {
  const [gd] = await q<{ id: string; date: string; group_id: string; subject_id: string; statut_generation: string }>(
    `select g.id, to_char(g.date,'YYYY-MM-DD') as date, s.group_id, g.subject_id, g.statut_generation
       from game_days g join subjects s on s.id=g.subject_id where g.id=$1`, [gameDayId]);
  if (!gd || !(await memberRole(gd.group_id, userId))) return { status: 404, body: { error: "Quiz introuvable." } };
  const today = await todayParis(gd.subject_id);
  if (gd.date > today) return { status: 403, body: { error: "Ce quiz n'est pas encore disponible." } };
  const retard = joursEntre(gd.date, today);
  if (retard > CONFIG.RATTRAPAGE_JOURS) return { status: 403, body: { error: `Ce quiz est terminé : on ne peut le rattraper que pendant ${CONFIG.RATTRAPAGE_JOURS} jours.` } };

  await closeStaleAttempts();
  const get = async () => (await q<Attempt>("select * from attempts where game_day_id=$1 and user_id=$2", [gameDayId, userId]))[0];
  let a = await get();
  if (a && a.statut !== "en_cours") return { status: 409, body: { error: "Tu as déjà joué ce quiz (une seule tentative)." } };
  if (!a) {
    // quiz encore vide : l'IA l'écrit maintenant (~15 s) ; sinon le générateur simulé prend le relais
    if (gd.statut_generation !== "ok") await genererJourAvecIA(gd.subject_id, gameDayId);
    try { await ensureQuestions(gameDayId); } catch { return { status: 503, body: { error: "Le quiz du jour n'est pas disponible pour le moment." } }; }
    const ids = (await q<{ id: string }>("select id from questions where game_day_id=$1", [gameDayId])).map((r) => r.id);
    const rand = secureRand();
    const ordre = shuffled(ids, rand);
    const types = new Map((await q<{ id: string; type: string; n: number; correct_index: number }>(
      "select id,type,jsonb_array_length(choix) n,correct_index from questions where game_day_id=$1", [gameDayId])).map((r) => [r.id, r]));
    const qcm = ordre.filter((id) => types.get(id)!.type !== "vrai_faux");
    // défi du jour (D41) : le format dépend de la date du jour joué (un rattrapage garde le format de son jour)
    const format = formatJouable(formatDuJour(gd.date), qcm.length);
    const choix: Record<string, number[]> = {};
    for (const id of ordre) {
      const t = types.get(id)!;
      const idx = Array.from({ length: t.n }, (_, i) => i);
      if (t.type === "vrai_faux") choix[id] = idx; // Vrai/Faux garde son ordre naturel
      else if (format === "vf") choix[id] = [propositionVF(t.n, t.correct_index, rand)];
      else choix[id] = shuffled(idx, rand);
    }
    const reserve = format === "relier" ? shuffled(qcm, rand) : null;
    await q("insert into attempts(game_day_id,user_id,ordre_questions,ordre_choix,retard_jours,format,reserve) values ($1,$2,$3,$4,$5,$6,$7) on conflict (game_day_id,user_id) do nothing",
      [gameDayId, userId, JSON.stringify(ordre), JSON.stringify(choix), retard, format, reserve && JSON.stringify(reserve)]);
    a = await get();
  }
  const st = await currentState(a!);
  return st ? { status: 200, body: st } : { status: 409, body: { error: "Tentative terminée." } };
}

export async function submitAnswer(attemptId: string, userId: string, questionId: string, choice: number): Promise<StartResult> {
  const [a] = await q<Attempt>("select * from attempts where id=$1 and user_id=$2", [attemptId, userId]);
  if (!a) return { status: 404, body: { error: "Tentative introuvable." } };
  if (a.statut !== "en_cours") return { status: 409, body: { error: "Tentative terminée.", done: true } };
  if (Date.now() - new Date(a.started_at).getTime() > CONFIG.DUREE_MAX_TENTATIVE_MIN * 60_000) {
    await finishAttempt(a.id, "cloturee");
    return { status: 410, body: { error: "Temps écoulé : la tentative est clôturée.", done: true } };
  }
  const [{ n }] = await q<{ n: string }>("select count(*) n from attempt_answers where attempt_id=$1", [a.id]);
  const expected = a.ordre_questions[Number(n)];
  if (!expected || expected !== questionId) return { status: 409, body: { error: "Ce n'est pas la question en cours." } };
  const perm = a.ordre_choix[questionId];
  const [qq] = await q<QRow>("select id,type,enonce,choix,correct_index from questions where id=$1", [questionId]);
  const mode = modeDe(a, qq.type);
  // choix_index garde l'indice (dans les choix de la question) de la réponse donnée, -1 si elle n'en fait pas partie
  let orig: number, juste: boolean;
  if (mode === "vf") {
    if (choice !== 0 && choice !== 1) return { status: 400, body: { error: "Choix invalide." } };
    juste = vfJuste(choice, perm[0], qq.correct_index);
    orig = choice === 0 ? perm[0] : juste ? qq.correct_index : -1;
  } else if (mode === "relier") {
    const reserve = await reserveCourante(a);
    if (!Number.isInteger(choice) || choice < 0 || choice >= reserve.length) return { status: 400, body: { error: "Choix invalide." } };
    const texte = reserve[choice].texte;
    juste = relierJuste(texte, bonneReponse(qq));
    orig = juste ? qq.correct_index : qq.choix.findIndex((c) => relierJuste(c, texte));
  } else {
    if (!Number.isInteger(choice) || choice < 0 || choice >= perm.length) return { status: 400, body: { error: "Choix invalide." } };
    orig = perm[choice];
    juste = orig === qq.correct_index;
  }
  const ins = await q(
    "insert into attempt_answers(attempt_id,question_id,choix_index,correct) values ($1,$2,$3,$4) on conflict do nothing returning question_id",
    [a.id, questionId, orig, juste]);
  if (!ins.length) return { status: 409, body: { error: "Réponse déjà enregistrée." } };
  if (Number(n) + 1 >= a.ordre_questions.length) {
    await finishAttempt(a.id, "terminee");
    return { status: 200, body: { done: true } };
  }
  const fresh = (await q<Attempt>("select * from attempts where id=$1", [a.id]))[0];
  return { status: 200, body: await currentState(fresh) };
}

/* ------------------------------------------------------------------ correction */

export type CorrectionItem = {
  id: string; enonce: string; choix: string[]; correct_index: number; chosen: number | null; correct: boolean | null;
  explication: string; kind: string; source: { document_id: string; pages: number[] } | null;
};

export async function getCorrection(gameDayId: string, userId: string | null) {
  const qs = await q<CorrectionItem & { correct_index: number }>(
    "select id,enonce,choix,correct_index,explication,kind,source_pages as source from questions where game_day_id=$1", [gameDayId]);
  const [a] = userId ? await q<Attempt & { erreurs: number; duree_ms: number }>("select * from attempts where game_day_id=$1 and user_id=$2", [gameDayId, userId]) : [];
  const answers = a ? await q<{ question_id: string; choix_index: number; correct: boolean }>("select question_id,choix_index,correct from attempt_answers where attempt_id=$1", [a.id]) : [];
  const ans = new Map(answers.map((r) => [r.question_id, r]));
  const order = a?.ordre_questions ?? qs.map((x) => x.id);
  const byId = new Map(qs.map((x) => [x.id, x]));
  const items: CorrectionItem[] = order.filter((id) => byId.has(id)).map((id) => {
    const x = byId.get(id)!;
    const r = ans.get(id);
    return { ...x, chosen: r ? r.choix_index : null, correct: r ? r.correct : a ? false : null };
  });
  return { attempt: a ?? null, items };
}

/* ------------------------------------------------------------------ jobs */

/**
 * Génère (simulé) les quiz du jour qui n'ont pas encore de questions.
 * Les jours suivants sont laissés libres pour la génération par le chat.
 */
export async function generateUpcoming(subjectId?: string) {
  // « aujourd'hui » propre à chaque matière (mode démo : chaque matière avance indépendamment)
  const days = await q<{ id: string; subject_id: string }>(
    `select g.id, g.subject_id from game_days g where g.date = ${sqlToday("g.subject_id")} and g.statut_generation<>'ok' and ($1::uuid is null or g.subject_id=$1::uuid)
       and exists (select 1 from documents d where d.subject_id=g.subject_id and d.categorie='cours' and d.statut='pret')`,
    [subjectId ?? null]);
  let ok = 0, ko = 0;
  for (const d of days) {
    await genererJourAvecIA(d.subject_id, d.id); // IA d'abord (si configurée)
    try { await ensureQuestions(d.id); ok++; } catch (e) { ko++; console.error("génération", d.id, (e as Error).message); }
  }
  return { ok, echecs: ko };
}
