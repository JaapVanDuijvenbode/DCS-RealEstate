import Link from "next/link";
import { cookies } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { Sidebar } from "@/components/Sidebar";
import { SIDEBAR_COOKIE } from "@/lib/theme";
import { Wordmark } from "@/components/Wordmark";
import { getMe } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const initials = (me?.display_name ?? me?.email ?? "?").slice(0, 2).toUpperCase();
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  return (
    <div className="min-h-dvh md:flex">
      <Sidebar initialCollapsed={collapsed} initials={initials} name={me?.display_name ?? me?.email ?? ""} />
      <div className="min-w-0 flex-1">
        <header className="glass sticky top-2 z-10 mx-2 mt-2 flex h-14 items-center justify-between rounded-2xl px-3 md:hidden">
          <Link href="/">
            <Wordmark />
          </Link>
          <Link href="/instellingen" aria-label="Instellingen" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[13px] font-semibold text-white">
            {initials}
          </Link>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 pb-32 pt-5 md:px-6 md:pb-12 md:pt-6">{children}</main>
      </div>
      <AppNav />
    </div>
  );
}
