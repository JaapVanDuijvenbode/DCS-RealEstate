"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export type DonutSlice = { key: string; label: string; count: number; color: string };

const SIZE = 196;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 2.5; // px of surface between slices

// Renovation projects by status. The legend carries every name, count and share.
export function StatusDonut({ slices, href }: { slices: DonutSlice[]; href: string }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [hover, setHover] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = slices.reduce((n, s) => n + s.count, 0);
  const pct = useMemo(() => new Intl.NumberFormat(locale === "en" ? "en-GB" : "nl-NL", { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const visible = slices.filter((s) => s.count > 0);
  const single = visible.length === 1;

  let offset = 0;
  const arcs = visible.map((s) => {
    const len = (s.count / Math.max(total, 1)) * C;
    const arc = { ...s, start: offset, len: single ? len : Math.max(len - GAP, 0.5) };
    offset += len;
    return arc;
  });
  const focus = hover ? slices.find((s) => s.key === hover) : null;
  const summary = slices.map((s) => `${s.label} ${s.count}`).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{t("statusTitle")}</h2>
        <Link href={href} className="text-sm font-semibold text-primary hover:underline">{t("toBoard")}</Link>
      </div>
      {total === 0 ? (
        <p className="rounded-xl bg-ink/5 px-4 py-8 text-center text-sm text-muted">{t("statusEmpty")}</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center xl:flex-col 2xl:flex-row">
          <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${t("statusTitle")}: ${summary}`} className="-rotate-90 overflow-visible">
              <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--chart-grid)" strokeWidth={STROKE} />
              {arcs.map((a, i) => (
                <circle
                  key={a.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={hover === a.key ? STROKE + 6 : STROKE}
                  strokeDasharray={`${drawn ? a.len : 0} ${C}`}
                  strokeDashoffset={-a.start}
                  onMouseEnter={() => setHover(a.key)}
                  onMouseLeave={() => setHover(null)}
                  className="cursor-pointer transition-[stroke-dasharray,stroke-width,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ transitionDelay: drawn ? `${i * 90}ms, 0ms, 0ms` : "0ms", opacity: hover && hover !== a.key ? 0.45 : 1 }}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
              <span className="font-display text-4xl font-bold leading-none">{focus ? focus.count : total}</span>
              <span className="mt-1 max-w-28 text-[13px] text-muted">{focus ? `${focus.label} · ${pct.format(focus.count / total)}` : t("projects", { count: total })}</span>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-0.5">
            {slices.map((s) => (
              <li key={s.key}>
                <div
                  onMouseEnter={() => setHover(s.count ? s.key : null)}
                  onMouseLeave={() => setHover(null)}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${hover === s.key ? "bg-ink/5" : ""} ${s.count === 0 ? "opacity-60" : ""}`}
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-ink">{s.label}</span>
                  <span className="tabular-nums font-semibold text-ink">{s.count}</span>
                  <span className="w-10 text-right tabular-nums text-muted">{pct.format(s.count / total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
