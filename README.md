# LayeredCake MOVE

Planning app for the move from Pioenroos 7 (Voorhout) and the Menken office and storage (Noordwijkerhout) to the rijksmonument Nieuwe Rijn 98 (Leiden), followed by the phased renovation. Dutch by default, English on request. Installable on phones as a web app (PWA).

Product requirements: PRD v1.0, 14 November 2026 (Claude Docs, "PRD: Verhuis- & Verbouwplanner").

## Look and feel

LayeredCake brand: honey `#F4C34B`, tangerine `#ED8E41`, raspberry `#C23B4B`, plum `#932B49` and deep plum `#671343`, with the layered-cake app icon. Raspberry is the action color, plum the status color; honey and tangerine are accents only, because white text on them is not readable. Headings use Plus Jakarta Sans, body text Inter. Panels are frosted glass over a warm gradient, in light and dark mode (follows the device), with a solid fallback when the device asks for reduced transparency.

## Release 1 (target 11 December 2026)

- **Sign-in:** invite-only accounts, username or e-mail plus password, then a 6-digit e-mail code on a new device or after 30 days.
- **Locations and rooms:** Pioenroos 7 (15 rooms), Menken (office, storage) and Nieuwe Rijn 98 (26 rooms from the Blender model), with default destinations from the room mapping.
- **Furniture:** one by one, with dimensions, weight, value incl. VAT, disposition, destination, temporary destination, sale fields and photos.
- **Boxes:** Menken Professional Box (48.5 x 32.5 x 36.5 cm, max 25 kg), content summary, handling flags, status history, automatic codes such as `P7-WK-014`.
- **Fit check:** does a loose item fit in a box, or does it need the moving company.
- **Labels:** A6 labels, 4 per A4 sheet, with QR code to the box page, origin, destination floor band, contents and handling flags.
- **Dashboard:** countdown to move-in, key dates, stages, counts and volume per disposition.

## Release 4: renovation planning (Nieuwe Rijn 98)

- **Planning board:** kanban (drag cards between Idee, Te onderzoeken, Gepland, In uitvoering, Wacht, Gereed), list grouped by phase, and a timeline with dependency arrows. Filters for phase, room or building element, owner, supplier and text.
- **Projects:** phase (Fase 0 to 5), type of work, priority, information status, owner, supplier, start and end date, rooms and building elements.
- **Sub-items:** any project can hold sub-items, at any depth, with progress shown on the parent.
- **Dependencies:** "depends on" links, with loop protection, a blocked badge while a prerequisite is open, and a warning when a project starts before its prerequisite ends.
- **Costs incl. VAT:** estimate, quote, contracted, actual and forecast, with the basis and uncertainty of the estimate.
- **Monument and permit:** heritage impact, permit need, status, reference, dates, advice; subsidies per project.
- **Mood boards:** per room, building element and project: photos, links, RAL/NCS colors and materials with supplier and price, marked as favorite, option or rejected.
- **Suppliers:** directory with trade, contact details, heritage experience, rating, and their projects and amounts.
- **Rooms at Nieuwe Rijn 98:** readiness (niet gestart, in uitvoering, bewoonbaar, gereed), projects and mood board per room.

Still to come: scanning runs and exceptions (R2), dashboard timeline and comments (R3).

## Stack

| Part | Choice |
| --- | --- |
| App | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Plus Jakarta Sans and Inter |
| Language | next-intl, `nl` default, `en` switch per user (cookie) |
| Data | Supabase PostgreSQL with Row Level Security, Supabase Storage (private `photos` bucket) |
| E-mail | Resend (sign-in codes) and Supabase Auth with Resend SMTP (invitations, password reset) |
| Labels | pdf-lib and qrcode |
| Hosting | Vercel, `move.layeredcake.ai` (DNS at Cloudflare) |

## Setup

Full steps are in [docs/setup.md](docs/setup.md). In short:

1. Apply the migrations in `supabase/migrations` to the Supabase project.
2. Configure Supabase Auth: site URL, invite-only, Resend SMTP, and the two e-mail templates.
3. Import this repository in Vercel and add the environment variables from `.env.example`.
4. Point `move.layeredcake.ai` to Vercel in Cloudflare.
5. Invite the first super users:

   ```bash
   node --env-file=.env.local scripts/bootstrap-admins.mjs jaap@dutchcloudsolutions.com avduijvenbode@gmail.com
   ```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

Without `RESEND_API_KEY`, sign-in codes are printed in the terminal.

## Project layout

```
src/app/(app)/        signed-in screens: dashboard, kamers, meubels, d/[code] (box page), dozen, labels, instellingen, verbouwing
src/app/login, verify, wachtwoord, auth/   sign-in flow
src/app/api/labels/   label PDF endpoint
src/components/reno/  planning board views, project and supplier forms, mood board
src/lib/              Supabase clients, auth helpers, fit check, label PDF, renovation data, constants
src/messages/         nl.json and en.json
supabase/migrations/  schema, security rules and seed data
scripts/              admin bootstrap
```
