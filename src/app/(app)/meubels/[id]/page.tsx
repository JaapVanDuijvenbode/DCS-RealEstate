import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getMe, getReference, roomLabel } from "@/lib/data";
import { CATEGORIES, DISPOSITIONS, SALE_STATUSES, STATUSES } from "@/lib/constants";
import { fitCheck } from "@/lib/fit";
import type { Item } from "@/lib/types";
import { deleteItem, updateItem } from "../../actions";
import { RoomSelect } from "@/components/RoomSelect";
import { SubmitButton } from "@/components/SubmitButton";
import { PhotoGallery } from "@/components/PhotoGallery";

const num = (v: number | null) => (v == null ? "" : String(v));

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ti = await getTranslations("items");
  const tc = await getTranslations("common");
  const tdisp = await getTranslations("disposition");
  const tcat = await getTranslations("category");
  const ts = await getTranslations("status");
  const tsale = await getTranslations("saleStatus");
  const tfit = await getTranslations("fit");
  const locale = await getLocale();
  const me = await getMe();
  const { roomById, destinationRooms, defaultBoxType } = await getReference();
  const supabase = await createClient();
  const { data } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const item = data as Item;
  const room = roomById.get(item.room_id);
  const fit = defaultBoxType ? fitCheck(item, defaultBoxType) : { kind: "unknown" as const };

  return (
    <div className="space-y-6">
      <Link href={`/kamers/${item.room_id}`} className="text-sm text-brick">← {roomLabel(room, locale)}</Link>
      <h1 className="font-serif text-3xl font-semibold">{item.name}</h1>

      <div className={`rounded-xl px-4 py-3 text-[15px] ${fit.kind === "fits" ? "bg-canal-tint" : fit.kind === "unknown" ? "bg-surface border border-line" : "bg-brick-tint"}`}>
        <strong>{tfit("title")}:</strong> {tfit(fit.kind, { box: defaultBoxType?.name ?? "" })}
      </div>

      <form action={updateItem} className="card space-y-4 p-5">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="room_id" value={item.room_id} />
        <div>
          <label className="label" htmlFor="name">{ti("name")}</label>
          <input id="name" name="name" className="field" defaultValue={item.name} required maxLength={120} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="category">{ti("category")}</label>
            <select id="category" name="category" className="field" defaultValue={item.category}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{tcat(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="disposition">{ti("disposition")}</label>
            <select id="disposition" name="disposition" className="field" defaultValue={item.disposition}>
              {DISPOSITIONS.map((d) => <option key={d} value={d}>{tdisp(d)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">{ti("status")}</label>
            <select id="status" name="status" className="field" defaultValue={item.status}>
              {STATUSES.map((s) => <option key={s} value={s}>{ts(s)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="label" htmlFor="dest">{tc("destination")}</label>
            <RoomSelect name="dest_room_id" id="dest" rooms={destinationRooms} locale={locale} defaultValue={item.dest_room_id} emptyLabel={tc("toDecide")} />
          </div>
          <div>
            <label className="label" htmlFor="interim">{tc("interim")}</label>
            <RoomSelect name="interim_room_id" id="interim" rooms={destinationRooms} locale={locale} defaultValue={item.interim_room_id} emptyLabel={tc("none")} />
          </div>
          <div>
            <label className="label" htmlFor="interim_until">{tc("interimUntil")}</label>
            <input id="interim_until" name="interim_until" type="date" className="field" defaultValue={item.interim_until ?? ""} />
          </div>
        </div>
        <fieldset>
          <legend className="label">{ti("dimensions")}</legend>
          <div className="grid grid-cols-3 gap-2">
            <input name="length_cm" inputMode="decimal" className="field" placeholder={ti("length")} aria-label={ti("length")} defaultValue={num(item.length_cm)} />
            <input name="width_cm" inputMode="decimal" className="field" placeholder={ti("width")} aria-label={ti("width")} defaultValue={num(item.width_cm)} />
            <input name="height_cm" inputMode="decimal" className="field" placeholder={ti("height")} aria-label={ti("height")} defaultValue={num(item.height_cm)} />
          </div>
        </fieldset>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label" htmlFor="quantity">{ti("quantity")}</label>
            <input id="quantity" name="quantity" type="number" min={1} className="field" defaultValue={item.quantity} />
          </div>
          <div>
            <label className="label" htmlFor="weight_kg">{ti("weight")}</label>
            <input id="weight_kg" name="weight_kg" inputMode="decimal" className="field" defaultValue={num(item.weight_kg)} />
          </div>
          <div>
            <label className="label" htmlFor="value_eur">{ti("value")}</label>
            <input id="value_eur" name="value_eur" inputMode="decimal" className="field" defaultValue={num(item.value_eur)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" name="fragile" defaultChecked={item.fragile} className="h-5 w-5 accent-[var(--brick)]" />{ti("fragile")}</label>
        <div>
          <label className="label" htmlFor="notes">{tc("notes")}</label>
          <textarea id="notes" name="notes" rows={2} className="field" defaultValue={item.notes ?? ""} />
        </div>

        <details className="rounded-xl border border-line p-4" open={item.disposition === "verkopen"}>
          <summary className="cursor-pointer font-semibold">{ti("sale")}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="asking_price_eur">{ti("askingPrice")}</label>
              <input id="asking_price_eur" name="asking_price_eur" inputMode="decimal" className="field" defaultValue={num(item.asking_price_eur)} />
            </div>
            <div>
              <label className="label" htmlFor="sale_platform">{ti("platform")}</label>
              <input id="sale_platform" name="sale_platform" className="field" defaultValue={item.sale_platform ?? ""} placeholder="Marktplaats" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="listing_url">{ti("listingUrl")}</label>
              <input id="listing_url" name="listing_url" type="url" className="field" defaultValue={item.listing_url ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="buyer">{ti("buyer")}</label>
              <input id="buyer" name="buyer" className="field" defaultValue={item.buyer ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="sale_price_eur">{ti("salePrice")}</label>
              <input id="sale_price_eur" name="sale_price_eur" inputMode="decimal" className="field" defaultValue={num(item.sale_price_eur)} />
            </div>
            <div>
              <label className="label" htmlFor="sale_status">{ti("saleStatus")}</label>
              <select id="sale_status" name="sale_status" className="field" defaultValue={item.sale_status ?? ""}>
                <option value="">{tc("none")}</option>
                {SALE_STATUSES.map((s) => <option key={s} value={s}>{tsale(s)}</option>)}
              </select>
            </div>
          </div>
        </details>

        <SubmitButton>{tc("save")}</SubmitButton>
      </form>

      <PhotoGallery kind="item" targetId={item.id} back={`/meubels/${item.id}`} />

      {me?.role === "super_user" ? (
        <form action={deleteItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="room_id" value={item.room_id} />
          <button type="submit" className="text-sm font-semibold text-danger hover:underline">{tc("delete")}</button>
        </form>
      ) : null}
    </div>
  );
}
