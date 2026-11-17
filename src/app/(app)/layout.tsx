import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Wordmark } from "@/components/Wordmark";
import { getMe } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const initials = (me?.display_name ?? me?.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-line px-4 py-6 md:block">
        <Link href="/" className="mb-8 block px-3">
          <Wordmark />
        </Link>
        <AppNav variant="side" />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur md:hidden">
          <Link href="/">
            <Wordmark />
          </Link>
          <Link href="/instellingen" aria-label="Instellingen" className="flex h-9 w-9 items-center justify-center rounded-full bg-brick text-[13px] font-semibold text-on-brick">
            {initials}
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>
      <AppNav variant="bottom" />
    </div>
  );
}
