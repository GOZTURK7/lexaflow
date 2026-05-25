import type { FastifyInstance } from "fastify";
import { supabase, getUserId } from "../services/supabase.js";

export async function wordRoutes(app: FastifyInstance) {
  // Save a word
  app.post<{ Body: { word: string; sourceLang: string; targetLang: string; definitionSnapshot?: object } }>(
    "/api/words",
    async (req, reply) => {
      if (!supabase) return reply.code(503).send({ error: "auth_unavailable", statusCode: 503 });

      const userId = await getUserId(req.headers.authorization);
      if (!userId) return reply.code(401).send({ error: "unauthorized", statusCode: 401 });

      const { word, sourceLang, targetLang, definitionSnapshot } = req.body;
      if (!word || !sourceLang || !targetLang) {
        return reply.code(400).send({ error: "missing_fields", statusCode: 400 });
      }

      const { data, error } = await supabase
        .from("word_saves")
        .upsert(
          { user_id: userId, word: word.toLowerCase(), source_lang: sourceLang, target_lang: targetLang, definition_snapshot: definitionSnapshot ?? null },
          { onConflict: "user_id,word,source_lang,target_lang" },
        )
        .select()
        .single();

      if (error) {
        app.log.error(error, "word save error");
        return reply.code(500).send({ error: "save_failed", statusCode: 500 });
      }

      return reply.code(200).send({ ok: true, id: data.id });
    },
  );

  // Delete a saved word
  app.delete<{ Params: { id: string } }>("/api/words/:id", async (req, reply) => {
    if (!supabase) return reply.code(503).send({ error: "auth_unavailable", statusCode: 503 });

    const userId = await getUserId(req.headers.authorization);
    if (!userId) return reply.code(401).send({ error: "unauthorized", statusCode: 401 });

    const { error } = await supabase
      .from("word_saves")
      .delete()
      .match({ id: req.params.id, user_id: userId });

    if (error) return reply.code(500).send({ error: "delete_failed", statusCode: 500 });
    return reply.code(200).send({ ok: true });
  });

  // CSV export — GET /api/words/export
  app.get("/api/words/export", async (req, reply) => {
    if (!supabase) return reply.code(503).send({ error: "auth_unavailable", statusCode: 503 });

    const userId = await getUserId(req.headers.authorization);
    if (!userId) return reply.code(401).send({ error: "unauthorized", statusCode: 401 });

    const { data, error } = await supabase
      .from("word_saves")
      .select("word, source_lang, target_lang, definition_snapshot, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return reply.code(500).send({ error: "fetch_failed", statusCode: 500 });

    const LANG_NAMES: Record<string, string> = {
      nl: "Dutch", en: "English", tr: "Turkish", de: "German", fr: "French",
      es: "Spanish", it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
      zh: "Chinese", ko: "Korean", ar: "Arabic", pl: "Polish", sv: "Swedish",
      da: "Danish", fi: "Finnish", nb: "Norwegian", cs: "Czech", hu: "Hungarian",
      ro: "Romanian", uk: "Ukrainian", el: "Greek", he: "Hebrew", id: "Indonesian",
      vi: "Vietnamese", th: "Thai",
    };

    function formatDate(iso: string) {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }

    function esc(s: string) { return `"${s.replace(/"/g, '""')}"`; }

    const rows = (data ?? []).map((row) => {
      const snap = row.definition_snapshot as {
        translation?: string;
        partOfSpeechGroups?: Array<{ definitions?: Array<{ meaning?: string }> }>;
      } | null;
      const translation = snap?.translation || "-";
      const firstMeaning = snap?.partOfSpeechGroups?.[0]?.definitions?.[0]?.meaning || "-";
      const fromLang = LANG_NAMES[row.source_lang] ?? row.source_lang;
      const toLang = LANG_NAMES[row.target_lang] ?? row.target_lang;
      return [
        esc(row.word),
        esc(fromLang),
        esc(toLang),
        esc(translation),
        esc(firstMeaning),
        esc(formatDate(row.created_at as string)),
      ].join(",");
    });

    const header = ["Word", "From Language", "To Language", "Translation", "Definition", "Date Saved"].join(",");
    const csv = [header, ...rows].join("\n");

    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="lexaflow-words.csv"')
      .send(csv);
  });

  // List saved words
  app.get<{ Querystring: { sourceLang?: string; targetLang?: string; page?: string } }>(
    "/api/words",
    async (req, reply) => {
      if (!supabase) return reply.code(503).send({ error: "auth_unavailable", statusCode: 503 });

      const userId = await getUserId(req.headers.authorization);
      if (!userId) return reply.code(401).send({ error: "unauthorized", statusCode: 401 });

      const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
      const pageSize = 20;

      let query = supabase
        .from("word_saves")
        .select("id, word, source_lang, target_lang, created_at", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (req.query.sourceLang) query = query.eq("source_lang", req.query.sourceLang);
      if (req.query.targetLang) query = query.eq("target_lang", req.query.targetLang);

      const { data, error, count } = await query;
      if (error) return reply.code(500).send({ error: "fetch_failed", statusCode: 500 });

      return reply.send({ words: data, total: count, page, pageSize });
    },
  );
}
