import { getTranslations } from "next-intl/server";
import { VENDOR_TRADES, type Vendor } from "@/lib/reno";
import { createVendor, updateVendor } from "@/app/(app)/verbouwing/actions";
import { SubmitButton } from "@/components/SubmitButton";

export async function VendorForm({ vendor }: { vendor?: Vendor | null }) {
  const t = await getTranslations("reno");
  const tc = await getTranslations("common");
  const v = vendor ?? null;
  return (
    <form action={v ? updateVendor : createVendor} className="card grid gap-3 p-5 sm:grid-cols-2">
      {v ? <input type="hidden" name="id" value={v.id} /> : null}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">{t("vendorName")}</label>
        <input id="name" name="name" className="field" defaultValue={v?.name ?? ""} required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="trade">{t("tradeLabel")}</label>
        <select id="trade" name="trade" className="field" defaultValue={v?.trade ?? ""}>
          <option value="">-</option>
          {VENDOR_TRADES.map((tr) => <option key={tr} value={tr}>{t(`trade.${tr}`)}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="contact_name">{t("contactName")}</label>
        <input id="contact_name" name="contact_name" className="field" defaultValue={v?.contact_name ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="email">{t("email")}</label>
        <input id="email" name="email" type="email" className="field" defaultValue={v?.email ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="phone">{t("phone")}</label>
        <input id="phone" name="phone" type="tel" className="field" defaultValue={v?.phone ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="website">{t("website")}</label>
        <input id="website" name="website" className="field" defaultValue={v?.website ?? ""} placeholder="https://" />
      </div>
      <div>
        <label className="label" htmlFor="address">{t("address")}</label>
        <input id="address" name="address" className="field" defaultValue={v?.address ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="rating">{t("rating")}</label>
        <select id="rating" name="rating" className="field" defaultValue={v?.rating ? String(v.rating) : ""}>
          <option value="">-</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 self-end pb-3 text-[15px]">
        <input type="checkbox" name="monument_experience" defaultChecked={v?.monument_experience ?? false} className="h-5 w-5 accent-[var(--primary)]" />
        {t("monumentExperience")}
      </label>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">{tc("notes")}</label>
        <textarea id="notes" name="notes" rows={3} className="field" defaultValue={v?.notes ?? ""} />
      </div>
      <div><SubmitButton>{v ? tc("save") : t("addVendor")}</SubmitButton></div>
    </form>
  );
}
