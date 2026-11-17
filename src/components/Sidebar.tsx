"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { NAV_ITEMS, isActive } from "@/components/AppNav";
import { SIDEBAR_COOKIE } from "@/lib/theme";

const ITEM = 44; // px, item height
const GAP = 4; // px, gap between items
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

export function Sidebar({ initialCollapsed, initials, name }: { initialCollapsed: boolean; initials: string; name: string }) {
  const t = useTranslations("nav");
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const activeIndex = NAV_ITEMS.findIndex((it) => isActive(path, it.href));

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  // Keyboard shortcut: Ctrl/Cmd + B toggles the menu (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => {
          document.cookie = `${SIDEBAR_COOKIE}=${!c ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
          return !c;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const label = (content: React.ReactNode) => (
    <span
      className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ${EASE} ${collapsed ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[160px] opacity-100"}`}
    >
      {content}
    </span>
  );

  const tooltip = (text: string) =>
    collapsed ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[13px] font-semibold text-ground opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      >
        {text}
      </span>
    ) : null;

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={`glass sticky top-3 z-20 m-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col rounded-3xl py-5 transition-[width,padding] duration-300 ${EASE} md:flex ${collapsed ? "w-[76px] px-2.5" : "w-60 px-3"}`}
    >
      <Link href="/" className="group relative mb-8 flex items-center gap-2.5 px-1.5" aria-label="LayeredCake MOVE">
        <img src="/icons/logo-96.png" alt="" width={32} height={32} className={`shrink-0 rounded-[22%] transition-transform duration-500 ${EASE} group-hover:-rotate-6 group-hover:scale-105`} />
        {label(
          <span className="font-display text-[17px] font-bold tracking-tight">
            LayeredCake <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">MOVE</span>
          </span>,
        )}
      </Link>

      <nav aria-label={t("label")} className="relative flex flex-col" style={{ gap: GAP }}>
        {/* Sliding highlight behind the active page */}
        <span
          aria-hidden="true"
          className={`absolute left-0 right-0 top-0 rounded-xl bg-primary shadow-[0_8px_20px_-12px_var(--primary)] transition-[transform,opacity] duration-500 ${EASE}`}
          style={{ height: ITEM, transform: `translateY(${Math.max(activeIndex, 0) * (ITEM + GAP)}px)`, opacity: activeIndex < 0 ? 0 : 1 }}
        />
        {NAV_ITEMS.map((it, i) => {
          const active = i === activeIndex;
          const text = t(it.key);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? text : undefined}
              className={`group relative z-10 flex items-center gap-3 rounded-xl text-[15px] font-medium transition-colors duration-200 [animation:slide-in_420ms_both] ${collapsed ? "justify-center px-0" : "px-3"} ${active ? "text-on-primary" : "text-ink hover:bg-surface-strong"}`}
              style={{ height: ITEM, animationDelay: `${60 + i * 45}ms` }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 transition-transform duration-300 ${EASE} ${active ? "" : collapsed ? "group-hover:scale-110" : "group-hover:translate-x-0.5"}`}>
                {it.icon}
              </svg>
              {label(text)}
              {tooltip(text)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <Link
          href="/instellingen"
          aria-label={collapsed ? name : undefined}
          className={`group relative flex h-12 items-center gap-3 rounded-xl transition-colors hover:bg-surface-strong ${collapsed ? "justify-center" : "px-2"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[13px] font-semibold text-white">{initials}</span>
          {label(name)}
          {tooltip(name)}
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("expand") : t("collapse")}
          title={`${collapsed ? t("expand") : t("collapse")} (Ctrl/⌘ B)`}
          className={`group relative flex h-11 items-center gap-3 rounded-xl text-[14px] font-medium text-muted transition-colors hover:bg-surface-strong hover:text-ink ${collapsed ? "justify-center" : "px-3"}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 transition-transform duration-500 ${EASE} ${collapsed ? "rotate-180" : ""}`}>
            <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
          </svg>
          {label(t("collapse"))}
        </button>
      </div>
    </aside>
  );
}
