import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "./_lib/cors";
import { lookupWord } from "./_lib/lookup";
import type { LanguageCode } from "./_lib/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const { word, sourceLang, targetLang } = req.query as Record<string, string>;
  if (!word || !sourceLang || !targetLang) {
    return res.status(400).json({ error: "missing_params", statusCode: 400 });
  }

  try {
    const result = await lookupWord(word, sourceLang as LanguageCode, targetLang as LanguageCode);
    if (!result) return res.status(404).json({ ok: false, statusCode: 404, error: "not_found" });
    return res.json({ ok: true, data: result });
  } catch (err) {
    console.error("lookup error", err);
    return res.status(500).json({ ok: false, statusCode: 500, error: "internal_error" });
  }
}
