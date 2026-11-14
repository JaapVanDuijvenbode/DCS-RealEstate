import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { sendMail } from "@/lib/mail";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_SEC = 60;

function hashCode(userId: string, code: string) {
  return createHash("sha256").update(`${userId}:${code}:${serverEnv().otpSecret}`).digest("hex");
}

export type ChallengeResult = "sent" | "wait";

export async function createChallenge(userId: string, email: string, locale: "nl" | "en"): Promise<ChallengeResult> {
  const admin = createAdminClient();
  const { data: last } = await admin
    .from("otp_challenges")
    .select("created_at")
    .eq("user_id", userId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < RESEND_AFTER_SEC * 1000) return "wait";

  // Retire older codes, then issue a new one.
  await admin.from("otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("user_id", userId).is("consumed_at", null);

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const { error } = await admin.from("otp_challenges").insert({
    user_id: userId,
    code_hash: hashCode(userId, code),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000).toISOString(),
  });
  if (error) throw error;

  const nl = locale === "nl";
  const subject = nl ? `Je inlogcode: ${code}` : `Your sign-in code: ${code}`;
  const line = nl
    ? `Je inlogcode voor LayeredCake MOVE is ${code}. De code is ${CODE_TTL_MIN} minuten geldig. Heb je niet geprobeerd in te loggen? Negeer dan deze e-mail.`
    : `Your LayeredCake MOVE sign-in code is ${code}. It is valid for ${CODE_TTL_MIN} minutes. If you did not try to sign in, ignore this e-mail.`;
  await sendMail({
    to: email,
    subject,
    text: line,
    html: `<div style="font-family:Arial,sans-serif;color:#2a2421"><p>${line.replace(code, `<strong style="font-size:22px;letter-spacing:4px">${code}</strong>`)}</p></div>`,
  });
  return "sent";
}

export type VerifyResult = "ok" | "invalid" | "expired" | "locked";

export async function verifyChallenge(userId: string, code: string): Promise<VerifyResult> {
  const admin = createAdminClient();
  const { data: ch } = await admin
    .from("otp_challenges")
    .select("id, code_hash, expires_at, attempts")
    .eq("user_id", userId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ch) return "expired";
  if (new Date(ch.expires_at).getTime() < Date.now()) return "expired";
  if (ch.attempts >= MAX_ATTEMPTS) return "locked";

  const expected = Buffer.from(ch.code_hash, "hex");
  const actual = Buffer.from(hashCode(userId, code.replace(/\D/g, "")), "hex");
  if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
    await admin.from("otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
    return "ok";
  }
  await admin.from("otp_challenges").update({ attempts: ch.attempts + 1 }).eq("id", ch.id);
  return ch.attempts + 1 >= MAX_ATTEMPTS ? "locked" : "invalid";
}
