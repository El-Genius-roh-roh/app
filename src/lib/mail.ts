// Envoi du lien de connexion par e-mail (API Resend, https://resend.com). Côté serveur uniquement.
// Sans RESEND_API_KEY / MAIL_FROM, aucun e-mail n'est envoyé (voir src/app/login/page.tsx pour le repli).
import { APP_NAME } from "@/config/constants";

export const mailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

export async function sendLoginMail(to: string, link: string): Promise<void> {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [to],
      subject: `Ton lien de connexion à ${APP_NAME}`,
      text: `Bonjour,\n\nClique sur ce lien pour te connecter (valable 15 minutes) :\n${link}\n\nSi tu n'as rien demandé, ignore cet e-mail.`,
    }),
  });
  if (!r.ok) throw new Error(`envoi de l'e-mail impossible (${r.status})`);
}
