import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getReference, roomLabel } from "@/lib/data";
import { PHASES, RENO_STATUSES, bestCost, elementLabel, formatDate, formatEur, getBoard, getRenoReference, type BoardCard } from "@/lib/reno";
import { KanbanBoard, type KanbanCard } from "@/components/reno/KanbanBoard";
import { ListView } from "@/components/reno/ListView";
import { TimelineView } from "@/components/reno/TimelineView";

type Search = { view?: string; phase?: string; target?: string; owner?: string; vendor?: string; q?: string; level?: string };

function applyFilters(cards: BoardCard[], sp: Search) {
  const q = sp.q?.trim().toLowerCase();
  return cards.filter(
    (c) =>
      (!sp.phase || c.phase === sp.phase) &&
      (!sp.target || c.targetIds.includes(sp.target)) &&
      (!sp.owner || c.owner_id === sp.owner) &&
      (!sp.vendor || c.vendor_id === sp.vendor) &&
      (sp.level !== "top" || !c.parent_id) &&
      (!q || c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q)),
  );
}

export default async function RenovationBoard({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const view = sp.view === "lijst" || sp.view === "tijdlijn" ? sp.view : "kanban";
  const t = await getTranslations("reno");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const { destinationRooms } = await getReference();
  const { elements, vendors, members } = await getRenoReference();
  const { cards } = await getBoard(locale);
  const shown = applyFilters(cards, sp);

  const totalEstimate = shown.reduce((n, c) => n + Number(c.estimate_eur ?? 0), 0);
  const totalForecast = shown.reduce((n, c) => n + Number(bestCost(c) ?? 0), 0);
  const blocked = shown.filter((c) => c.blockedBy.length && c.status !== "gereed").length;

  const filterParams = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "view" && v) as [string, string][]);
  const viewHref = (v: string) => `/verbouwing?${new URLSearchParams([...filterParams, ["view", v]]).toString()}`;

  const kanbanCards: KanbanCard[] = shown.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    sort_order: c.sort_order,
    phase: c.phase,
    priority: c.priority,
    parentTitle: c.parentTitle,
    childCount: c.childCount,
    childDone: c.childDone,
    targets: c.targets,
    ownerInitials: c.ownerInitials,
    ownerName: c.ownerName,
    vendorName: c.vendorName,
    dateLabel:
      c.start_date || c.end_date
        ? `${formatDate(c.start_date, locale)}${c.start_date && c.end_date ? " – " : ""}${c.end_date !== c.start_date ? formatDate(c.end_date, locale) : ""}`
        : "",
    costLabel: formatEur(bestCost(c), locale),
    blocked: c.blockedBy.length > 0 && c.status !== "gereed",
    dateConflict: c.dateConflict,
    thumbUrl: c.thumbUrl,
    moodCount: c.moodCount,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-[15px] text-muted">
            {t("itemsCount", { count: shown.length })}
            {totalEstimate ? ` · ${t("estimate")} ${formatEur(totalEstimate, locale)}` : ""}
            {totalForecast ? ` · ${t("expected")} ${formatEur(totalForecast, locale)}` : ""}
            {blocked ? ` · ${t("blockedCount", { count: blocked })}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/verbouwing/ruimtes" className="btn-secondary">{t("roomsAndElements")}</Link>
          <Link href="/verbouwing/leveranciers" className="btn-secondary">{t("vendors")}</Link>
          <Link href="/verbouwing/nieuw" className="btn-primary">+ {t("newProject")}</Link>
        </div>
      </div>

      <nav aria-label={t("views")} className="inline-flex rounded-xl border border-line bg-surface p-1">
        {(["kanban", "lijst", "tijdlijn"] as const).map((v) => (
          <Link
            key={v}
            href={viewHref(v)}
            aria-current={view === v ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-[15px] font-semibold ${view === v ? "bg-brick text-on-brick" : "text-ink hover:bg-ground"}`}
          >
            {t(`view.${v}`)}
          </Link>
        ))}
      </nav>

      <details className="card p-4" open={filterParams.toString().length > 0}>
        <summary className="cursor-pointer font-semibold">{tc("filter")}</summary>
        <form method="get" className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <input type="hidden" name="view" value={view} />
          <div className="lg:col-span-2">
            <label className="label" htmlFor="q">{t("search")}</label>
            <input id="q" name="q" className="field" defaultValue={sp.q ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="phase">{t("phaseLabel")}</label>
            <select id="phase" name="phase" className="field" defaultValue={sp.phase ?? ""}>
              <option value="">{tc("all")}</option>
              {PHASES.map((p) => <option key={p} value={p}>{t(`phase.${p}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="target">{t("targets")}</label>
            <select id="target" name="target" className="field" defaultValue={sp.target ?? ""}>
              <option value="">{tc("all")}</option>
              <optgroup label={t("rooms")}>
                {destinationRooms.map((r) => <option key={r.id} value={r.id}>{(locale === "en" ? r.floor_en : r.floor_nl) + " · " + roomLabel(r, locale)}</option>)}
              </optgroup>
              <optgroup label={t("elements")}>
                {elements.map((e) => <option key={e.id} value={e.id}>{elementLabel(e, locale)}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="owner">{t("owner")}</label>
            <select id="owner" name="owner" className="field" defaultValue={sp.owner ?? ""}>
              <option value="">{tc("all")}</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.display_name ?? m.email}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="vendor">{t("vendor")}</label>
            <select id="vendor" name="vendor" className="field" defaultValue={sp.vendor ?? ""}>
              <option value="">{tc("all")}</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[15px] sm:col-span-2">
            <input type="checkbox" name="level" value="top" defaultChecked={sp.level === "top"} className="h-5 w-5 accent-[var(--brick)]" />
            {t("topLevelOnly")}
          </label>
          <div className="flex gap-2 sm:col-span-1 lg:col-span-4 lg:justify-end">
            <Link href={`/verbouwing?view=${view}`} className="btn-secondary">{t("clear")}</Link>
            <button type="submit" className="btn-primary">{tc("filter")}</button>
          </div>
        </form>
      </details>

      {view === "kanban" ? <KanbanBoard statuses={RENO_STATUSES} initialCards={kanbanCards} /> : null}
      {view === "lijst" ? <ListView cards={shown} /> : null}
      {view === "tijdlijn" ? <TimelineView cards={shown} /> : null}
    </div>
  );
}
