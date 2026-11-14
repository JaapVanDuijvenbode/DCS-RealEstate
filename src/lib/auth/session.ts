import "server-only";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { DEVICE_COOKIE, signDevice } from "@/lib/auth/device";
import { serverEnv } from "@/lib/env";

export async function trustThisDevice(userId: string) {
  const { value, expiresAt } = await signDevice(userId, serverEnv().deviceSecret);
  const store = await cookies();
  store.set(DEVICE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function currentLocale(): Promise<"nl" | "en"> {
  return (await getLocale()) === "en" ? "en" : "nl";
}

// Only allow redirects to paths inside this app.
export function safeNext(value: FormDataEntryValue | string | null | undefined): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}
