import "server-only";
import { serverEnv } from "@/lib/env";

type Mail = { to: string; subject: string; text: string; html: string };

// Sends through Resend's HTTP API. In development without an API key the
// message is printed to the server log instead.
export async function sendMail(mail: Mail): Promise<void> {
  const { resendApiKey, mailFrom } = serverEnv();
  if (!resendApiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.info(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: mailFrom, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}
