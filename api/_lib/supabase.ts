import { createClient } from "@supabase/supabase-js";

function makeClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export const supabase = makeClient();

export async function getUserId(authHeader: string | undefined): Promise<string | null> {
  if (!supabase || !authHeader?.startsWith("Bearer ")) return null;
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !data.user) return null;
  return data.user.id;
}
