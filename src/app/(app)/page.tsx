import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getMe, getReference } from "@/lib/data";
import { KEY_DATES, MOVE_IN_DATE } from "@/lib/constants";
import { innerVolumeM3 } from "@/lib/fit";
import { RENO_STATUSES, bestCost, formatDate, formatEur, getBoard } from "@/lib/reno";

function daysUntil(iso: string): number {
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" }));
  return Math.round((new Date(iso).getTime() - today.getTime()) / 86_400_000);
}

export default async function Dashboard() {
  const t = await getTranslations("dashboard");
  const td = await getTranslations("keyDates");
  const tdisp = await getTranslations("disposition");
  const locale = await getLocale();
  const me = await getMe();
  const { defaultBoxType } = await getReference();
  const supabase = await createClient();

  const [items, boxes, stages] = await Promise.all([
    supabase.from("items").select("disposition, dest_room_id, length_cm, width_cm, height_cm, quantity"),
    supabase.from("boxes").select("status, dest_room_id, disposition"),
    supabase.from("move_stages").select("*").order("sort"),
  ]);
  const itemRows = items.data ?? [];
  const boxRows = boxes.data ?? [];
  const packed = boxRows.filter((b) => b.status !== "geinventariseerd").length;
  const missingDest = itemRows.filter((i) => !i.dest_room_id && ["zelf", "verhuisbedrijf", "opslag"].includes(i.disposition)).length + boxRows.filter((b) => !b.dest_room_id).length;

  // Volume per disposition: furniture by dimensions, boxes by box type.
  const boxVol = defaultBoxType ? innerVolumeM3(defaultBoxType) : 0;
  const volume = new Map<string, number>();
  for (const i of itemRows) {
    if (i.length_cm && i.width_cm && i.height_cm) {
      volume.set(i.disposition, (volume.get(i.disposition) ?? 0) + (i.length_cm * i.width_cm * i.height_cm * (i.quantity ?? 1)) / 1_000_000);
    }
  }
  for (const b of boxRows) volume.set(b.disposition, (volume.get(b.disposition) ?? 0) + boxVol);

  const tr = await getTranslations("reno");
  const { cards: reno } = await getBoard(locale);
  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
  const upcoming = reno
    .filter((c) => c.status !== "gereed" && c.end_date && c.end_date >= todayIso)
    .sort((a, b) => a.end_date!.localeCompare(b.end_date!))
    .slice(0, 4);
  const renoForecast = reno.reduce((n, c) => n + Number(bestCost(c) ?? 0), 0);
  const renoBlocked = reno.filter((c) => c.status !== "gereed" && c.blockedBy.length).length;

  const days = daysUntil(MOVE_IN_DATE);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { day: "numeric", month: "short", year: "numeric" });
  const name = me?.display_name ?? "";

  const stats = [
    { label: t("furniture"), value: itemRows.length, href: "/kamers" },
    { label: t("boxes"), value: boxRows.length, href: "/dozen" },
    { label: t("packed"), value: `${packed}/${boxRows.length}`, href: "/dozen?status=ingepakt" },
    { label: t("missingDest"), value: missingDest, href: "/dozen?missing=1", warn: missingDest > 0 },
  ];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-muted">{t("greeting", { name })}</p>
        <h1 className="mt-1 font-display text-4xl font-semibold leading-tight">
          {days > 0 ? t("daysLeft", { days }) : days === 0 ? t("today") : t("moved")}
        </h1>
        <p className="mt-1 text-[15px] text-muted">{t("toMoveIn", { date: fmt.format(new Date(MOVE_IN_DATE)) })}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-primary">
            <span className="block text-sm text-muted">{s.label}</span>
            <span className={`mt-1 block font-display text-3xl font-semibold ${s.warn ? "text-primary" : ""}`}>{s.value}</span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("keyDates")}</h2>
          <ul className="mt-2 divide-y divide-line">
            {KEY_DATES.map((d) => (
              <li key={d.key} className="flex items-center gap-3 py-2.5">
                <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${"highlight" in d ? "bg-primary" : "bg-line"}`} />
                <span className="w-[6.75rem] shrink-0 whitespace-nowrap text-sm font-semibold">{fmt.format(new Date(d.date))}</span>
                <span className={`text-[15px] ${"highlight" in d ? "font-semibold" : ""}`}>{td(d.key)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("stages")}</h2>
          <ul className="mt-2 divide-y divide-line">
            {(stages.data ?? []).map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="text-[15px]">{locale === "en" ? s.name_en : s.name_nl}</span>
                <span className="shrink-0 text-sm text-muted">
                  {s.starts_on ? fmt.format(new Date(s.starts_on)) : ""}
                  {s.ends_on && s.ends_on !== s.starts_on ? ` – ${fmt.format(new Date(s.ends_on))}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{tr("title")}</h2>
          <Link href="/verbouwing" className="text-sm font-semibold text-primary hover:underline">{tr("openBoard")}</Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {RENO_STATUSES.map((s) => {
            const n = reno.filter((c) => c.status === s).length;
            return n ? <span key={s} className="chip bg-ink/5 py-1 text-[13px] text-ink">{tr(`status.${s}`)}: {n}</span> : null;
          })}
          {renoBlocked ? <span className="chip bg-primary py-1 text-[13px] text-on-primary">{tr("blockedCount", { count: renoBlocked })}</span> : null}
          {renoForecast ? <span className="chip bg-secondary-tint py-1 text-[13px] text-secondary">{tr("expected")} {formatEur(renoForecast, locale)}</span> : null}
        </div>
        {upcoming.length ? (
          <ul className="mt-3 divide-y divide-line">
            {upcoming.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <Link href={`/verbouwing/${c.id}`} className="min-w-0 truncate text-[15px] hover:text-primary">{c.title}</Link>
                <span className="shrink-0 text-sm text-muted">{formatDate(c.end_date, locale)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("volume")}</h2>
        {volume.size === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("volumeEmpty")}</p>
        ) : (
          <table className="mt-2 w-full text-[15px]">
            <tbody className="divide-y divide-line">
              {[...volume.entries()].sort((a, b) => b[1] - a[1]).map(([disp, m3]) => (
                <tr key={disp}>
                  <td className="py-2">{tdisp(disp)}</td>
                  <td className="py-2 text-right font-semibold">{m3.toLocaleString(locale === "en" ? "en-GB" : "nl-NL", { maximumFractionDigits: 1 })} m³</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
