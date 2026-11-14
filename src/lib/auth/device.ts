// Trusted-device cookie: proves this browser completed the e-mail code step
// for this user within the last 30 days. Format: <userId>.<expiresAtMs>.<hmac>
// Uses Web Crypto so it runs in both the Edge middleware and Node.

export const DEVICE_COOKIE = "lcm_device";
export const DEVICE_TTL_DAYS = 30;

const encoder = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signDevice(userId: string, secret: string, now = Date.now()) {
  const expiresAt = now + DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expiresAt}`;
  return { value: `${payload}.${await hmac(secret, payload)}`, expiresAt };
}

export async function verifyDevice(
  cookie: string | undefined,
  userId: string,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!cookie || !secret) return false;
  const parts = cookie.split(".");
  if (parts.length !== 3) return false;
  const [uid, exp, sig] = parts;
  if (uid !== userId) return false;
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
  return safeEqual(sig, await hmac(secret, `${uid}.${exp}`));
}
