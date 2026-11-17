import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PHASES, formatDate, formatEur, type BoardCard } from "@/lib/reno";

// Tree order: parents followed by their sub-items, at any depth.
export function treeOrder(cards: BoardCard[]): { card: BoardCard; depth: number }[] {
  const ids = new Set(cards.map((c) => c.id));
  const children = new Map<string | null, BoardCard[]>();
  for (const c of cards) {
    const key = c.parent_id && ids.has(c.parent_id) ? c.parent_id : null;
    children.set(key, [...(children.get(key) ?? []), c]);
  }
  const out: { card: BoardCard; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    const list = (children.get(parent) ?? []).sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase) || a.sort_order - b.sort_order);
    for (const c of list) {
      out.push({ card: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

const STATUS_TONE: Record<string, string> = {
  idee: "bg-line/70 text-ink",
  te_onderzoeken: "bg-ink/5 text-ink",
  gepland: "bg-primary-tint text-primary",
  in_uitvoering: "bg-secondary-tint text-secondary",
  wacht: "bg-primary text-on-primary",
  gereed: "bg-secondary text-on-primary",
};

export async function ListView({ cards }: { cards: BoardCard[] }) {
  const t = await getTranslations("reno");
  const locale = await getLocale();
  const rows = treeOrder(cards);
  const roots = rows.filter((r) => r.depth === 0);

  return (
    <div className="space-y-6">
      {PHASES.map((phase) => {
        const phaseRoots = roots.filter((r) => r.card.phase === phase).map((r) => r.card.id);
        if (phaseRoots.length === 0) return null;
        // Each root with its descendants, in tree order.
        const phaseRows: typeof rows = [];
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].depth === 0 && phaseRoots.includes(rows[i].card.id)) {
            phaseRows.push(rows[i]);
            for (let j = i + 1; j < rows.length && rows[j].depth > 0; j++) phaseRows.push(rows[j]);
          }
        }
        const total = phaseRows.reduce((n, r) => n + Number(r.card.estimate_eur ?? 0), 0);
        const forecast = phaseRows.reduce((n, r) => n + Number(r.card.forecast_eur ?? 0), 0);
        return (
          <section key={phase} className="card overflow-hidden">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="font-display text-lg font-semibold">{t(`phase.${phase}`)}</h2>
              <span className="text-sm text-muted">
                {t("itemsCount", { count: phaseRows.length })}
                {total ? ` · ${t("estimate")} ${formatEur(total, locale)}` : ""}
                {forecast ? ` · ${t("forecast")} ${formatEur(forecast, locale)}` : ""}
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] table-fixed text-[14px]">
                <colgroup>
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                </colgroup>
                <thead className="bg-ink/[0.03] text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">{t("project")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("statusLabel")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("targets")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("owner")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("vendor")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("start")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("end")}</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">{t("estimate")}</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">{t("forecast")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {phaseRows.map(({ card, depth }) => (
                    <tr key={card.id} className="hover:bg-ink/[0.03]">
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1" style={{ paddingLeft: depth * 20 }}>
                          {depth > 0 ? <span aria-hidden="true" className="text-muted">↳</span> : null}
                          <Link href={`/verbouwing/${card.id}`} className="font-semibold hover:text-primary">{card.title}</Link>
                          {card.blockedBy.length ? <span className="chip whitespace-nowrap bg-primary text-on-primary" title={card.blockedBy.join(", ")}>{t("blocked")}</span> : null}
                          {card.childCount ? <span className="chip whitespace-nowrap bg-secondary-tint text-secondary">{t("subProgress", { done: card.childDone, total: card.childCount })}</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><span className={`chip whitespace-nowrap ${STATUS_TONE[card.status]}`}>{t(`status.${card.status}`)}</span></td>
                      <td className="truncate px-3 py-2.5 text-muted">{card.targets.join(", ")}</td>
                      <td className="truncate px-3 py-2.5">{card.ownerName ?? ""}</td>
                      <td className="truncate px-3 py-2.5">{card.vendorName ?? ""}</td>
                      <td className={`whitespace-nowrap px-3 py-2.5 ${card.dateConflict ? "font-semibold text-primary" : ""}`}>{formatDate(card.start_date, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDate(card.end_date, locale)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">{formatEur(card.estimate_eur, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">{formatEur(card.forecast_eur, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {rows.length === 0 ? <p className="text-muted">{t("empty")}</p> : null}
    </div>
  );
}
