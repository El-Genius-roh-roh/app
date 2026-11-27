// Test de bout en bout de la phase 4. Serveur de dev sur :3000, DATABASE_URL et DEMO_MODE=1 requis.
import pg from "pg";
import { getSeasonRanking, getGroupRanking, getDayRanking, getSeasons } from "../src/lib/ranking";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("set search_path to revision_app");
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "  ✓" : "  ✗ ÉCHEC", m); if (!c) fails++; };
const setDate = (d: string) => db.query("insert into app_settings(key,value) values ('demo_today',$1) on conflict (key) do update set value=$1", [d]);
const job = async (n: string) => (await fetch(`${BASE}/api/jobs/${n}`, { method: "POST", headers: { "x-job-secret": "dev-job-secret" } })).json() as Promise<any>;

const { rows: [{ id: SID, group_id: GID }] } = await db.query("select id,group_id from subjects order by created_at limit 1");
// remise à zéro
await db.query("delete from subjects where nom like 'FAUSSE%'");
await db.query("delete from daily_results where game_day_id in (select id from game_days where subject_id=$1)", [SID]);
await db.query("delete from attempts where game_day_id in (select id from game_days where subject_id=$1)", [SID]);
await db.query("delete from questions where subject_id=$1", [SID]);
await db.query("update game_days set statut_generation='attente', fige=false where subject_id=$1", [SID]);
const start = (await db.query("select to_char(min(date),'YYYY-MM-DD') d from game_days where subject_id=$1", [SID])).rows[0].d as string;
const plus = (n: number) => new Date(Date.parse(start) + n * 86400000).toISOString().slice(0, 10);

