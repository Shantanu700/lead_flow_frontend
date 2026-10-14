# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Frontend for **LeadFlow**, a single-screen CRM (lead list, status filters, "Today's Follow-ups", Add Lead modal, lead timeline dialog). `README.md` is the product spec: requirements, business rules, suggested data model and REST contract (`/api/leads/`, `/api/leads/{id}/discussions/`, `/api/follow-ups/today/`). Read it before building features. The backend is not in this directory; the repo currently holds only the shadcn starter scaffold.

Spec rules that are easy to get wrong:
- Everything happens on one screen. Opening a lead shows a dialog; it never navigates to a details page.
- Six statuses: New, Contacted, Qualified, Proposal Sent, Won, Lost. New leads default to `New`, and the creation form has no status field.
- The last-note preview comes from the newest discussion. Discussions are append-only and listed newest first.
- "Today" for follow-ups is worked out in the app's configured timezone.
- The UI shows only data that has been saved. If a save fails, show an error and keep the form values.

## Commands

The package manager is Bun (`bun.lock`).

- `bun dev`: dev server (also rewrites `AGENTS.md`)
- `bun run build` / `bun start`
- `bun run lint`: ESLint 9 flat config (`eslint.config.mjs`, next core-web-vitals + typescript)
- `bun run typecheck`: `tsc --noEmit`
- `bun run format`: Prettier with the Tailwind class-sorting plugin

No test runner is set up yet.

## Stack and conventions

- **Design system: read `DESIGN.md` before building UI.** It covers the orange palette, lead status colours, Plus Jakarta Sans type rules, munim-style spacing and radius, and the `rounded-control` pill rule. All tokens are in `app/globals.css`.
- Next.js 16.4 App Router (`app/`), React 19.3, TypeScript, path alias `@/*` → repo root.
- Tailwind CSS v4 is configured in CSS only (`app/globals.css` using `@theme inline`; there is no `tailwind.config`). Dark mode uses the `.dark` class via `next-themes`. `components/theme-provider.tsx` also binds the `d` key to toggle the theme.
- UI components come from shadcn (`components.json`, style `base-luma`) and are built on **Base UI** (`@base-ui/react`), not Radix. Add them with `bunx shadcn add <component>`, which writes to `components/ui/`. Icons come from `lucide-react`.
- `cn` is re-exported from the `cn` package in `lib/utils.ts`. Variants use `class-variance-authority`.
- Prettier settings: no semicolons, double quotes, `trailingComma: es5`. It sorts classes inside `cn(...)` and `cva(...)`.
