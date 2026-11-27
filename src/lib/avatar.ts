// PHOTO DE PROFIL : recadrée au carré, réduite à 256 px et convertie en WebP côté serveur.
import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { q } from "./db";
import { STORAGE } from "./ingest";

const TAILLE = 256;
const MAX_OCTETS = 15 * 1024 * 1024;
export const avatarFile = (userId: string) => path.join(STORAGE, "avatars", `${userId}.webp`);

export async function saveAvatar(userId: string, file: File): Promise<string | null> {
  if (!file.size) return "Choisis une image.";
  if (file.size > MAX_OCTETS) return "Image trop lourde (15 Mo maximum).";
  let img;
  try { img = await loadImage(Buffer.from(await file.arrayBuffer())); }
  catch { return "Format non reconnu : utilise une photo JPEG, PNG ou WebP."; }
  const cote = Math.min(img.width, img.height);
  const canvas = createCanvas(TAILLE, TAILLE);
  canvas.getContext("2d").drawImage(img, (img.width - cote) / 2, (img.height - cote) / 2, cote, cote, 0, 0, TAILLE, TAILLE);
  fs.mkdirSync(path.dirname(avatarFile(userId)), { recursive: true });
  fs.writeFileSync(avatarFile(userId), await canvas.encode("webp", 85));
  await q("update profiles set avatar_v=coalesce(avatar_v,0)+1 where id=$1", [userId]);
  return null;
}

export async function removeAvatar(userId: string) {
  fs.rmSync(avatarFile(userId), { force: true });
  await q("update profiles set avatar_v=null where id=$1", [userId]);
}

/** Version de la photo de chaque joueur (null = pas de photo). */
export async function avatarsOf(userIds: string[]): Promise<Map<string, number | null>> {
  if (!userIds.length) return new Map();
  const rows = await q<{ id: string; v: number | null }>("select id, avatar_v as v from profiles where id = any($1)", [userIds]);
  return new Map(rows.map((r) => [r.id, r.v]));
}
