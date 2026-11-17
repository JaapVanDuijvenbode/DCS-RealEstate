"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export type ActivityUser = { id: string; name: string; color: string };
export type ActivityRow = { day: string; actor_id: string; added: number; changed: number };
type Mode = "all" | "added" | "changed";

const PLOT_H = 280;

function niceScale(max: number) {
  if (max <= 4) return { top: 4, step: 1 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  return { top: Math.ceil(max / step) * step, step };
}

// Stacked columns: one per day, one segment per person, last 30 days.
export function ActivityChart({ days, users, rows }: { days: string[]; users: ActivityUser[]; rows: ActivityRow[] }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>("all");
  const [hover, setHover] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const fmtShort = useMemo(() => new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { day: "numeric", month: "short", timeZone: "UTC" }), [locale]);
  const fmtLong = useMemo(() => new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }), [locale]);
  const nf = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-GB" : "nl-NL"), [locale]);

  // value[dayIndex][userIndex]
  const matrix = useMemo(() => {
    const dayIdx = new Map(days.map((d, i) => [d, i]));
    const userIdx = new Map(users.map((u, i) => [u.id, i]));
    const m = days.map(() => users.map(() => ({ added: 0, changed: 0 })));
    for (const r of rows) {
      const di = dayIdx.get(r.day);
      const ui = userIdx.get(r.actor_id);
      if (di === undefined || ui === undefined) continue;
      m[di][ui].added += r.added;
      m[di][ui].changed += r.changed;
    }
    return m;
  }, [days, users, rows]);

  const value = (c: { added: number; changed: number }) => (mode === "added" ? c.added : mode === "changed" ? c.changed : c.added + c.changed);
  const totals = matrix.map((d) => d.reduce((n, c) => n + value(c), 0));
  const userTotals = users.map((_, ui) => matrix.reduce((n, d) => n + value(d[ui]), 0));
  const grand = totals.reduce((a, b) => a + b, 0);
  const { top, step } = niceScale(Math.max(1, ...totals));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const labelEvery = new Set([0, 7, 14, 21, days.length - 1]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{t("activityTitle")}</h2>
          <p className="text-sm text-muted">{t(`activitySubtitle.${mode}`, { count: grand })}</p>
        </div>
        <div role="group" aria-label={t("activityMode")} className="inline-flex rounded-xl bg-ink/5 p-1">
          {(["all", "added", "changed"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${mode === m ? "bg-surface-strong text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {t(`activityModes.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Legend: always present for two or more people */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {users.map((u, i) => (
          <li key={u.id} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: u.color }} />
            <span className="text-ink">{u.name}</span>
            <span className="tabular-nums text-muted">{nf.format(userTotals[i])}</span>
          </li>
        ))}
      </ul>

      {grand === 0 ? (
        <p className="rounded-xl bg-ink/5 px-4 py-8 text-center text-sm text-muted">{t("activityEmpty")}</p>
      ) : (
        <div className="grid grid-cols-[2.25rem_1fr] gap-x-2">
          {/* Y axis */}
          <div className="relative" style={{ height: PLOT_H }} aria-hidden="true">
            {ticks.map((v) => (
              <span key={v} className="absolute right-0 text-[11px] tabular-nums text-muted" style={{ bottom: `${(v / top) * 100}%`, transform: "translateY(50%)" }}>
                {nf.format(v)}
              </span>
            ))}
          </div>

          {/* Plot */}
          <div className="relative" style={{ height: PLOT_H }}>
            {ticks.map((v) => (
              <div key={v} aria-hidden="true" className="absolute inset-x-0 h-px" style={{ bottom: `${(v / top) * 100}%`, background: v === 0 ? "var(--line)" : "var(--chart-grid)" }} />
            ))}
            <div className="absolute inset-0 flex items-end">
              {days.map((d, di) => {
                const cells = matrix[di];
                const lastNonZero = cells.reduce((last, c, ui) => (value(c) > 0 ? ui : last), -1);
                const summary = `${fmtLong.format(new Date(d))}: ${users.map((u, ui) => `${u.name} ${value(cells[ui])}`).join(", ")}`;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-label={summary}
                    onMouseEnter={() => setHover(di)}
                    onMouseLeave={() => setHover((h) => (h === di ? null : h))}
                    onFocus={() => setHover(di)}
                    onBlur={() => setHover((h) => (h === di ? null : h))}
                    className="group relative flex h-full flex-1 flex-col-reverse items-center gap-[2px] rounded-md outline-none focus-visible:bg-ink/5"
                  >
                    {users.map((u, ui) => {
                      const v = value(cells[ui]);
                      const h = grown ? (v / top) * PLOT_H : 0;
                      return (
                        <span
                          key={u.id}
                          aria-hidden="true"
                          className={`block w-[62%] max-w-6 transition-[height,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${ui === lastNonZero ? "rounded-t-[4px]" : ""} ${hover !== null && hover !== di ? "opacity-45" : ""}`}
                          style={{ height: v > 0 ? Math.max(h, grown ? 2 : 0) : 0, background: u.color, transitionDelay: grown ? `${di * 14}ms` : "0ms", display: v > 0 ? "block" : "none" }}
                        />
                      );
                    })}
                    {hover === di ? (
                      <span
                        role="tooltip"
                        className={`pointer-events-none absolute top-0 z-20 w-max min-w-40 rounded-xl border border-line bg-surface-strong px-3 py-2 text-left text-[13px] shadow-lg backdrop-blur ${di >= days.length / 2 ? "right-full mr-2" : "left-full ml-2"}`}
                      >
                        <span className="block font-semibold text-ink">{fmtLong.format(new Date(d))}</span>
                        {users.map((u, ui) => (
                          <span key={u.id} className="mt-1 flex items-center justify-between gap-4">
                            <span className="flex items-center gap-2 text-ink">
                              <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: u.color }} />
                              {u.name}
                            </span>
                            <span className="tabular-nums text-ink">{nf.format(value(cells[ui]))}</span>
                          </span>
                        ))}
                        <span className="mt-1 flex justify-between border-t border-line pt-1 font-semibold text-ink">
                          <span>{t("total")}</span>
                          <span className="tabular-nums">{nf.format(totals[di])}</span>
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* X axis */}
          <div />
          <div className="mt-2 flex text-[11px] text-muted" aria-hidden="true">
            {days.map((d, di) => (
              <span key={d} className="relative flex-1">
                {labelEvery.has(di) ? (
                  <span className={`absolute top-0 whitespace-nowrap ${di === 0 ? "left-0" : di === days.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                    {di === days.length - 1 ? t("axisToday") : fmtShort.format(new Date(d))}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      )}

      {grand > 0 ? (
        <details className="pt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-primary">{t("showTable")}</summary>
          <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-line">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-strong text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">{t("date")}</th>
                  {users.map((u) => <th key={u.id} scope="col" className="px-3 py-2 text-right font-semibold">{u.name}</th>)}
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{t("total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {days.map((d, di) =>
                  totals[di] > 0 ? (
                    <tr key={d}>
                      <th scope="row" className="px-3 py-1.5 font-medium">{fmtShort.format(new Date(d))}</th>
                      {users.map((u, ui) => <td key={u.id} className="px-3 py-1.5 text-right tabular-nums">{nf.format(value(matrix[di][ui]))}</td>)}
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{nf.format(totals[di])}</td>
                    </tr>
                  ) : null,
                ).reverse()}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}
