import { CONFIG } from "@/config/constants";
import { q } from "./db";

/** Vraie date du jour (YYYY-MM-DD) à Paris. */
export const realToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: CONFIG.FUSEAU }).format(new Date());

const demo = () => process.env.DEMO_MODE === "1";
const cle = (subjectId: string) => `demo_today:${subjectId}`;

/**
 * Date du jour (YYYY-MM-DD) à Paris.
 * En mode démo (`DEMO_MODE=1`), **chaque matière a sa propre date** (réglage `demo_today:<id matière>`),
 * avancée par le bouton « Jour suivant » de la matière, indépendamment des autres matières.
 * Sans matière : la date démo commune (ancien réglage `demo_today`), sinon la vraie date.
 */
export async function todayParis(subjectId?: string): Promise<string> {
  if (demo()) {
    const rows = await q<{ key: string; value: string }>(
      "select key, value from app_settings where key = any($1)", [subjectId ? [cle(subjectId), "demo_today"] : ["demo_today"]]);
    const v = (subjectId && rows.find((r) => r.key === cle(subjectId))?.value) || rows.find((r) => r.key === "demo_today")?.value;
    if (v) return v;
  }
  return realToday();
}

/** Avance (mode démo) la date d'une seule matière. */
export async function setDemoToday(date: string, subjectId: string) {
  await q("insert into app_settings(key,value) values ($1,$2) on conflict (key) do update set value=excluded.value", [cle(subjectId), date]);
}

/**
 * Expression SQL « date du jour » de la matière dont l'identifiant est dans la colonne `col`
 * (ex. `g.subject_id`), pour les requêtes qui couvrent plusieurs matières à la fois.
 */
export function sqlToday(col: string): string {
  const real = `'${realToday()}'::date`; // format AAAA-MM-JJ produit par Intl : sûr dans la requête
  if (!demo()) return real;
  return `coalesce((select value::date from app_settings where key = 'demo_today:' || ${col}::text),
                   (select value::date from app_settings where key = 'demo_today'), ${real})`;
}

/** Date du jour la plus avancée parmi les matières d'un groupe (séries de jours, trophées). */
export async function todayGroupe(groupId: string): Promise<string> {
  const [r] = await q<{ d: string | null }>(
    `select to_char(max(${sqlToday("s.id")}),'YYYY-MM-DD') as d from subjects s where s.group_id=$1`, [groupId]);
  return r?.d ?? (await todayParis());
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
