import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE, verifyDevice } from "@/lib/auth/device";

// Paths reachable without a session.
const PUBLIC = ["/login", "/auth", "/manifest.webmanifest", "/icons", "/favicon.ico"];
// Paths reachable with a session but before the e-mail code step.
const NEEDS_SESSION_ONLY = ["/verify", "/wachtwoord"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC.some((p) => path.startsWith(p))) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = to === "/login" && path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user) return redirect("/login");
  if (NEEDS_SESSION_ONLY.some((p) => path.startsWith(p))) return response;

  const trusted = await verifyDevice(
    request.cookies.get(DEVICE_COOKIE)?.value,
    user.id,
    process.env.DEVICE_COOKIE_SECRET ?? "",
  );
  if (!trusted) return redirect("/verify");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
