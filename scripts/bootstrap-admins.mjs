#!/usr/bin/env node
// Invites the first super users and gives them the super_user role.
// Usage: node --env-file=.env.local scripts/bootstrap-admins.mjs jaap@example.com anja@example.com
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_APP_URL.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}
if (emails.length === 0) {
  console.error("Pass one or more e-mail addresses.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

for (const email of emails) {
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/confirm?next=/wachtwoord`,
  });
  if (error && !/already been registered|already exists/i.test(error.message)) {
    console.error(`Invite failed for ${email}: ${error.message}`);
    continue;
  }
  const { data, error: roleError } = await admin
    .from("profiles")
    .update({ role: "super_user" })
    .eq("email", email)
    .select("email, role");
  if (roleError || !data?.length) {
    console.error(`Could not set role for ${email}: ${roleError?.message ?? "profile not found"}`);
    continue;
  }
  console.log(`${email}: ${error ? "already registered" : "invited"}, role super_user`);
}
