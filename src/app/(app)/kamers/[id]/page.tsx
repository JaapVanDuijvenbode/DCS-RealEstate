import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { destLabel, getMe, getReference, roomLabel } from "@/lib/data";
import { CATEGORIES, DISPOSITIONS } from "@/lib/constants";
import type { Box, Item } from "@/lib/types";
import { createBox, createItem } from "../../actions";
import { RoomSelect } from "@/components/RoomSelect";
import { PhotoInput } from "@/components/PhotoInput";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusChip } from "@/components/StatusChip";
import { PhotoGallery } from "@/components/PhotoGallery";
import { MoodBoard } from "@/components/reno/MoodBoard";
import { TargetProjects } from "@/components/reno/TargetProjects";
import { setRoomReadiness } from "../../verbouwing/actions";

const READINESS = ["niet_gestart", "in_uitvoering", "bewoonbaar", "gereed"] as const;

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("rooms");
  const ti = await getTranslations("items");
  const tb = await getTranslations("boxes");
  const tc = await getTranslations("common");
  const tdisp = await getTranslations("disposition");
  const tcat = await getTranslations("category");
  const locale = await getLocale();
  const { roomById, locationById, destinationRooms, defaultBoxType } = await getReference();
  const room = roomById.get(id);
  if (!room) notFound();
  const location = locationById.get(room.location_id);
  const isSource = location?.kind === "source";
  const supabase = await createClient();

  if (!isSource) {
    const [items, boxes] = await Promise.all([
      supabase.from("items").select("*").eq("dest_room_id", id).order("name"),
      supabase.from("boxes").select("*").eq("dest_room_id", id).order("code"),
    ]);
    const tr = await getTranslations("reno");
    const me = await getMe();
    const incoming = [...((items.data ?? []) as Item[])];
    const incomingBoxes = [...((boxes.data ?? []) as Box[])];
    return (
      <div className="space-y-6">
        <Link href="/verbouwing/ruimtes" className="text-sm text-primary">← {tr("roomsAndElements")}</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold">{destLabel(room, locale)}</h1>
            <p className="text-muted">{location?.name}</p>
          </div>
          {me?.role === "super_user" ? (
            <form action={setRoomReadiness} className="flex flex-wrap gap-1.5" aria-label={tr("readinessLabel")}>
              <input type="hidden" name="room_id" value={room.id} />
              {READINESS.map((r) => (
                <button key={r} name="readiness" value={r} aria-pressed={room.readiness === r} className={`chip min-h-9 px-3 text-sm ${room.readiness === r ? "bg-secondary text-on-primary" : "border border-line bg-surface text-ink hover:border-secondary"}`}>
                  {tr(`readiness.${r}`)}
                </button>
              ))}
            </form>
          ) : (
            <span className="chip bg-secondary-tint text-secondary">{tr(`readiness.${room.readiness}`)}</span>
          )}
        </div>

        <TargetProjects targetId={room.id} />
        <MoodBoard kind="room" targetId={room.id} back={`/kamers/${room.id}`} />

        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">{t("incomingTitle")} ({incoming.length + incomingBoxes.length})</h2>
          {incoming.length + incomingBoxes.length === 0 ? <p className="mt-2 text-sm text-muted">{t("incoming", { count: 0 })}</p> : null}
          <ul className="mt-2 divide-y divide-line">
            {incoming.map((i) => (
              <li key={i.id} className="flex justify-between py-2"><Link href={`/meubels/${i.id}`} className="hover:text-primary">{i.name}</Link><span className="text-sm text-muted">{roomLabel(roomById.get(i.room_id), locale)}</span></li>
            ))}
            {incomingBoxes.map((b) => (
              <li key={b.id} className="flex justify-between py-2"><Link href={`/d/${b.code}`} className="font-semibold hover:text-primary">{b.code}</Link><span className="truncate pl-4 text-sm text-muted">{b.contents}</span></li>
            ))}
          </ul>
        </section>
        <PhotoGallery kind="room" targetId={room.id} back={`/kamers/${room.id}`} />
      </div>
    );
  }

  const [items, boxes] = await Promise.all([
    supabase.from("items").select("*").eq("room_id", id).order("created_at", { ascending: false }),
    supabase.from("boxes").select("*").eq("room_id", id).order("seq", { ascending: false }),
  ]);
  const itemRows = (items.data ?? []) as Item[];
  const boxRows = (boxes.data ?? []) as Box[];
  const defaultDest = roomById.get(room.default_dest_room_id ?? "");

  return (
    <div className="space-y-6">
      <Link href="/kamers" className="text-sm text-primary">← {t("title")}</Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">{roomLabel(room, locale)}</h1>
        <p className="mt-1 text-muted">
          {location?.name} · {locale === "en" ? room.floor_en : room.floor_nl}
          {defaultDest ? ` · ${t("goesTo", { room: destLabel(defaultDest, locale) })}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Boxes */}
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{tb("title")} ({boxRows.length})</h2>
            {boxRows.length > 0 ? (
              <a href={`/api/labels?room=${room.id}`} className="btn-secondary min-h-9 px-3 text-sm">{tb("printLabels")}</a>
            ) : null}
          </div>
          <details className="rounded-xl border border-line p-4" open={boxRows.length === 0}>
            <summary className="cursor-pointer font-semibold text-primary">{tb("add")}</summary>
            <form action={createBox} className="mt-4 space-y-3">
              <input type="hidden" name="room_id" value={room.id} />
              <input type="hidden" name="box_type_id" value={defaultBoxType?.id ?? ""} />
              <input type="hidden" name="interim_room_id" value={room.default_interim_room_id ?? ""} />
              <input type="hidden" name="interim_until" value={room.default_interim_until ?? ""} />
              <div>
                <label className="label" htmlFor="contents">{tb("contents")}</label>
                <textarea id="contents" name="contents" rows={3} className="field" placeholder={tb("contentsHint")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="box-dest">{tc("destination")}</label>
                  <RoomSelect name="dest_room_id" id="box-dest" rooms={destinationRooms} locale={locale} defaultValue={room.default_dest_room_id} emptyLabel={tc("toDecide")} />
                </div>
                <div>
                  <label className="label" htmlFor="box-count">{tb("count")}</label>
                  <input id="box-count" name="$count" type="number" min={1} max={50} defaultValue={1} className="field" />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
                <label className="flex items-center gap-2"><input type="checkbox" name="fragile" className="h-5 w-5 accent-[var(--primary)]" />{tb("fragile")}</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="heavy" className="h-5 w-5 accent-[var(--primary)]" />{tb("heavy")}</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="this_side_up" className="h-5 w-5 accent-[var(--primary)]" />{tb("thisSideUp")}</label>
              </div>
              <SubmitButton>{tb("create")}</SubmitButton>
            </form>
          </details>
          <ul className="divide-y divide-line">
            {boxRows.map((b) => (
              <li key={b.id}>
                <Link href={`/d/${b.code}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                  <span className="min-w-0">
                    <span className="block font-semibold">{b.code}</span>
                    <span className="block truncate text-sm text-muted">{b.contents || tb("noContents")}</span>
                  </span>
                  <StatusChip status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Furniture */}
        <section className="card space-y-4 p-5">
          <h2 className="font-display text-xl font-semibold">{ti("title")} ({itemRows.length})</h2>
          <details className="rounded-xl border border-line p-4" open={itemRows.length === 0}>
            <summary className="cursor-pointer font-semibold text-primary">{ti("add")}</summary>
            <form action={createItem} className="mt-4 space-y-3">
              <input type="hidden" name="room_id" value={room.id} />
              <input type="hidden" name="interim_room_id" value={room.default_interim_room_id ?? ""} />
              <input type="hidden" name="interim_until" value={room.default_interim_until ?? ""} />
              <div>
                <label className="label" htmlFor="name">{ti("name")}</label>
                <input id="name" name="name" className="field" required maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="category">{ti("category")}</label>
                  <select id="category" name="category" className="field" defaultValue="meubel">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{tcat(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="disposition">{ti("disposition")}</label>
                  <select id="disposition" name="disposition" className="field" defaultValue="verhuisbedrijf">
                    {DISPOSITIONS.map((d) => <option key={d} value={d}>{tdisp(d)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="item-dest">{tc("destination")}</label>
                <RoomSelect name="dest_room_id" id="item-dest" rooms={destinationRooms} locale={locale} defaultValue={room.default_dest_room_id} emptyLabel={tc("toDecide")} />
              </div>
              <fieldset>
                <legend className="label">{ti("dimensions")}</legend>
                <div className="grid grid-cols-3 gap-2">
                  <input name="length_cm" inputMode="decimal" className="field" placeholder={ti("length")} aria-label={ti("length")} />
                  <input name="width_cm" inputMode="decimal" className="field" placeholder={ti("width")} aria-label={ti("width")} />
                  <input name="height_cm" inputMode="decimal" className="field" placeholder={ti("height")} aria-label={ti("height")} />
                </div>
              </fieldset>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label" htmlFor="quantity">{ti("quantity")}</label>
                  <input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="weight_kg">{ti("weight")}</label>
                  <input id="weight_kg" name="weight_kg" inputMode="decimal" className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="value_eur">{ti("value")}</label>
                  <input id="value_eur" name="value_eur" inputMode="decimal" className="field" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" name="fragile" className="h-5 w-5 accent-[var(--primary)]" />{ti("fragile")}</label>
              <PhotoInput />
              <SubmitButton>{ti("create")}</SubmitButton>
            </form>
          </details>
          <ul className="divide-y divide-line">
            {itemRows.map((i) => (
              <li key={i.id}>
                <Link href={`/meubels/${i.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                  <span className="min-w-0">
                    <span className="block font-semibold">{i.quantity > 1 ? `${i.quantity}× ` : ""}{i.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {tdisp(i.disposition)}
                      {i.dest_room_id ? ` · ${destLabel(roomById.get(i.dest_room_id), locale)}` : ""}
                    </span>
                  </span>
                  <StatusChip status={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <PhotoGallery kind="room" targetId={room.id} back={`/kamers/${room.id}`} />
    </div>
  );
}
