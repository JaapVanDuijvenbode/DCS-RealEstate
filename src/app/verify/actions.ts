"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createChallenge, verifyChallenge } from "@/lib/auth/otp";
import { currentLocale, safeNext, trustThisDevice } from "@/lib/auth/session";
import type { FormState } from "@/app/login/actions";

export async function verifyCode(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = String(formData.get("code") ?? "");
  const result = await verifyChallenge(user.id, code);
  if (result === "ok") {
    await trustThisDevice(user.id);
    redirect(safeNext(formData.get("next")));
  }
  return { error: t(`verify.${result}`) };
}

export async function resendCode(): Promise<FormState> {
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");
  const result = await createChallenge(user.id, user.email, await currentLocale());
  return result === "sent" ? { ok: t("verify.resent") } : { error: t("verify.wait") };
}
