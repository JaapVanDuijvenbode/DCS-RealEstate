// Central access to environment variables. Server-only values must never be
// imported into client components.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export function serverEnv() {
  const required = {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    deviceSecret: process.env.DEVICE_COOKIE_SECRET,
    otpSecret: process.env.OTP_SECRET,
  };
  for (const [key, value] of Object.entries(required)) {
    if (!value) throw new Error(`Missing server environment variable: ${key}`);
  }
  return {
    serviceRoleKey: required.serviceRoleKey as string,
    deviceSecret: required.deviceSecret as string,
    otpSecret: required.otpSecret as string,
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    mailFrom: process.env.MAIL_FROM ?? "LayeredCake MOVE <noreply@layeredcake.ai>",
  };
}
