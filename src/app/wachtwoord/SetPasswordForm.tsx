"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { setPassword } from "./actions";
import type { FormState } from "@/app/login/actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function SetPasswordForm({ username }: { username: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(setPassword, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="username">{t("setup.username")}</label>
        <input id="username" name="username" className="field" defaultValue={username} autoCapitalize="none" autoComplete="username" required />
        <p className="mt-1 text-xs text-muted">{t("setup.usernameRule")}</p>
      </div>
      <div>
        <label className="label" htmlFor="password">{t("setup.password")}</label>
        <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={10} required />
        <p className="mt-1 text-xs text-muted">{t("setup.passwordRule")}</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">{t("setup.confirm")}</label>
        <input id="confirm" name="confirm" type="password" className="field" autoComplete="new-password" minLength={10} required />
      </div>
      <FormMessage error={state.error} />
      <SubmitButton className="w-full">{t("setup.submit")}</SubmitButton>
    </form>
  );
}
