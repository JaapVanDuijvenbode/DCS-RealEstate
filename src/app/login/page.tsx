import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";
import { safeNext } from "@/lib/auth/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  return (
    <AuthShell title={t("title")} intro={t("intro")}>
      <LoginForm next={safeNext(next)} />
    </AuthShell>
  );
}