const users: Record<string, { id: string; cookie: string }> = {};
for (const [name, email] of [["Alice", "demo@test.fr"], ["Bob", "bob@test.fr"], ["Chloé", "chloe@test.fr"], ["Dana", "dana@test.fr"]]) {
  const { rows: [p] } = await db.query("insert into profiles(email,pseudo) values ($1,$2) on conflict (email) do update set pseudo=$2 returning id", [email, name]);
  await db.query("insert into group_members(group_id,user_id,role) values ($1,$2,'membre') on conflict do nothing", [GID, p.id]);
  await db.query("insert into subject_players(subject_id,user_id) values ($1,$2) on conflict do nothing", [SID, p.id]);
  const token = "r4_" + name + Date.now();
  await db.query("insert into magic_links(token,email,expires_at) values ($1,$2, now()+interval '10 min')", [token, email]);
  const r = await fetch(`${BASE}/auth/verify?token=${token}`, { redirect: "manual" });
  users[name] = { id: p.id, cookie: r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") };
}
const call = async (u: string, path: string, body?: unknown) => {
  const r = await fetch(BASE + path, { method: "POST", headers: { cookie: users[u].cookie, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: (await r.json().catch(() => ({}))) as any };
};
const dayId = async (d: string) => (await db.query("select id from game_days where subject_id=$1 and saison=1 and date=$2", [SID, d])).rows[0].id as string;

async function play(name: string, dId: string, wrongCount: number, abandon = false) {
  const r = await call(name, `/api/quiz/${dId}/start`);
  if (r.status !== 200) throw new Error(`start ${name}: ${r.status} ${JSON.stringify(r.json)}`);
  let st = r.json;
  const { rows: [att] } = await db.query("select * from attempts where id=$1", [st.attemptId]);
  let wrong = 0;
  for (let i = 0; i < 10; i++) {
    const { rows: [q] } = await db.query("select correct_index from questions where id=$1", [st.question.id]);
    const perm: number[] = att.ordre_choix[st.question.id];
    const good = perm.indexOf(q.correct_index);
    const choice = wrong < wrongCount ? (wrong++, (good + 1) % perm.length) : good;
    const a = await call(name, `/api/quiz/${st.attemptId}/answer`, { questionId: st.question.id, choice });
    if (a.json.done || abandon) return;
    st = { ...st, ...a.json };
  }
}

const D1 = plus(0), D2 = plus(1), D3 = plus(2);
const pts = async (dId: string) => Object.fromEntries((await db.query("select p.pseudo, r.points, r.provisoire from daily_results r join profiles p on p.id=r.user_id where r.game_day_id=$1", [dId])).rows.map((r) => [r.pseudo, [r.points, r.provisoire]]));

console.log("Jour 1 : Alice 0 err., Bob 2 err., Chloé abandonne");
await setDate(D1); await job("midnight");
await play("Alice", await dayId(D1), 0); await play("Bob", await dayId(D1), 2); await play("Chloé", await dayId(D1), 0, true);
console.log("Jour 2 : Bob 0, Alice 1, Chloé 3 (minuit : le jour 1 est gelé)");
await setDate(D2); console.log("  ", await job("midnight"));
const r1 = await pts(await dayId(D1));
ok(r1.Alice[0] === 20 && r1.Bob[0] === 15 && r1.Chloé[0] === 10, `jour 1 : Alice 20, Bob 15, Chloé 10 (${JSON.stringify(r1)})`);
ok(Object.values(r1).every((v: any) => v[1] === false), "jour 1 définitif (non provisoire)");
const ch = (await db.query("select statut, erreurs from attempts where game_day_id=$1 and user_id=$2", [await dayId(D1), users.Chloé.id])).rows[0];
ok(ch.statut === "cloturee" && ch.erreurs === 9, "tentative abandonnée clôturée à minuit (9 erreurs)");
await play("Bob", await dayId(D2), 0); await play("Alice", await dayId(D2), 1); await play("Chloé", await dayId(D2), 3);
const mid2 = await pts(await dayId(D2));
ok(mid2.Bob[1] === true && mid2.Bob[0] === 21, "jour 2 provisoire en cours de journée (Bob 21)");
console.log("Jour 3 : Chloé 0, Bob 1, Alice 2");
await setDate(D3); await job("midnight");
await play("Chloé", await dayId(D3), 0); await play("Bob", await dayId(D3), 1); await play("Alice", await dayId(D3), 2);
const r2 = await pts(await dayId(D2)), r3 = await pts(await dayId(D3));
ok(r2.Bob[0] === 21 && r2.Alice[0] === 16 && r2.Chloé[0] === 11, `jour 2 : Bob 21, Alice 16 (15,75 → 16), Chloé 11 (10,5 → 11) (${JSON.stringify(r2)})`);
ok(r3.Chloé[0] === 22 && r3.Bob[0] === 17 && r3.Alice[0] === 11, `jour 3 : Chloé 22, Bob 17 (16,5 → 17), Alice 11 (${JSON.stringify(r3)})`);
ok(r2.Bob[1] === false && r3.Bob[1] === true, "jour 2 figé, jour 3 encore provisoire");

console.log("Classement du jour");
const dr = await getDayRanking(await dayId(D3));
ok(dr!.lines.map((l) => l.pseudo).join() === "Chloé,Bob,Alice" && dr!.absents.join() === "Dana", "ordre Chloé, Bob, Alice ; Dana signalée absente");

console.log("Classement de saison");
const season = await getSeasonRanking(SID, 1);
console.log("  ", season.map((l) => `${l.rang}.${l.pseudo}=${l.points}`).join("  "));
ok(season.map((l) => `${l.pseudo}:${l.points}`).join() === "Bob:53,Alice:47,Chloé:43,Dana:0", "Bob 53, Alice 47, Chloé 43, Dana 0");
ok(season.find((l) => l.pseudo === "Dana")!.rang === 4 && season[0].rang === 1, "Dana à 0 point classée 4e");

console.log("Classement général du groupe (2 matières, 2 périodes)");
const { rows: [s2] } = await db.query("insert into subjects(group_id,nom,created_by,date_debut,jours_par_saison,nb_saisons) values ($1,'FAUSSE matière',$2,$3,2,1) returning id", [GID, users.Alice.id, plus(-40)]);
const gOld = (await db.query("insert into game_days(subject_id,saison,jour_dans_saison,date,fige) values ($1,1,1,$2,true) returning id", [s2.id, plus(-40)])).rows[0].id;
const gNew = (await db.query("insert into game_days(subject_id,saison,jour_dans_saison,date,fige) values ($1,1,2,$2,true) returning id", [s2.id, plus(-1)])).rows[0].id;
const ins = (g: string, u: string, p: number) => db.query("insert into daily_results(game_day_id,user_id,rang,erreurs,duree_ms,joueurs_battus,points_base,multiplicateur,points,provisoire) values ($1,$2,1,0,1000,0,10,1,$3,false)", [g, u, p]);
await ins(gOld, users.Bob.id, 100); await ins(gNew, users.Alice.id, 30);
const all = await getGroupRanking(GID);
ok(all.map((l) => `${l.pseudo}:${l.points}`).join() === "Bob:153,Alice:77,Chloé:43,Dana:0", `depuis le début : Bob 153, Alice 77 (${all.map((l) => l.pseudo + ":" + l.points)})`);

console.log("Gel idempotent");
const before = JSON.stringify(await pts(await dayId(D2)));
const f1 = await job("freeze");
ok(f1.figes >= 0 && JSON.stringify(await pts(await dayId(D2))) === before, "relancer le gel ne change rien");
ok((await job("freeze")).figes === 0, "rien à geler la seconde fois");

console.log("Fin de saison : podium");
await setDate(plus(30)); await job("midnight");
const seasons = await getSeasons(SID);
ok(seasons.every((s) => s.termine), "les deux saisons sont terminées");
const d3 = await pts(await dayId(D3));
ok(Object.values(d3).every((v: any) => v[1] === false), "jour 3 gelé à son tour");
const html = (await (await fetch(`${BASE}/matieres/${SID}?saison=1`, { headers: { cookie: users.Alice.cookie } })).text()).replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
ok(html.includes("Saisons terminées") && html.includes("53 pts") && html.includes("Classement de la saison 1"), "page matière : classement + podiums des saisons terminées");
ok(html.includes("jour 3") && html.includes("Chloé"), "saison terminée : le classement du jour montre le dernier jour joué (jour 3)");
const ghtml = await (await fetch(`${BASE}/groupes/${GID}`, { headers: { cookie: users.Alice.cookie } })).text();
ok(ghtml.includes("Classement général") && !ghtml.includes("30 derniers jours"), "page groupe : classement général (depuis le début)");

await db.query("delete from subjects where id=$1", [s2.id]);
await db.query("delete from app_settings where key='demo_today'");
console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTout est OK");
await db.end();
process.exit(fails ? 1 : 0);
