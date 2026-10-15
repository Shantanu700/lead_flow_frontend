# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Frontend for **LeadFlow**, a single-screen CRM (lead list, status filters, "Today's Follow-ups", Add Lead modal, lead timeline dialog). `README.md` is the product spec: requirements, business rules, suggested data model and REST contract (`/api/leads/`, `/api/leads/{id}/discussions/`, `/api/follow-ups/today/`). Read it before building features; its "Getting Started" section has the setup for both servers. The backend (Django REST) is a separate repo, [lead_flow_backend](https://github.com/Shantanu700/lead_flow_backend), usually cloned next to this one as `../backend`.

Spec rules that are easy to get wrong:
- Everything happens on one screen. Opening a lead shows a dialog; it never navigates to a details page.
- Six statuses: New, Contacted, Qualified, Proposal Sent, Won, Lost. New leads default to `New`, and the creation form has no status field.
- The last-note preview comes from the newest discussion. Discussions are append-only and listed newest first.
- "Today" for follow-ups is worked out in the app's configured timezone.
- The UI shows only data that has been saved. If a save fails, show an error and keep the form values.

## Commands

The package manager is Bun (`bun.lock`).

- `bun dev`: HTTPS dev server at `https://localhost:3000` (also rewrites `AGENTS.md`). It needs an mkcert certificate in `certificates/`, which is gitignored: `mkcert -cert-file certificates/localhost.pem -key-file certificates/localhost-key.pem localhost 127.0.0.1 ::1`. Run `mkcert -install` once so browsers trust it.
- `bun run openapi-ts`: regenerates the typed API client in `src/client/` from the running backend schema (`https://localhost:8011/api/schema/`). Re-run it after any API change, and never edit `src/client/` by hand. ESLint and Prettier ignore it.
- `bun run build` / `bun start`
- `bun run lint`: ESLint 9 flat config (`eslint.config.mjs`, next core-web-vitals + typescript)
- `bun run typecheck`: `tsc --noEmit`
- `bun run format`: Prettier with the Tailwind class-sorting plugin

No test runner is set up yet. Check UI changes in a real browser at desktop (1440px), tablet (~900px) and phone (390px) widths. Backend tests run in the `leadflow_dev_web` container with `python -m pytest`; `python manage.py seed_fixtures --reset` restores the sample data.

## The dashboard

The whole app after sign-in is `/dashboard`: four tabs (Dashboard, Leads, Follow-ups, Reports) switched by state, not routes. The lead drawer, the Add/Edit lead dialog and the command palette (search button or ⌘K) open over it.

Where things live:
- `app/dashboard/page.tsx`: the frame only (rail, content grid, overlays), wrapped in `DashboardContext`.
- `app/dashboard/use-dashboard.ts`: all state, data loading and handlers (`openLead`, `saveLead`, `addNote`, `setStatus`, …). Its return value is the context; components read it with `useDash()` (`components/dashboard/context.tsx`).
- `components/dashboard/views/`: one file per tab (`overview`, `leads`, `follow-ups`, `reports`).
- `components/dashboard/`:
  - `chrome.tsx`: pieces several tabs share (top-notch buttons, `Callouts`, `BigNumber`, `PeriodToggle`, `LeadControls`).
  - `rail.tsx`, `lead-sheet.tsx`, `lead-dialog.tsx`, `lead-table.tsx`, `segmented.tsx`, plus small parts (`hero`, `buttons`, `atoms`, `popup`, `icons`).
- `hooks/use-view-morph.ts`: the tab-switch choreography. `hooks/use-dashboard-motion.ts`: in-place animations (period roll, row reorder, filter chip, overdue card, bell).
- `lib/`:
  - `format.ts`: ₹, dates, "2 days ago".
  - `leads.ts`: statuses, constants, types.
  - `layout.ts`: breakpoints.
  - `report-csv.ts`, `motion.ts` (`reduceMotion`).

Rules:
- **Layout** follows the frame width `w` from a ResizeObserver, not CSS breakpoints (`lib/layout.ts`): `phone` (under 600px: the rail becomes a bottom tab bar and every tab stacks and scrolls), `narrow`, `compact`. Change these together.
- **Animation** uses GSAP (`@gsap/react`, Flip). Tab switches morph the shared hero and notches (`data-flip-id`; `SHAPE_IDS` / `VIEW_FLIP` list what each view renders) and roll changing text (`data-roll`). Keep those attributes when editing markup, and keep animations working; the user checks them closely.
- **Notches** (`components/notch.tsx`) are the card-coloured corner cut-outs that hold controls.
- **Data:** each tab loads only what it shows, and search, filters, sorting and paging all happen on the server (`GET /api/leads/?page=&status=&q=&ordering=`). Do not filter or sort in the browser. Per-tab figures come from `/api/stats/dashboard|leads|reports/`.
- **Saves:** updates use `PUT`, never `PATCH`. Show only saved data; on failure call `toastFailure()` (`lib/api.ts`) and keep the form values.
- **Controls:** dropdowns use the shadcn `Select` (never a native `<select>`); dates and times use `components/date-time-picker.tsx`.

## Stack and conventions

- **Design system: read `DESIGN.md` before building UI.** It covers the orange palette, lead status colours, Plus Jakarta Sans type rules, munim-style spacing and radius, and the `rounded-control` pill rule. All tokens are in `app/globals.css`.
- Next.js 16.4 App Router (`app/`), React 19.3, TypeScript, path alias `@/*` → repo root.
- Tailwind CSS v4 is configured in CSS only (`app/globals.css` using `@theme inline`; there is no `tailwind.config`). Dark mode uses the `.dark` class via `next-themes`. `components/theme-provider.tsx` also binds the `d` key to toggle the theme.
- UI components come from shadcn (`components.json`, style `base-luma`) and are built on **Base UI** (`@base-ui/react`), not Radix. Add them with `bunx shadcn add <component>`, which writes to `components/ui/`. Icons come from `lucide-react`.
- `cn` is re-exported from the `cn` package in `lib/utils.ts`. Variants use `class-variance-authority`.
- **API and auth:**
  - Import SDK functions from `@/src/client/sdk.gen`. `lib/api.ts` must be imported first (it is imported for its side effects). It sets the base URL from `NEXT_PUBLIC_API_URL` in `.env.local` (gitignored), sends credentials, and adds `X-CSRFToken` to POST, PUT, PATCH and DELETE requests.
  - Call `refreshCsrf()` after login or logout, because Django rotates the token.
  - `describeApiError()` turns API errors into one sentence. Errors and results are shown as Sonner toasts (`<Toaster>` is in `app/layout.tsx`).
  - The backend uses Django sessions with email login. The frontend and API are both HTTPS on `localhost`, so the browser treats them as the same site and the session cookie works.
- **Routes:**
  - `/auth` is a single page with a Log in / Register toggle.
  - `app/dashboard/layout.tsx` is the auth guard: it calls `GET /core/login/` and sends signed-out users to `/auth`. It provides the user through `useSession()` (`components/session.tsx`).
  - `/` redirects to `/dashboard`.
  - There is no `proxy.ts`, because only the API can confirm a session.
- Prettier settings: no semicolons, double quotes, `trailingComma: es5`. It sorts classes inside `cn(...)` and `cva(...)`.
