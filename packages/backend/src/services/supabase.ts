import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

function createSupabaseAdmin() {
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const supabase = createSupabaseAdmin();

// Verify a user JWT from the Authorization header and return the user_id
export async function getUserId(authHeader: string | undefined): Promise<string | null> {
  if (!supabase || !authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
