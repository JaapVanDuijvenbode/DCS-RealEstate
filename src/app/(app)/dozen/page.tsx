import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { destLabel, getReference, roomLabel } from "@/lib/data";
import { STATUSES } from "@/lib/constants";
import type { Box } from "@/lib/types";
import { StatusChip } from "@/components/StatusChip";

type Search = { location?: string; status?: string; missing?: string };

export default async function BoxesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const tb = await getTranslations("boxes");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const locale = await getLocale();
  const { locations, rooms, roomById } = await getReference();
  const supabase = await createClient();

  let query = supabase.from("boxes").select("*").order("code");
  if (sp.location) query = query.in("room_id", rooms.filter((r) => r.location_id === sp.location).map((r) => r.id));
  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.missing) query = query.is("dest_room_id", null);
  const { data } = await query;
  const boxes = (data ?? []) as Box[];

  const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const sources = locations.filter((l) => l.kind === "source");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-semibold">{tb("title")}</h1>
        {boxes.length > 0 ? <a href={`/api/labels?${params.toString()}`} className="btn-secondary">{tb("printSelection", { count: boxes.length })}</a> : null}
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-4" method="get">
        <div>
          <label className="label" htmlFor="location">{tc("location")}</label>
          <select id="location" name="location" className="field" defaultValue={sp.location ?? ""}>
            <option value="">{tc("all")}</option>
            {sources.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">{tb("status")}</label>
          <select id="status" name="status" className="field" defaultValue={sp.status ?? ""}>
            <option value="">{tc("all")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{ts(s)}</option>)}
          </select>
        </div>
        <label className="flex items-end gap-2 pb-3 text-[15px]">
          <input type="checkbox" name="missing" value="1" defaultChecked={!!sp.missing} className="h-5 w-5 accent-[var(--brick)]" />
          {tb("missingDest")}
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">{tc("filter")}</button>
        </div>
      </form>

      {boxes.length === 0 ? (
        <p className="text-muted">{tb("empty")}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {boxes.map((b) => {
            const room = roomById.get(b.room_id);
            const dest = roomById.get(b.dest_room_id ?? "");
            return (
              <li key={b.id}>
                <Link href={`/d/${b.code}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:text-brick">
                  <span className="min-w-0">
                    <span className="block font-semibold">{b.code}</span>
                    <span className="block truncate text-sm text-muted">
                      {roomLabel(room, locale)} → {dest ? destLabel(dest, locale) : tc("toDecide")} · {b.contents || tb("noContents")}
                    </span>
                  </span>
                  <StatusChip status={b.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
