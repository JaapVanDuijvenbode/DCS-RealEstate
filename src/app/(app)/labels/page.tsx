import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getReference, roomLabel } from "@/lib/data";

export default async function LabelsPage() {
  const t = await getTranslations("labels");
  const locale = await getLocale();
  const { locations, rooms } = await getReference();
  const supabase = await createClient();
  const { data: stats } = await supabase.from("room_stats").select("room_id, box_count");
  const count = new Map((stats ?? []).map((s) => [s.room_id, s.box_count as number]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-muted">{t("intro")}</p>
      </div>
      {locations
        .filter((l) => l.kind === "source")
        .map((loc) => {
          const locRooms = rooms.filter((r) => r.location_id === loc.id && (count.get(r.id) ?? 0) > 0);
          const total = locRooms.reduce((n, r) => n + (count.get(r.id) ?? 0), 0);
          return (
            <section key={loc.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-semibold">{loc.name}</h2>
                {total > 0 ? <a href={`/api/labels?location=${loc.id}`} className="btn-primary">{t("printAll", { count: total })}</a> : null}
              </div>
              {locRooms.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t("none")}</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {locRooms.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-[15px]">{roomLabel(r, locale)}</span>
                      <a href={`/api/labels?room=${r.id}`} className="btn-secondary min-h-9 px-3 text-sm">{t("printRoom", { count: count.get(r.id) ?? 0 })}</a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      <p className="text-sm text-muted">{t("paper")}</p>
    </div>
  );
}
