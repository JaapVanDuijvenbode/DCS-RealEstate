import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/data";
import { cookies } from "next/headers";
import { inviteUser, setLocale, setTheme, updateDisplayName } from "../actions";
import { THEME_COOKIE, THEMES } from "@/lib/theme";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ invited?: string }> }) {
  const { invited } = await searchParams;
  const t = await getTranslations("settings");
  const locale = await getLocale();
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "system";
  const me = await getMe();
  const isSuper = me?.role === "super_user";
  const supabase = await createClient();
  const { data: members } = isSuper ? await supabase.from("profiles").select("email, username, display_name, role").order("email") : { data: null };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>

      <nav aria-label={t("shortcuts")} className="grid gap-3 sm:grid-cols-3 md:hidden">
        <Link href="/labels" className="card p-4 font-semibold hover:border-primary">{t("labelsLink")}</Link>
        <Link href="/verbouwing/leveranciers" className="card p-4 font-semibold hover:border-primary">{t("vendorsLink")}</Link>
        <Link href="/verbouwing/ruimtes" className="card p-4 font-semibold hover:border-primary">{t("roomsLink")}</Link>
      </nav>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">{t("language")}</h2>
        <form action={setLocale} className="flex gap-2">
          <button name="locale" value="nl" className={locale === "nl" ? "btn-primary" : "btn-secondary"}>Nederlands</button>
          <button name="locale" value="en" className={locale === "en" ? "btn-primary" : "btn-secondary"}>English</button>
        </form>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">{t("theme")}</h2>
        <form action={setTheme} className="flex flex-wrap gap-2">
          {THEMES.map((th) => (
            <button key={th} name="theme" value={th} aria-pressed={theme === th} className={theme === th ? "btn-primary" : "btn-secondary"}>
              {t(`themes.${th}`)}
            </button>
          ))}
        </form>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">{t("profile")}</h2>
        <p className="text-sm text-muted">{me?.email} · {me?.username ? `@${me.username}` : ""} · {t(`roles.${me?.role ?? "contributor"}`)}</p>
        <form action={updateDisplayName} className="flex gap-2">
          <label className="sr-only" htmlFor="display_name">{t("displayName")}</label>
          <input id="display_name" name="display_name" className="field" defaultValue={me?.display_name ?? ""} required maxLength={60} />
          <SubmitButton>{t("save")}</SubmitButton>
        </form>
      </section>

      {isSuper ? (
        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">{t("members")}</h2>
          <ul className="divide-y divide-line">
            {(members ?? []).map((m) => (
              <li key={m.email} className="flex flex-wrap justify-between gap-2 py-2 text-[15px]">
                <span>{m.display_name ?? m.email} <span className="text-muted">({m.email})</span></span>
                <span className="text-muted">{t(`roles.${m.role}`)}</span>
              </li>
            ))}
          </ul>
          <FormMessage ok={invited ? t("invited") : null} />
          <form action={inviteUser} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <label className="sr-only" htmlFor="email">{t("email")}</label>
            <input id="email" name="email" type="email" className="field" placeholder={t("email")} required />
            <label className="sr-only" htmlFor="role">{t("role")}</label>
            <select id="role" name="role" className="field" defaultValue="contributor">
              <option value="contributor">{t("roles.contributor")}</option>
              <option value="super_user">{t("roles.super_user")}</option>
            </select>
            <SubmitButton>{t("invite")}</SubmitButton>
          </form>
        </section>
      ) : null}

      <form action="/auth/signout" method="post">
        <button type="submit" className="btn-secondary">{t("signOut")}</button>
      </form>
    </div>
  );
}
