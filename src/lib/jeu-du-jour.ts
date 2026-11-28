// Mini-jeu du jour (D40) : un jeu différent chaque jour, le même pour tous les joueurs. Fonctions pures, testées
// dans jeu-du-jour.test.ts. La rotation suit la vraie date de Paris (realToday), pas la date de démo d'une matière.
import { JEU_DU_JOUR } from "@/config/constants";
import type { IconName } from "@/components/Icon";

export type JeuId = (typeof JEU_DU_JOUR.ROTATION)[number];
export type Jeu = {
  id: JeuId; titre: string; desc: string; icone: IconName;
  /** « matiere » : jeu solo sur une matière (page /matieres/[id]/<id>) ; « arene » : partie d'Arène avec des bots. */
  lieu: "matiere" | "arene";
  /** Type de session solo enregistrée à la fin (gemmes solo, défi du jour). */
  solo: "relier" | "memory" | "arene";
};

export const JEUX: Record<JeuId, Jeu> = {
  relier: { id: "relier", titre: "Relier", desc: "Relie chaque notion à sa définition, en faisant le moins d'erreurs possible.", icone: "share", lieu: "matiere", solo: "relier" },
  memory: { id: "memory", titre: "Memory", desc: "Retourne les cartes deux par deux et retrouve toutes les paires.", icone: "cards", lieu: "matiere", solo: "memory" },
  blitz: { id: "blitz", titre: "Quiz éclair", desc: "Des QCM chronométrés contre des bots : plus tu réponds vite, plus tu marques.", icone: "clock", lieu: "arene", solo: "arene" },
  vf: { id: "vf", titre: "Vrai ou faux", desc: "Une rafale d'affirmations : vrai ou faux ? Contre des bots, ou invite tes amis.", icone: "check", lieu: "arene", solo: "arene" },
  course: { id: "course", titre: "Course", desc: "Chaque bonne réponse te fait avancer : le premier arrivé gagne.", icone: "flame", lieu: "arene", solo: "arene" },
};

/** Numéro du jour (jours depuis le 1er janvier 1970) d'une date « AAAA-MM-JJ ». */
export function numeroDuJour(date: string): number {
  const [a, m, j] = date.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, j) / 86_400_000);
}

/** Jeu d'une date : la rotation avance d'un cran chaque jour. */
export function jeuDuJour(date: string): Jeu {
  const r = JEU_DU_JOUR.ROTATION;
  return JEUX[r[((numeroDuJour(date) % r.length) + r.length) % r.length]];
}

/** Lien du jeu : sa page dans la matière, ou l'encart du jeu du jour dans l'Arène. Null si aucune matière n'est jouable. */
export function lienDuJeu(jeu: Jeu, matiere: string | null): string | null {
  if (jeu.lieu === "arene") return "/arene#jeu-du-jour";
  return matiere ? `/matieres/${matiere}/${jeu.id}` : null;
}

/** Le jeu du jour est-il fait ? Sessions solo du jour par type ; pour un jeu d'Arène, une partie entre amis compte aussi. */
export function jeuFait(jeu: Jeu, solo: Partial<Record<Jeu["solo"], number>>, multi: number): boolean {
  return (solo[jeu.solo] ?? 0) > 0 || (jeu.lieu === "arene" && multi > 0);
}
