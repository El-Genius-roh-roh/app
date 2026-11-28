import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { q } from "./db";

const COOKIE = "session";

/** En production, un secret par défaut permettrait à quiconque de forger un cookie de session : on refuse. */
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET doit être défini en production.");
  return "dev-secret-change-me";
}

const sign = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("hex");
const sameSig = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60,
  });
}
export async function clearSession() { (await cookies()).delete(COOKIE); }

export type User = { id: string; email: string; pseudo: string | null; avatar_v: number | null; premium: boolean };

export async function getUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, sig] = raw.split(".");
  if (!id || !sig || !sameSig(sig, sign(id))) return null;
  const [u] = await q<User>("select id,email,pseudo,avatar_v,premium from profiles where id=$1", [id]);
  return u ?? null;
}

/** Exige un utilisateur connecté avec pseudo. */
export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (!u.pseudo) redirect("/profil");
  return u;
}

export async function createMagicLink(email: string): Promise<string> {
  const token = crypto.randomBytes(24).toString("hex");
  await q("insert into magic_links(token,email,expires_at) values ($1,$2, now() + interval '15 minutes')", [token, email.toLowerCase().trim()]);
  return token;
}

export async function consumeMagicLink(token: string): Promise<string | null> {
  const [l] = await q<{ email: string }>(
    "update magic_links set used=true where token=$1 and not used and expires_at>now() returning email", [token]);
  if (!l) return null;
  const [p] = await q<{ id: string }>(
    "insert into profiles(email) values ($1) on conflict (email) do update set email=excluded.email returning id", [l.email]);
  return p.id;
}
