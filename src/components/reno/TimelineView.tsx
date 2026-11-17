import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PHASES, PHASE_COLORS, formatDate, type BoardCard } from "@/lib/reno";
import { treeOrder } from "@/components/reno/ListView";

const ROW = 36;
const HEADER = 40;
const LABEL_W = 260;
const DAY = 86_400_000;

function toDay(iso: string) {
  return Math.floor(Date.parse(iso) / DAY);
}

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

export async function TimelineView({ cards }: { cards: BoardCard[] }) {
  const t = await getTranslations("reno");
  const locale = await getLocale();
  const ordered = treeOrder(cards);
  const dated = ordered.filter(({ card }) => card.start_date || card.end_date);
  const undated = ordered.filter(({ card }) => !card.start_date && !card.end_date);

  if (dated.length === 0) {
    return <p className="text-muted">{t("timelineEmpty")}</p>;
  }

  const today = todayIso();
  const days = dated.flatMap(({ card }) => [card.start_date, card.end_date].filter(Boolean).map((d) => toDay(d!)));
  days.push(toDay(today));
  const lo = Math.min(...days) - 7;
  const hi = Math.max(...days) + 14;
  const span = hi - lo;
  const dayPx = Math.min(14, Math.max(4, 900 / span));
  const width = Math.round(span * dayPx);
  const x = (iso: string) => (toDay(iso) - lo) * dayPx;
  const height = HEADER + dated.length * ROW;

  // Month ticks
  const months: { iso: string; label: string }[] = [];
  const first = new Date(lo * DAY);
  const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1));
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { month: "short", year: "numeric", timeZone: "UTC" });
  while (cursor.getTime() / DAY < hi) {
    months.push({ iso: cursor.toISOString().slice(0, 10), label: fmt.format(cursor) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const rowIndex = new Map(dated.map(({ card }, i) => [card.id, i]));
  const yMid = (i: number) => HEADER + i * ROW + ROW / 2;

  // Bar geometry per project
  const geom = new Map<string, { x1: number; x2: number; milestone: boolean }>();
  for (const { card } of dated) {
    const s = card.start_date ?? card.end_date!;
    const e = card.end_date ?? card.start_date!;
    const milestone = !card.start_date || !card.end_date;
    geom.set(card.id, { x1: x(s), x2: x(e) + dayPx, milestone });
  }

  // Dependency arrows: from the end of the prerequisite to the start of the dependent project.
  const arrows: { d: string; conflict: boolean; key: string }[] = [];
  const cardById = new Map(dated.map(({ card }) => [card.id, card]));
  for (const { card } of dated) {
    const to = geom.get(card.id)!;
    const ti = rowIndex.get(card.id)!;
    for (const depId of card.dependsOn) {
      const from = geom.get(depId);
      const fi = rowIndex.get(depId);
      if (!from || fi === undefined) continue;
      const x1 = from.milestone ? from.x1 + 7 : from.x2;
      const y1 = yMid(fi);
      const x2 = to.milestone ? to.x1 - 8 : to.x1;
      const y2 = yMid(ti);
      // A conflict is about dates (prerequisite ends on or after this start), not pixels.
      const dep = cardById.get(depId)!;
      const depEnd = dep.end_date ?? dep.start_date;
      const conflict = !!(card.start_date && depEnd && depEnd >= card.start_date);
      const tight = x2 < x1 + 12;
      const d = tight
        ? `M${x1} ${y1} h8 V${y2 - (y2 > y1 ? ROW / 2 : -ROW / 2)} H${x2 - 10} V${y2} H${x2}`
        : `M${x1} ${y1} H${Math.max(x1 + 8, x2 - 10)} V${y2} H${x2}`;
      arrows.push({ d, conflict, key: `${depId}-${card.id}` });
    }
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex" style={{ width: LABEL_W + width }}>
            {/* Labels */}
            <div className="sticky left-0 z-10 shrink-0 border-r border-line bg-surface-strong" style={{ width: LABEL_W }}>
              <div className="flex items-end px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted" style={{ height: HEADER }}>
                {t("project")}
              </div>
              {dated.map(({ card, depth }) => (
                <div key={card.id} className="flex items-center gap-1.5 border-t border-line/70 px-4" style={{ height: ROW, paddingLeft: 16 + depth * 16 }}>
                  {depth > 0 ? <span aria-hidden="true" className="text-muted">↳</span> : null}
                  <Link href={`/verbouwing/${card.id}`} className="truncate text-[14px] hover:text-primary" title={card.title}>
                    {card.title}
                  </Link>
                </div>
              ))}
            </div>

            {/* Track */}
            <div className="relative shrink-0" style={{ width, height }}>
              {months.map((m) => (
                <div key={m.iso} className="absolute top-0 border-l border-line" style={{ left: x(m.iso), height }}>
                  <span className="absolute left-1.5 top-3 whitespace-nowrap text-xs text-muted">{m.label}</span>
                </div>
              ))}
              {dated.map(({ card }, i) => (
                <div key={card.id} className="absolute left-0 right-0 border-t border-line/70" style={{ top: HEADER + i * ROW }} />
              ))}
              <div className="absolute border-l-2 border-dashed border-primary" style={{ left: x(today), top: HEADER - 6, height: height - HEADER + 6 }} aria-hidden="true" />
              <span className="absolute whitespace-nowrap text-xs font-semibold text-primary" style={{ left: x(today) + 4, top: HEADER - 16 }}>
                {t("today")}
              </span>

              <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden="true">
                <defs>
                  <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
                  </marker>
                  <marker id="dep-arrow-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0 0L10 5L0 10z" fill="var(--primary)" />
                  </marker>
                </defs>
                {arrows.map((a) => (
                  <path key={a.key} d={a.d} fill="none" stroke={a.conflict ? "var(--primary)" : "var(--muted)"} strokeWidth="1.25" strokeDasharray={a.conflict ? "4 3" : undefined} markerEnd={`url(#${a.conflict ? "dep-arrow-bad" : "dep-arrow"})`} />
                ))}
              </svg>

              {dated.map(({ card }, i) => {
                const g = geom.get(card.id)!;
                const color = PHASE_COLORS[card.phase];
                const done = card.status === "gereed";
                const label = `${card.title} · ${formatDate(card.start_date, locale)}${card.end_date && card.end_date !== card.start_date ? ` – ${formatDate(card.end_date, locale)}` : ""}`;
                if (g.milestone) {
                  return (
                    <Link
                      key={card.id}
                      href={`/verbouwing/${card.id}`}
                      title={label}
                      aria-label={label}
                      className="absolute h-3.5 w-3.5 rotate-45"
                      style={{ left: g.x1 - 7, top: yMid(i) - 7, background: color, opacity: done ? 0.45 : 1 }}
                    />
                  );
                }
                return (
                  <Link
                    key={card.id}
                    href={`/verbouwing/${card.id}`}
                    title={label}
                    aria-label={label}
                    className={`absolute rounded-md ${card.blockedBy.length ? "outline-2 outline-dashed outline-primary" : ""}`}
                    style={{ left: g.x1, width: Math.max(g.x2 - g.x1, 6), top: yMid(i) - 9, height: 18, background: color, opacity: done ? 0.45 : 1 }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        {PHASES.map((p) => (
          <span key={p} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: PHASE_COLORS[p] }} />
            {t(`phase.${p}`)}
          </span>
        ))}
        <span>{t("timelineLegend")}</span>
      </div>

      {undated.length > 0 ? (
        <section className="card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("undated", { count: undated.length })}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {undated.map(({ card }) => (
              <li key={card.id}>
                <Link href={`/verbouwing/${card.id}`} className="chip bg-ink/5 py-1 text-[13px] text-ink hover:text-primary">{card.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
