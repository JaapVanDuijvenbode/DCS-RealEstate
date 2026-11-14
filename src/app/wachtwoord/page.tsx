import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/AuthShell";
import { SetPasswordForm } from "./SetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export default async function SetPasswordPage() {
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", user.id).maybeSingle();
  const suggestion = profile?.username ?? (profile?.display_name ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return (
    <AuthShell title={t("setup.title")} intro={t("setup.intro")}>
      <SetPasswordForm username={suggestion} />
    </AuthShell>
  );
}
