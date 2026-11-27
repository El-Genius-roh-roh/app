// Test de bout en bout de la phase 3 (serveur de dev lancé sur :3000, base locale).
import pg from "pg";
const BASE = "http://localhost:3000";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query("set search_path to revision_app");
let fails = 0;
const ok = (c, m) => { console.log(c ? "  ✓" : "  ✗ ÉCHEC", m); if (!c) fails++; };

const [{ id: SID, group_id: GID }] = (await db.query("select id,group_id from subjects order by created_at limit 1")).rows;
// remise à zéro des données de jeu de la matière de test
await db.query("delete from daily_results where game_day_id in (select id from game_days where subject_id=$1)", [SID]);
await db.query("delete from attempts where game_day_id in (select id from game_days where subject_id=$1)", [SID]);
await db.query("delete from questions where subject_id=$1", [SID]);
await db.query("update game_days set statut_generation='attente', fige=false where subject_id=$1", [SID]);
await db.query("delete from app_settings where key='demo_today'");
const users = {};
for (const [name, email] of [["Alice", "demo@test.fr"], ["Bob", "bob@test.fr"], ["Chloé", "chloe@test.fr"]]) {
  const { rows: [p] } = await db.query("insert into profiles(email,pseudo) values ($1,$2) on conflict (email) do update set pseudo=$2 returning id", [email, name]);
  await db.query("insert into group_members(group_id,user_id,role) values ($1,$2,$3) on conflict do nothing", [GID, p.id, name === "Alice" ? "admin" : "membre"]);
  await db.query("insert into subject_players(subject_id,user_id) values ($1,$2) on conflict do nothing", [SID, p.id]);
  const token = "e2e_" + name + Date.now();
  await db.query("insert into magic_links(token,email,expires_at) values ($1,$2, now()+interval '10 min')", [token, email]);
  const r = await fetch(`${BASE}/auth/verify?token=${token}`, { redirect: "manual" });
  const cookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  users[name] = { id: p.id, cookie };
}
const call = async (u, path, body) => {
  const r = await fetch(BASE + path, { method: "POST", headers: { cookie: users[u]?.cookie ?? "", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const job = async (n) => (await fetch(`${BASE}/api/jobs/${n}`, { method: "POST", headers: { "x-job-secret": "dev-job-secret" } })).json();

const today = (await db.query("select coalesce((select value from app_settings where key='demo_today'), to_char(current_date,'YYYY-MM-DD')) d")).rows[0].d;
const day = async (d) => (await db.query("select * from game_days where subject_id=$1 and saison=1 and date=$2", [SID, d])).rows[0];
console.log("Date de jeu :", today);

console.log("Génération (job)");
console.log("  sans secret →", (await fetch(`${BASE}/api/jobs/generate`, { method: "POST" })).status);
const j1 = await job("generate");
console.log("  ", j1);
ok(j1.echecs === 0, "aucun échec de génération");
const d1 = await day(today);
const qs = (await db.query("select * from questions where game_day_id=$1", [d1.id])).rows;
ok(qs.length === 10, `10 questions générées (${qs.length})`);
ok(qs.every((x) => x.verifiee), "toutes vérifiées");
ok(new Set(qs.map((x) => x.enonce)).size === 10, "énoncés distincts");

async function play(name, wrongCount) {
  const r = await call(name, `/api/quiz/${d1.id}/start`);
  if (r.status !== 200) return r;
  ok(!JSON.stringify(r.json).includes("correct_index") && !("correct" in r.json.question), `${name}: la bonne réponse n'est pas envoyée`);
  let st = r.json, wrong = 0;
  const { rows: [att] } = await db.query("select * from attempts where id=$1", [st.attemptId]);
  for (let i = 0; i < 10; i++) {
    const { rows: [q] } = await db.query("select correct_index from questions where id=$1", [st.question.id]);
    const perm = att.ordre_choix[st.question.id];
    const good = perm.indexOf(q.correct_index);
    const choice = wrong < wrongCount ? (wrong++, (good + 1) % perm.length) : good;
    const a = await call(name, `/api/quiz/${st.attemptId}/answer`, { questionId: st.question.id, choice });
    if (a.json.done) return { ...r, done: true, attemptId: st.attemptId };
    st = { ...st, ...a.json };
    await new Promise((res) => setTimeout(res, name === "Alice" ? 5 : 40));
  }
}
console.log("Parcours Alice (0 erreur), Bob (2 erreurs)");
const alice = await play("Alice", 0);
const bob = await play("Bob", 2);
ok(alice.done && bob.done, "tentatives terminées");
const res = (await db.query("select p.pseudo, a.erreurs, a.duree_ms, a.statut from attempts a join profiles p on p.id=a.user_id where a.game_day_id=$1 order by a.erreurs", [d1.id])).rows;
console.log("  ", res);
ok(res.find((x) => x.pseudo === "Alice").erreurs === 0 && res.find((x) => x.pseudo === "Bob").erreurs === 2, "erreurs comptées côté serveur");

console.log("Règles de sécurité");
ok((await call("Alice", `/api/quiz/${d1.id}/start`)).status === 409, "une seule tentative (409)");
ok((await call("Anonyme", `/api/quiz/${d1.id}/start`)).status === 401, "non connecté refusé (401)");
const att2 = (await db.query("select id from attempts where game_day_id=$1 and user_id=$2", [d1.id, users.Alice.id])).rows[0];
ok((await call("Alice", `/api/quiz/${att2.id}/answer`, { questionId: qs[0].id, choice: 0 })).status === 409, "répondre après la fin refusé (409)");

console.log("Chloé : reprise, ordre imposé, abandon puis clôture");
const c1 = await call("Chloé", `/api/quiz/${d1.id}/start`);
const c1bis = await call("Chloé", `/api/quiz/${d1.id}/start`);
ok(c1bis.status === 200 && c1bis.json.question.id === c1.json.question.id, "redémarrage = reprise de la même question");
const wrongQ = qs.find((x) => x.id !== c1.json.question.id);
ok((await call("Chloé", `/api/quiz/${c1.json.attemptId}/answer`, { questionId: wrongQ.id, choice: 0 })).status === 409, "pas de saut de question (409)");
await call("Chloé", `/api/quiz/${c1.json.attemptId}/answer`, { questionId: c1.json.question.id, choice: 0 });
await db.query("update attempts set started_at = now() - interval '20 minutes' where id=$1", [c1.json.attemptId]);
console.log("  job close →", await job("close"));
const ch = (await db.query("select statut, erreurs, duree_ms from attempts where id=$1", [c1.json.attemptId])).rows[0];
ok(ch.statut === "cloturee" && ch.erreurs >= 9, `clôturée, ${ch.erreurs} erreurs (non répondues = erreurs), durée ${Math.round(ch.duree_ms / 1000)} s (plafonnée à 15 min)`);

console.log("Résultats du jour (provisoires)");
const dr = (await db.query("select p.pseudo, r.rang, r.joueurs_battus, r.points, r.provisoire from daily_results r join profiles p on p.id=r.user_id where r.game_day_id=$1 order by r.rang", [d1.id])).rows;
console.log("  ", dr);
ok(dr[0].pseudo === "Alice" && dr[0].joueurs_battus === 2 && dr[0].points === 20, "Alice 1re : 10 + 5×2 = 20 pts (jour 1, ×1)");

console.log("Pages");
const page = await (await fetch(`${BASE}/quiz/${d1.id}`, { headers: { cookie: users.Alice.cookie } })).text();
ok(page.includes("Correction") && page.includes("Revoir la slide"), "écran de correction avec lien vers la slide");

console.log("Jour suivant : 7 nouvelles + 3 révision");
const tomorrow = new Date(Date.parse(today) + 86400000).toISOString().slice(0, 10);
await db.query("insert into app_settings(key,value) values ('demo_today',$1) on conflict (key) do update set value=$1", [tomorrow]);
const j2 = await job("generate");
console.log("  ", j2);
ok(j2.echecs === 0, "aucun échec de génération");
const d2 = await day(tomorrow);
const q2 = (await db.query("select kind,enonce,notion from questions where game_day_id=$1", [d2.id])).rows;
ok(q2.length === 10, `10 questions (${q2.length})`);
ok(q2.filter((x) => x.kind === "new").length === 7 && q2.filter((x) => x.kind === "revision").length === 3, "7 nouvelles + 3 révision");
const all = (await db.query("select enonce || '||' || (choix ->> correct_index) k from questions where subject_id=$1", [SID])).rows.map((r) => r.k);
ok(new Set(all).size === all.length, "aucune question déjà posée n'est reposée");
ok((await call("Alice", `/api/quiz/${d1.id}/start`)).status === 403, "le quiz de la veille n'est plus jouable (403)");
console.log("Toute la durée de la matière : génération jour après jour (2 saisons)");
const last = (await db.query("select to_char(max(date),'YYYY-MM-DD') d from game_days where subject_id=$1", [SID])).rows[0].d;
let cur = tomorrow, bad = 0;
while (cur <= last) {
  await db.query("update app_settings set value=$1 where key='demo_today'", [cur]);
  const r = await job("generate");
  bad += r.echecs;
  cur = new Date(Date.parse(cur) + 86400000).toISOString().slice(0, 10);
}
const nb = (await db.query("select count(*) filter (where statut_generation='ok') ok, count(*) tot from game_days where subject_id=$1", [SID])).rows[0];
ok(bad === 0 && nb.ok === nb.tot, `${nb.ok}/${nb.tot} jours générés, ${bad} échec(s)`);
await db.query("delete from app_settings where key='demo_today'");
console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTout est OK");
await db.end();
process.exit(fails ? 1 : 0);
