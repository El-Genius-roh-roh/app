// Tableau de bord personnel (D38) : ce que le joueur voit en ouvrant l'application (onglet Réviser).
import { q } from "./db";
import { realToday, todayGroupe } from "./clock";
import { getGroupResults, getGroupTrophees, tropheesDuJoueur, type TropheeLine } from "./ranking";
import { vitrine, type Resultat } from "./trophees";
import { soloDuJour } from "./solo";
import { defisDuJour, succes, titresDuGroupe, type Defi, type Succes } from "./succes";

/** Note le jour de visite (succès « fidèle »). Au plus une écriture par joueur et par jour et par processus. */
const vus = new Map<string, string>();
export async function marquerVisite(userId: string) {
  const jour = realToday();
  if (vus.get(userId) === jour) return;
  await q("insert into user_activity(user_id,date) values ($1,$2::date) on conflict do nothing", [userId, jour]);
  vus.set(userId, jour);
}

/** Ma place dans un groupe : trophées gagnés dans ses matières, et ceux en jeu dans ses saisons en cours. */
export type ClassementGroupe = { groupId: string; nom: string; ligne: TropheeLine | null; enJeu: number; membres: number };
export type TableauDeBord = { classements: ClassementGroupe[]; defis: Defi[]; succes: Succes[]; ligue: { total: number; enJeu: number } };

/**
 * @param quiz quiz du jour de mes matières (faits / prévus) et lien vers le prochain
 * @param matiere matière conseillée pour les jeux solo (celle qui a le plus de cartes)
 */
export async function tableauDeBord(userId: string, quiz: { faits: number; total: number; href: string }, matiere: string | null): Promise<TableauDeBord> {
  const groupes = await q<{ id: string; nom: string }>(
    "select g.id, g.nom from groups g join group_members m on m.group_id=g.id where m.user_id=$1 order by g.created_at", [userId]);

  const classements: ClassementGroupe[] = [];
  const resultats: Resultat[] = [];
  const dates = new Set([realToday()]);
  let saisonsGagnees = 0, plusRapide = false, plusAssidu = false;
  for (const g of groupes) {
    const tr = await getGroupTrophees(g.id);
    dates.add(await todayGroupe(g.id));
    const enJeu = tr.saisons.filter((s) => !s.terminee).reduce((n, s) => n + (s.classement.find((l) => l.userId === userId)?.trophees ?? 0), 0);
    classements.push({ groupId: g.id, nom: g.nom, ligne: tr.lignes.find((l) => l.userId === userId) ?? null, enJeu, membres: tr.lignes.length });
    // saison gagnée : 1er d'une saison terminée, avec au moins un autre joueur classé
    saisonsGagnees += tr.saisons.filter((s) => s.terminee && s.classement.length >= 2 && s.classement.some((l) => l.userId === userId && l.rang === 1)).length;

    const res = await getGroupResults(g.id);
    resultats.push(...res);
    const stats = new Map<string, { userId: string; quiz: number; dureeMoyMs: number }>();
    for (const r of res) {
      const s = stats.get(r.userId) ?? { userId: r.userId, quiz: 0, dureeMoyMs: 0 };
      s.dureeMoyMs = (s.dureeMoyMs * s.quiz + r.dureeMs) / (s.quiz + 1);
      s.quiz += 1;
      stats.set(r.userId, s);
    }
    const t = titresDuGroupe([...stats.values()]);
    plusRapide ||= t.plusRapide.has(userId);
    plusAssidu ||= t.plusAssidu.has(userId);
  }

  const visites = (await q<{ d: string }>("select to_char(date,'YYYY-MM-DD') as d from user_activity where user_id=$1", [userId])).map((r) => r.d);
  const soloTotal = Object.fromEntries((await q<{ type: string; n: number }>(
    "select type, count(*)::int as n from solo_sessions where user_id=$1 group by type", [userId])).map((r) => [r.type, r.n]));
  const [{ parties }] = await q<{ parties: number }>("select coalesce(sum(parties),0)::int as parties from arena_ratings where user_id=$1", [userId]);
  // parties multijoueur terminées aujourd'hui (Arène et plateau, dont l'état garde la liste des joueurs)
  const moi = JSON.stringify([{ id: userId }]);
  const [{ multi }] = await q<{ multi: number }>(
    `select ((select count(*) from arena_rooms where phase='final' and updated_at >= $2::date and state->'players' @> $1::jsonb)
           + (select count(*) from plateau_rooms where phase='final' and updated_at >= $2::date and state->'joueurs' @> $1::jsonb))::int as multi`,
    [moi, realToday()]);

  const defis = defisDuJour({ quiz, solo: await soloDuJour(userId, [...dates]), multi, matiere });
  const liste = succes({
    today: realToday(), visites, vitrine: vitrine(resultats, userId, realToday()),
    solo: { flashcards: soloTotal.flashcards ?? 0, memory: soloTotal.memory ?? 0, arene: soloTotal.arene ?? 0 },
    areneParties: parties, saisonsGagnees, plusRapide, plusAssidu,
  });
  return { classements, defis, succes: liste, ligue: await tropheesDuJoueur(userId) };
}
