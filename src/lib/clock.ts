import { CONFIG } from "@/config/constants";
import { q } from "./db";

/**
 * Date du jour (YYYY-MM-DD) à Paris.
 * En mode démo (`DEMO_MODE=1`), la date peut être avancée à la main (réglage `demo_today` en base).
 */
export async function todayParis(): Promise<string> {
  if (process.env.DEMO_MODE === "1") {
    const [s] = await q<{ value: string }>("select value from app_settings where key='demo_today'");
    if (s?.value) return s.value;
  }
  return new Intl.DateTimeFormat("en-CA", { timeZone: CONFIG.FUSEAU }).format(new Date());
}

export async function setDemoToday(date: string) {
  await q("insert into app_settings(key,value) values ('demo_today',$1) on conflict (key) do update set value=excluded.value", [date]);
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
