import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "@/lib/env";

// Service-role client. Bypasses Row Level Security: use only on the server,
// only for auth bookkeeping (codes, invitations, username lookup).
export function createAdminClient() {
  return createClient(env.supabaseUrl, serverEnv().serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
