# Setup guide

Do these steps once, in order. Menu names in the Supabase, Vercel and Cloudflare dashboards can shift over time; the setting names stay the same.

## 1. Database (Supabase)

Apply the two migrations in `supabase/migrations`, oldest first:

- **Option A, Supabase CLI:** `supabase link --project-ref qnekbkhantxjnetelgmt`, then `supabase db push`.
- **Option B, SQL editor:** paste and run `20261114120000_r1_core.sql`, then `20261114120100_r1_seed.sql`.

This creates the tables, the security rules, the private `photos` storage bucket, and the seed data (locations, rooms, room mapping, Menken box, move stages).

**Release 4 (renovation planning):** run these two as well, in order:

- `20261117090000_r4_renovation.sql`: projects, sub-items, dependencies, suppliers, building elements, mood boards and subsidies.
- `20261117090100_r4_starter_projects.sql` (optional): starter projects from the PRD, such as the foundation survey (due 15 December 2026) and the priority rooms for move-in, without any amounts. Skip it if you prefer an empty board.

With the CLI, `supabase db push` applies only the migrations that have not run yet.

## 2. Authentication (Supabase)

**URL configuration**
- Site URL: `https://move.layeredcake.ai`
- Redirect URLs: `https://move.layeredcake.ai/**` and `http://localhost:3000/**` (add your Vercel preview domain if you test invitations there)

**Sign-ups:** turn off "Allow new users to sign up". Accounts are created by invitation only.

**SMTP (Resend):** enable custom SMTP so invitations and reset e-mails go through Resend:
- Host `smtp.resend.com`, port `465`, username `resend`, password: a Resend API key
- Sender: `noreply@layeredcake.ai`, name `LayeredCake MOVE`

**E-mail templates:** replace the link in these two templates (keep or translate the surrounding text):

| Template | Link |
| --- | --- |
| Invite user | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/wachtwoord` |
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/wachtwoord` |

## 3. Hosting (Vercel)

1. Import `JaapVanDuijvenbode/DCS-RealEstate` as a new project (framework: Next.js).
2. Add the environment variables from `.env.example` for Production and Preview. Generate `DEVICE_COOKIE_SECRET` and `OTP_SECRET` with `openssl rand -hex 32` (use different values).
3. Add the domain `move.layeredcake.ai`.

Every branch gets a preview deploy; `main` deploys to production.

## 4. Domain (Cloudflare)

Add the DNS record Vercel shows for `move.layeredcake.ai`. Set it to "DNS only" (grey cloud) so Vercel can issue the certificate.

## 5. First users

Run once from your machine, with `.env.local` filled in:

```bash
node --env-file=.env.local scripts/bootstrap-admins.mjs jaap@dutchcloudsolutions.com avduijvenbode@gmail.com
```

Both receive an invitation, choose a username and password, and are super users. Further users are invited from Instellingen in the app.

## 6. Check

- Open `https://move.layeredcake.ai`, accept the invitation, set a password.
- Sign out and in again from another browser: you should get a 6-digit code by e-mail.
- Open Kamers > Woonkamer (Pioenroos 7), add a box, print its label and scan the QR code with a phone.
