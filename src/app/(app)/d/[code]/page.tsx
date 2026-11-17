import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { destLabel, getMe, getReference, roomLabel } from "@/lib/data";
import { DISPOSITIONS, STATUSES } from "@/lib/constants";
import type { Box } from "@/lib/types";
import { deleteBox, setBoxStatus, updateBox } from "../../actions";
import { RoomSelect } from "@/components/RoomSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusChip } from "@/components/StatusChip";
import { PhotoGallery } from "@/components/PhotoGallery";
import { FormMessage } from "@/components/FormMessage";

// Box page: the target of the QR code on each label.
const NEXT_STATUS: Record<string, string> = {
  geinventariseerd: "ingepakt",
  ingepakt: "geladen",
  geladen: "aangekomen",
  aangekomen: "uitgepakt",
};

export default async function BoxPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { code } = await params;
  const { saved } = await searchParams;
  const tb = await getTranslations("boxes");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const tdisp = await getTranslations("disposition");
  const locale = await getLocale();
  const me = await getMe();
  const { roomById, locationById, destinationRooms } = await getReference();
  const supabase = await createClient();
  const { data } = await supabase.from("boxes").select("*").eq("code", decodeURIComponent(code).toUpperCase()).maybeSingle();
  if (!data) notFound();
  const box = data as Box;
  const room = roomById.get(box.room_id);
  const location = locationById.get(room?.location_id ?? "");
  const dest = roomById.get(box.dest_room_id ?? "");
  const interim = roomById.get(box.interim_room_id ?? "");
  const next = NEXT_STATUS[box.status];
  const { data: history } = await supabase.from("status_events").select("status, created_at").eq("box_id", box.id).order("created_at", { ascending: false }).limit(10);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Amsterdam" });

  return (
    <div className="space-y-6">
      <Link href={`/kamers/${box.room_id}`} className="text-sm text-primary">← {roomLabel(room, locale)}</Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{box.code}</h1>
          <p className="mt-1 text-muted">{location?.name} · {roomLabel(room, locale)}</p>
        </div>
        <StatusChip status={box.status} />
      </div>
      <FormMessage ok={saved ? tc("saved") : null} />

      <section className="card space-y-3 p-5">
        <div className="text-[15px]">
          <span className="text-muted">{tc("destination")}: </span>
          <strong>{dest ? `Nieuwe Rijn 98 · ${destLabel(dest, locale)}` : tc("toDecide")}</strong>
        </div>
        {interim ? (
          <div className="text-[15px]">
            <span className="text-muted">{tc("interim")}: </span>
            {destLabel(interim, locale)}{box.interim_until ? ` ${tc("until")} ${box.interim_until.split("-").reverse().join("-")}` : ""}
          </div>
        ) : null}
        <p className="whitespace-pre-line text-[15px]">{box.contents || tb("noContents")}</p>
        <div className="flex flex-wrap gap-2">
          {box.fragile ? <span className="chip bg-primary-tint text-primary">{tb("fragile")}</span> : null}
          {box.heavy ? <span className="chip bg-primary-tint text-primary">{tb("heavy")}</span> : null}
          {box.this_side_up ? <span className="chip bg-primary-tint text-primary">{tb("thisSideUp")}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {next ? (
            <form action={setBoxStatus}>
              <input type="hidden" name="id" value={box.id} />
              <input type="hidden" name="status" value={next} />
              <SubmitButton>{tb("markAs", { status: ts(next) })}</SubmitButton>
            </form>
          ) : null}
          <a href={`/api/labels?box=${box.id}`} className="btn-secondary">{tb("printLabel")}</a>
        </div>
      </section>

      <details className="card p-5">
        <summary className="cursor-pointer font-display text-lg font-semibold">{tc("edit")}</summary>
        <form action={updateBox} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={box.id} />
          <input type="hidden" name="room_id" value={box.room_id} />
          <input type="hidden" name="box_type_id" value={box.box_type_id ?? ""} />
          <div>
            <label className="label" htmlFor="contents">{tb("contents")}</label>
            <textarea id="contents" name="contents" rows={4} className="field" defaultValue={box.contents} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="dest">{tc("destination")}</label>
              <RoomSelect name="dest_room_id" id="dest" rooms={destinationRooms} locale={locale} defaultValue={box.dest_room_id} emptyLabel={tc("toDecide")} />
            </div>
            <div>
              <label className="label" htmlFor="interim">{tc("interim")}</label>
              <RoomSelect name="interim_room_id" id="interim" rooms={destinationRooms} locale={locale} defaultValue={box.interim_room_id} emptyLabel={tc("none")} />
            </div>
            <div>
              <label className="label" htmlFor="interim_until">{tc("interimUntil")}</label>
              <input id="interim_until" name="interim_until" type="date" className="field" defaultValue={box.interim_until ?? ""} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="status">{tb("status")}</label>
              <select id="status" name="status" className="field" defaultValue={box.status}>
                {STATUSES.map((s) => <option key={s} value={s}>{ts(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="disposition">{tb("disposition")}</label>
              <select id="disposition" name="disposition" className="field" defaultValue={box.disposition}>
                {DISPOSITIONS.map((d) => <option key={d} value={d}>{tdisp(d)}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="weight_kg">{tb("weight")}</label>
              <input id="weight_kg" name="weight_kg" inputMode="decimal" className="field" defaultValue={box.weight_kg ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="value_eur">{tb("value")}</label>
              <input id="value_eur" name="value_eur" inputMode="decimal" className="field" defaultValue={box.value_eur ?? ""} />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
            <label className="flex items-center gap-2"><input type="checkbox" name="fragile" defaultChecked={box.fragile} className="h-5 w-5 accent-[var(--primary)]" />{tb("fragile")}</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="heavy" defaultChecked={box.heavy} className="h-5 w-5 accent-[var(--primary)]" />{tb("heavy")}</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="this_side_up" defaultChecked={box.this_side_up} className="h-5 w-5 accent-[var(--primary)]" />{tb("thisSideUp")}</label>
          </div>
          <div>
            <label className="label" htmlFor="notes">{tc("notes")}</label>
            <textarea id="notes" name="notes" rows={2} className="field" defaultValue={box.notes ?? ""} />
          </div>
          <SubmitButton>{tc("save")}</SubmitButton>
        </form>
      </details>

      <PhotoGallery kind="box" targetId={box.id} back={`/d/${box.code}`} />

      <section className="card p-5">
        <h2 className="font-display text-lg font-semibold">{tb("history")}</h2>
        <ul className="mt-2 divide-y divide-line">
          {(history ?? []).map((h, idx) => (
            <li key={idx} className="flex justify-between py-2 text-[15px]">
              <span>{ts(h.status)}</span>
              <span className="text-muted">{fmt.format(new Date(h.created_at))}</span>
            </li>
          ))}
        </ul>
      </section>

      {me?.role === "super_user" ? (
        <form action={deleteBox}>
          <input type="hidden" name="id" value={box.id} />
          <input type="hidden" name="room_id" value={box.room_id} />
          <button type="submit" className="text-sm font-semibold text-danger hover:underline">{tc("delete")}</button>
        </form>
      ) : null}
    </div>
  );
}
