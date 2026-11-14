"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { verifyCode, resendCode } from "./actions";
import type { FormState } from "@/app/login/actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function VerifyForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(verifyCode, {});
  const [resendState, resendAction] = useActionState<FormState, FormData>(resendCode, {});
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="code">{t("verify.code")}</label>
          <input
            id="code"
            name="code"
            className="field text-center text-2xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
          />
        </div>
        <FormMessage error={state.error} />
        <SubmitButton className="w-full">{t("verify.submit")}</SubmitButton>
      </form>
      <form action={resendAction}>
        <FormMessage error={resendState.error} ok={resendState.ok} />
        <SubmitButton variant="secondary" className="mt-2 w-full">{t("verify.resend")}</SubmitButton>
      </form>
    </div>
  );
}
