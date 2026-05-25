import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { supabase, getUserId } from "../_lib/supabase";

const LANG_NAMES: Record<string, string> = {
  nl:"Dutch",en:"English",tr:"Turkish",de:"German",fr:"French",es:"Spanish",
  it:"Italian",pt:"Portuguese",ru:"Russian",ja:"Japanese",zh:"Chinese",ko:"Korean",
  ar:"Arabic",pl:"Polish",sv:"Swedish",da:"Danish",fi:"Finnish",no:"Norwegian",
};

function esc(s: string) { return `"${s.replace(/"/g, '""')}"`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!supabase) return res.status(503).json({ error: "auth_unavailable" });

  const userId = await getUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const { data, error } = await supabase
    .from("word_saves")
    .select("word, source_lang, target_lang, definition_snapshot, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: "fetch_failed" });

  type Snap = { translation?: string; partOfSpeechGroups?: Array<{ definitions?: Array<{ meaning?: string }> }> } | null;

  const rows = (data ?? []).map((row) => {
    const snap = row.definition_snapshot as Snap;
    const translation = snap?.translation ?? "-";
    const firstMeaning = snap?.partOfSpeechGroups?.[0]?.definitions?.[0]?.meaning ?? "-";
    return [
      esc(row.word),
      esc(LANG_NAMES[row.source_lang] ?? row.source_lang),
      esc(LANG_NAMES[row.target_lang] ?? row.target_lang),
      esc(translation),
      esc(firstMeaning),
      esc(fmtDate(row.created_at as string)),
    ].join(",");
  });

  const csv = ["Word,From Language,To Language,Translation,Definition,Date Saved", ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="lexaflow-words.csv"');
  res.send(csv);
}
