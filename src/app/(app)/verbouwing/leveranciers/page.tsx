import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { bestCost, formatEur, getBoard, getRenoReference } from "@/lib/reno";
import { VendorForm } from "@/components/reno/VendorForm";

export default async function VendorsPage() {
  const t = await getTranslations("reno");
  const locale = await getLocale();
  const { vendors } = await getRenoReference();
  const { cards } = await getBoard(locale);

  return (
    <div className="space-y-6">
      <Link href="/verbouwing" className="text-sm text-primary">← {t("title")}</Link>
      <h1 className="font-display text-3xl font-semibold">{t("vendors")}</h1>
      {vendors.length === 0 ? (
        <p className="text-muted">{t("noVendors")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => {
            const projects = cards.filter((c) => c.vendor_id === v.id);
            const total = projects.reduce((n, c) => n + Number(bestCost(c) ?? 0), 0);
            return (
              <li key={v.id}>
                <Link href={`/verbouwing/leveranciers/${v.id}`} className="card block h-full p-4 hover:border-primary">
                  <span className="block text-[16px] font-semibold">{v.name}</span>
                  <span className="block text-sm text-muted">
                    {v.trade ? t(`trade.${v.trade}`) : ""}
                    {v.monument_experience ? ` · ${t("monumentExperienceShort")}` : ""}
                    {v.rating ? ` · ${"★".repeat(v.rating)}` : ""}
                  </span>
                  <span className="mt-2 block text-sm">
                    {t("itemsCount", { count: projects.length })}
                    {total ? ` · ${formatEur(total, locale)}` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <details className="space-y-3" open={vendors.length === 0}>
        <summary className="cursor-pointer font-display text-xl font-semibold">+ {t("addVendor")}</summary>
        <div className="mt-3"><VendorForm /></div>
      </details>
    </div>
  );
}
