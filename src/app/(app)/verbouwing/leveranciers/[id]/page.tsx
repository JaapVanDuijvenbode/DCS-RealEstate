import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getMe } from "@/lib/data";
import { bestCost, formatDate, formatEur, getBoard, getRenoReference } from "@/lib/reno";
import { deleteVendor } from "../../actions";
import { VendorForm } from "@/components/reno/VendorForm";
import { FormMessage } from "@/components/FormMessage";

export default async function VendorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const t = await getTranslations("reno");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const me = await getMe();
  const { vendorById } = await getRenoReference();
  const vendor = vendorById.get(id);
  if (!vendor) notFound();
  const { cards } = await getBoard(locale);
  const projects = cards.filter((c) => c.vendor_id === id);
  const sum = (k: "quote_eur" | "contract_eur" | "actual_eur") => projects.reduce((n, c) => n + Number(c[k] ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link href="/verbouwing/leveranciers" className="text-sm text-primary">← {t("vendors")}</Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">{vendor.name}</h1>
        <p className="mt-1 text-muted">
          {vendor.trade ? t(`trade.${vendor.trade}`) : ""}
          {vendor.contact_name ? ` · ${vendor.contact_name}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[15px]">
          {vendor.phone ? <a href={`tel:${vendor.phone}`} className="text-primary hover:underline">{vendor.phone}</a> : null}
          {vendor.email ? <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">{vendor.email}</a> : null}
          {vendor.website ? <a href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{vendor.website}</a> : null}
        </div>
      </div>
      <FormMessage ok={saved ? tc("saved") : null} />

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">{t("vendorProjects")}</h2>
          <span className="text-sm text-muted">
            {sum("quote_eur") ? `${t("cost.quote_eur")} ${formatEur(sum("quote_eur"), locale)}` : ""}
            {sum("contract_eur") ? ` · ${t("cost.contract_eur")} ${formatEur(sum("contract_eur"), locale)}` : ""}
            {sum("actual_eur") ? ` · ${t("cost.actual_eur")} ${formatEur(sum("actual_eur"), locale)}` : ""}
          </span>
        </div>
        {projects.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("noVendorProjects")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <Link href={`/verbouwing/${p.id}`} className="font-semibold hover:text-primary">{p.title}</Link>
                <span className="text-sm text-muted">
                  {t(`status.${p.status}`)}
                  {p.end_date ? ` · ${formatDate(p.end_date, locale)}` : ""}
                  {bestCost(p) ? ` · ${formatEur(bestCost(p), locale)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details>
        <summary className="cursor-pointer font-display text-xl font-semibold">{tc("edit")}</summary>
        <div className="mt-3"><VendorForm vendor={vendor} /></div>
      </details>

      {me?.role === "super_user" ? (
        <form action={deleteVendor}>
          <input type="hidden" name="id" value={vendor.id} />
          <button type="submit" className="text-sm font-semibold text-danger hover:underline">{tc("delete")}</button>
        </form>
      ) : null}
    </div>
  );
}
