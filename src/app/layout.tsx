import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "LayeredCake MOVE",
  description: "Verhuizing en verbouwing Nieuwe Rijn 98",
  applicationName: "LayeredCake MOVE",
  appleWebApp: { capable: true, title: "MOVE", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1c0d16" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <html lang={locale} data-theme={theme === "light" || theme === "dark" ? theme : undefined}>
      <body className="min-h-dvh text-ink">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
