"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const items = [
  { href: "/", key: "overview", icon: <path d="M3 11l9-7 9 7M5 10v10h14V10" /> },
  { href: "/kamers", key: "rooms", icon: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></> },
  { href: "/dozen", key: "boxes", icon: <><path d="M3 8l9-4 9 4v9l-9 4-9-4z" /><path d="M3 8l9 4 9-4M12 12v9" /></> },
  { href: "/labels", key: "labels", desktopOnly: true, icon: <><path d="M4 4h10l6 6v10H4z" /><path d="M8 13h8M8 17h5" /></> },
  { href: "/verbouwing", key: "renovation", icon: <><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></> },
  { href: "/instellingen", key: "more", icon: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></> },
] as const;

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function AppNav({ variant }: { variant: "side" | "bottom" }) {
  const t = useTranslations("nav");
  const path = usePathname();
  if (variant === "side")
    return (
      <nav aria-label={t("label")} className="flex flex-col gap-1">
        {items.map((it) => {
          const active = isActive(path, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium ${active ? "bg-brick-tint text-brick" : "text-ink hover:bg-surface"}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{it.icon}</svg>
              {t(it.key)}
            </Link>
          );
        })}
      </nav>
    );
  return (
    <nav aria-label={t("label")} className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 md:hidden">
      {items.filter((it) => !("desktopOnly" in it)).map((it) => {
        const active = isActive(path, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${active ? "font-semibold text-brick" : "font-medium text-muted"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{it.icon}</svg>
            {t(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}
