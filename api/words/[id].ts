import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors } from "../_lib/cors";
import { supabase, getUserId } from "../_lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== "DELETE") return res.status(405).json({ error: "method_not_allowed" });
  if (!supabase) return res.status(503).json({ error: "auth_unavailable" });

  const userId = await getUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const { id } = req.query as { id: string };
  const { error } = await supabase
    .from("word_saves")
    .delete()
    .match({ id, user_id: userId });

  if (error) return res.status(500).json({ error: "delete_failed" });
  return res.json({ ok: true });
}
