import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { supabase, getUserId } from "../_lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (!supabase) return res.status(503).json({ error: "auth_unavailable", statusCode: 503 });

  const userId = await getUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "unauthorized", statusCode: 401 });

  // POST /api/words — save a word
  if (req.method === "POST") {
    const { word, sourceLang, targetLang, definitionSnapshot } = req.body as {
      word: string; sourceLang: string; targetLang: string; definitionSnapshot?: object;
    };
    if (!word || !sourceLang || !targetLang) {
      return res.status(400).json({ error: "missing_fields", statusCode: 400 });
    }
    const { data, error } = await supabase
      .from("word_saves")
      .upsert(
        { user_id: userId, word: word.toLowerCase(), source_lang: sourceLang, target_lang: targetLang, definition_snapshot: definitionSnapshot ?? null },
        { onConflict: "user_id,word,source_lang,target_lang" },
      )
      .select()
      .single();
    if (error) { console.error(error); return res.status(500).json({ error: "save_failed", statusCode: 500 }); }
    return res.json({ ok: true, id: data.id });
  }

  // GET /api/words — list saved words
  if (req.method === "GET") {
    const { page = "1", sourceLang, targetLang } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page, 10));
    const pageSize = 20;

    let query = supabase
      .from("word_saves")
      .select("id, word, source_lang, target_lang, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range((p - 1) * pageSize, p * pageSize - 1);

    if (sourceLang) query = query.eq("source_lang", sourceLang);
    if (targetLang) query = query.eq("target_lang", targetLang);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: "fetch_failed", statusCode: 500 });
    return res.json({ words: data, total: count, page: p, pageSize });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}
