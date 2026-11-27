// APPEL AU MODÈLE DE LANGAGE (API compatible OpenAI, ex. service IA d'Onyxia / SSP Cloud).
// Côté serveur uniquement : la clé ne doit jamais partir vers le navigateur.
import { CONFIG } from "@/config/constants";

export const llmConfigured = () => !!process.env.OPENAI_API_KEY && !!process.env.OPENAI_BASE_URL;
export const llmModel = () => process.env.LLM_MODEL || CONFIG.LLM_MODELE;

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

/** Envoie une conversation au modèle et renvoie le texte de sa réponse. */
export async function chatLLM(messages: LlmMessage[], opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  if (!llmConfigured()) throw new Error("IA non configurée (OPENAI_API_KEY / OPENAI_BASE_URL manquants)");
  const base = process.env.OPENAI_BASE_URL!.replace(/\/+$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.LLM_TIMEOUT_S * 1000);
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: llmModel(),
        messages,
        max_tokens: opts.maxTokens ?? CONFIG.LLM_MAX_TOKENS,
        temperature: opts.temperature ?? 0.4,
        // Qwen3 : pas de « réflexion » à voix haute (bien plus rapide, même qualité pour des QCM)
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
    if (!r.ok) throw new Error(`IA : erreur ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("IA : réponse vide");
    return content;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error(`IA : pas de réponse après ${CONFIG.LLM_TIMEOUT_S} s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
