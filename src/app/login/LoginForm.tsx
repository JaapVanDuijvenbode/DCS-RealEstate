"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn, requestReset, type FormState } from "./actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [loginState, loginAction] = useActionState<FormState, FormData>(signIn, {});
  const [resetState, resetAction] = useActionState<FormState, FormData>(requestReset, {});

  if (mode === "reset")
    return (
      <form action={resetAction} className="space-y-4">
        <p className="text-sm text-muted">{t("reset.intro")}</p>
        <div>
          <label className="label" htmlFor="identifier">{t("identifier")}</label>
          <input id="identifier" name="identifier" className="field" autoComplete="username" required />
        </div>
        <FormMessage error={resetState.error} ok={resetState.ok} />
        <SubmitButton className="w-full">{t("reset.submit")}</SubmitButton>
        <button type="button" className="w-full text-sm text-primary underline-offset-2 hover:underline" onClick={() => setMode("login")}>
          {t("reset.back")}
        </button>
      </form>
    );

  return (
    <form action={loginAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="identifier">{t("identifier")}</label>
        <input id="identifier" name="identifier" className="field" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div>
        <label className="label" htmlFor="password">{t("password")}</label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />
      </div>
      <FormMessage error={loginState.error} />
      <SubmitButton className="w-full">{t("signIn")}</SubmitButton>
      <button type="button" className="w-full text-sm text-primary underline-offset-2 hover:underline" onClick={() => setMode("reset")}>
        {t("forgot")}
      </button>
    </form>
  );
}
