import fs from "fs";
import path from "path";
import { Client } from "pg";

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const dir = path.join(__dirname, "migrations");
  for (const f of fs.readdirSync(dir).sort()) {
    await c.query(fs.readFileSync(path.join(dir, f), "utf8"));
    console.log("ok", f);
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
