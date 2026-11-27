import { Pool } from "pg";

// Utilise PGHOST/PGUSER/... ou DATABASE_URL. Schéma dédié : revision_app.
const g = globalThis as unknown as { __pool?: Pool };
export const pool: Pool =
  g.__pool ??
  (g.__pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c search_path=revision_app,public",
  }));

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(text, params);
  return r.rows as T[];
}
