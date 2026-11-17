"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export const NAV_ITEMS = [
  { href: "/", key: "overview", icon: <path d="M3 11l9-7 9 7M5 10v10h14V10" /> },
  { href: "/kamers", key: "rooms", icon: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></> },
  { href: "/dozen", key: "boxes", icon: <><path d="M3 8l9-4 9 4v9l-9 4-9-4z" /><path d="M3 8l9 4 9-4M12 12v9" /></> },
  { href: "/labels", key: "labels", desktopOnly: true, icon: <><path d="M4 4h10l6 6v10H4z" /><path d="M8 13h8M8 17h5" /></> },
  { href: "/verbouwing", key: "renovation", icon: <><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></> },
  { href: "/instellingen", key: "more", icon: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></> },
] as const;

export function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

// Bottom navigation on phones. The desktop sidebar lives in Sidebar.tsx.
export function AppNav() {
  const t = useTranslations("nav");
  const path = usePathname();
  return (
    <nav aria-label={t("label")} className="glass fixed inset-x-2 bottom-2 z-20 flex rounded-2xl px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 md:hidden">
      {NAV_ITEMS.filter((it) => !("desktopOnly" in it)).map((it) => {
        const active = isActive(path, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`group flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${active ? "font-semibold text-primary" : "font-medium text-muted"}`}
          >
            <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 ${active ? "bg-primary-tint" : "group-active:scale-90"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform duration-300 ${active ? "-translate-y-px scale-110" : ""}`}>{it.icon}</svg>
            </span>
            {t(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}
