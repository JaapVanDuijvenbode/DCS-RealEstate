import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { destLabel, getReference, roomLabel } from "@/lib/data";

export default async function RoomsPage() {
  const t = await getTranslations("rooms");
  const locale = await getLocale();
  const { locations, rooms, roomById } = await getReference();
  const supabase = await createClient();
  const { data: stats } = await supabase.from("room_stats").select("*");
  const statById = new Map((stats ?? []).map((s) => [s.room_id, s]));

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl font-semibold">{t("title")}</h1>
      {locations.map((loc) => {
        const locRooms = rooms.filter((r) => r.location_id === loc.id);
        return (
          <section key={loc.id} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl font-semibold">{loc.name}</h2>
              <span className="text-sm text-muted">{loc.kind === "source" ? t("source") : t("destination")}</span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {locRooms.map((r) => {
                const s = statById.get(r.id);
                const dest = roomById.get(r.default_dest_room_id ?? "");
                return (
                  <li key={r.id}>
                    <Link href={`/kamers/${r.id}`} className="card block p-4 hover:border-brick">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[16px] font-semibold">{roomLabel(r, locale)}</span>
                        <span className="text-xs text-muted">{locale === "en" ? r.floor_en : r.floor_nl}</span>
                      </div>
                      {loc.kind === "source" ? (
                        <>
                          <p className="mt-1 text-sm text-muted">
                            {t("counts", { items: s?.item_count ?? 0, boxes: s?.box_count ?? 0 })}
                          </p>
                          {dest ? <p className="mt-1 text-sm">{t("goesTo", { room: destLabel(dest, locale) })}</p> : null}
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-muted">{t("incoming", { count: s?.incoming_count ?? 0 })}</p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
