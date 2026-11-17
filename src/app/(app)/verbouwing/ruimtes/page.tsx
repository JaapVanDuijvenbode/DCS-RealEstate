import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getReference, roomLabel } from "@/lib/data";
import { elementLabel, getBoard, getRenoReference } from "@/lib/reno";

const READY_TONE: Record<string, string> = {
  niet_gestart: "bg-ink/5 text-ink",
  in_uitvoering: "bg-primary-tint text-primary",
  bewoonbaar: "bg-secondary-tint text-secondary",
  gereed: "bg-secondary text-on-primary",
};

export default async function RoomsAndElementsPage() {
  const t = await getTranslations("reno");
  const locale = await getLocale();
  const { destinationRooms } = await getReference();
  const { elements } = await getRenoReference();
  const { cards } = await getBoard(locale);
  const supabase = await createClient();
  const { data: moods } = await supabase.from("mood_items").select("room_id, element_id");
  const moodCount = new Map<string, number>();
  for (const m of moods ?? []) {
    const key = (m.room_id ?? m.element_id) as string | null;
    if (key) moodCount.set(key, (moodCount.get(key) ?? 0) + 1);
  }
  const projectCount = (id: string) => cards.filter((c) => c.targetIds.includes(id)).length;
  const openCount = (id: string) => cards.filter((c) => c.targetIds.includes(id) && c.status !== "gereed").length;

  const floors: { key: string; label: string; rooms: typeof destinationRooms }[] = [];
  for (const r of destinationRooms) {
    let g = floors.find((f) => f.key === r.floor_code);
    if (!g) floors.push((g = { key: r.floor_code, label: locale === "en" ? r.floor_en : r.floor_nl, rooms: [] }));
    g.rooms.push(r);
  }

  const summary = (id: string) => [
    t("itemsCount", { count: projectCount(id) }) + (openCount(id) ? ` (${t("openCount", { count: openCount(id) })})` : ""),
    moodCount.get(id) ? t("moodCount", { count: moodCount.get(id)! }) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8">
      <Link href="/verbouwing" className="text-sm text-primary">← {t("title")}</Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("roomsAndElements")}</h1>
        <p className="mt-1 text-[15px] text-muted">{t("roomsIntro")}</p>
      </div>
      {floors.map((f) => (
        <section key={f.key} className="space-y-3">
          <h2 className="font-display text-xl font-semibold">{f.label}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {f.rooms.map((r) => (
              <li key={r.id}>
                <Link href={`/kamers/${r.id}`} className="card block h-full p-4 hover:border-primary">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[16px] font-semibold">{roomLabel(r, locale)}</span>
                    <span className={`chip ${READY_TONE[r.readiness] ?? "bg-ink/5"}`}>{t(`readiness.${r.readiness}`)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{summary(r.id)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">{t("elements")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {elements.map((e) => (
            <li key={e.id}>
              <Link href={`/verbouwing/onderdelen/${e.id}`} className="card block h-full p-4 hover:border-primary">
                <span className="text-[16px] font-semibold">{elementLabel(e, locale)}</span>
                <p className="mt-1 text-sm text-muted">{summary(e.id)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
