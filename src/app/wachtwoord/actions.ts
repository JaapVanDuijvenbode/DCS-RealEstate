"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/login/actions";

const schema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/),
  password: z.string().min(10).max(128),
  confirm: z.string(),
});

export async function setPassword(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "username" ? t("setup.usernameRule") : t("setup.passwordRule") };
  }
  if (parsed.data.password !== parsed.data.confirm) return { error: t("setup.mismatch") };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: profileError } = await supabase.from("profiles").update({ username: parsed.data.username }).eq("id", user.id);
  if (profileError) return { error: profileError.code === "23505" ? t("setup.usernameTaken") : t("errors.generic") };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: t("errors.generic") };
  redirect("/");
}
