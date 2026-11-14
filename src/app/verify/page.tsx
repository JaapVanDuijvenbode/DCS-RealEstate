import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { VerifyForm } from "./VerifyForm";
import { safeNext } from "@/lib/auth/session";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  return (
    <AuthShell title={t("verify.title")} intro={t("verify.intro")}>
      <VerifyForm next={safeNext(next)} />
    </AuthShell>
  );
}
