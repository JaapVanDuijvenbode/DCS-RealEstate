"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEVICE_COOKIE, verifyDevice } from "@/lib/auth/device";
import { createChallenge } from "@/lib/auth/otp";
import { currentLocale, safeNext } from "@/lib/auth/session";
import { env, serverEnv } from "@/lib/env";

export type FormState = { error?: string | null; ok?: string | null };

async function resolveEmail(identifier: string): Promise<string | null> {
  if (identifier.includes("@")) return identifier;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("email").eq("username", identifier).maybeSingle();
  return data?.email ?? null;
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!identifier || !password) return { error: t("errors.required") };

  const email = await resolveEmail(identifier);
  if (!email) return { error: t("errors.invalid") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: t("errors.invalid") };

  const store = await cookies();
  const trusted = await verifyDevice(store.get(DEVICE_COOKIE)?.value, data.user.id, serverEnv().deviceSecret);
  if (trusted) redirect(next);

  await createChallenge(data.user.id, email, await currentLocale());
  redirect(`/verify?next=${encodeURIComponent(next)}`);
}

export async function requestReset(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  if (!identifier) return { error: t("errors.required") };
  const email = await resolveEmail(identifier);
  if (email) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.appUrl}/auth/confirm?next=/wachtwoord` });
  }
  // Same answer whether or not the account exists.
  return { ok: t("reset.sent") };
}
