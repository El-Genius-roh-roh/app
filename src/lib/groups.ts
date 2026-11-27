import crypto from "crypto";
import { q } from "./db";
import { CONFIG } from "@/config/constants";

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function genCode(): string {
  return Array.from(crypto.randomBytes(CONFIG.CODE_INVITATION_LONGUEUR), (b) => ALPHA[b % ALPHA.length]).join("");
}
export async function memberRole(groupId: string, userId: string) {
  const [m] = await q<{ role: "admin" | "membre" }>("select role from group_members where group_id=$1 and user_id=$2", [groupId, userId]);
  return m?.role ?? null;
}
/** Ajoute le membre au groupe et l'inscrit comme joueur de toutes les matières. */
export async function joinGroup(groupId: string, userId: string, role: "admin" | "membre" = "membre") {
  await q("insert into group_members(group_id,user_id,role) values ($1,$2,$3) on conflict do nothing", [groupId, userId, role]);
  await q("insert into subject_players(subject_id,user_id) select id,$2 from subjects where group_id=$1 on conflict do nothing", [groupId, userId]);
}
