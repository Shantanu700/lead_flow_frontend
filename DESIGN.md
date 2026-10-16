# LeadFlow design system

Visual reference: [VANTA — Real Estate Property Management SaaS](https://www.behance.net/gallery/254582983/VANTA-Real-Estate-Property-Management-SaaS-Platform) (Behance, Oleksandr Vinarskyi). We borrow its palette, type and component shapes. We do not copy its logo or name.

Tokens live in `app/globals.css`. Use the Tailwind classes they generate (`bg-card`, `text-muted-foreground`, `bg-status-won`) and never hard-code hex values in components.

## Colour

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Canvas | `background` | `#F1F1F3` | `#121212` | Page background. Content sits on cards above it. |
| Surface | `card` / `popover` | `#FFFFFF` | `#1B1B1B` | Cards, dialogs, menus, sidebar |
| Ink | `foreground` | `#1B1B1B` | `#F1F1F3` | Headings and main content |
| Muted text | `muted-foreground` | `#64666F` | `#9AA0AE` | Secondary lines and placeholders (5:1). The reference's `#878992` fails contrast for text, so it appears only as the `status-lost` dot. |
| Primary | `primary` | `#F75831` | `#F75831` | Filled buttons, the active pill. The exact reference orange. **White text on it is 3.3:1, below WCAG AA (4.5:1) for small text.** This is a deliberate brand choice; keep labels short and `font-medium`, and never put body copy on it. |
| Primary hover | `primary-hover` | `#E04A22` | `#E04A22` | Hover and pressed state of primary buttons |
| Highlight | `highlight` | `#F75831` | `#F75831` | The reference orange: status dots, chart series, focus rings, large accent words |
| Brand surface | `brand-surface` | `#E5532F` | `#E5532F` | Large orange surfaces, such as the `/auth` follow-up card. It is the brand orange deepened 8% towards ink, so a big area doesn't glare. Use `brand-ink` text on it (4.6:1); muted ink at 70% only for 24px+ text (3.1:1). Small orange elements stay `primary`. |
| Brand ink | `brand-ink` | `#1B1B1B` | `#1B1B1B` | Text on large orange surfaces (5.25:1). Unlike `foreground`, it stays dark in dark mode. Large text may use white on orange (3.3:1, large only). |
| Attention | `attention` / `attention-foreground` | `#F9D3C0` | `#F9D3C0` | A soft peach panel for a block that deserves more notice (the sidebar's overdue alert, an overdue follow-up). It is the brand orange's own hue (48°) as a pastel, so it sits in the orange family and stays clean beside the cool grey canvas. It stays light in both themes: 13.5:1 against the dark canvas, 2.4:1 against `primary`, a gentle 1.4:1 tint on a white card. Text on it is `attention-foreground` ink (12.4:1); secondary lines use `text-attention-foreground/70` (5.4:1). Never `muted-foreground` or orange text (2.4:1) on it. Use one attention panel per screen at most. |
| Quiet fill | `secondary` | `#E6E8F1` | `#313131` | Inactive pills, icon chips, segmented controls |
| Lines | `border` / `input` | `#E6E8F1` / `#C6C6C8` | white 10% / 15% | Hairlines; `input` is a 50% fill behind fields |

Use orange sparingly: primary actions, the current selection and state markers. Inactive controls stay grey.

### Lead statuses

Each status gets a coloured **dot next to its text label**. The badge itself is a neutral pill (`bg-secondary text-foreground`), so the colour is never the only cue and the text always passes contrast.

| Status | Token |
|---|---|
| New | `status-new` (blue `#5B7BE0`) |
| Contacted | `status-contacted` (violet `#9B5FD6`) |
| Qualified | `status-qualified` (amber `#C98418`) |
| Proposal Sent | `status-proposal` (orange `#F75831`) |
| Won | `status-won` (green `#24964A`) |
| Lost | `status-lost` (grey `#878992`) |

## Type

- **Plus Jakarta Sans** is the only UI family. Geist Mono is used only for code or IDs.
- Use a light hand: `font-light` for large numbers and dialog titles, `font-normal` for body, `font-medium` for labels and buttons. Avoid bold.
- **Two-tone titles** are the signature pattern. Set the title in ink and its qualifier on the next line in `text-muted-foreground`, for example "Today's / Follow-ups" or "Sarah Connor / Acme Corp".
- Large figures (counts, times) are set big and light, with a small medium-weight unit beside them, e.g. "**3** follow-ups today".
- Use a fixed rem scale, not fluid `clamp()`.

## Shape, spacing and elevation

These follow the munim frontend's layout rules (`~/projects/munim_frontend/DESIGN.md` §3–5). The colours above stay LeadFlow's own.

### Radius: use the scale only

| Class | Value | Applies to |
|---|---|---|
| `rounded-xl` | 32px | Top-level panels, cards, dialogs, the drawer, the floating sidebar, the header bar |
| `rounded-lg` | 24px | A block nested inside a card |
| `rounded-md` | 18px | List rows, chips, small tiles, swatches |
| `rounded-sm` | 12px | Inline badges, tiny swatches |
| `rounded-control` | pill | **Every interactive surface by default:** buttons, sidebar menu items and actions, dropdown items. Its hover highlight is a full pill. |
| `rounded-full` | pill | Status pills, filters, avatars, circles |

`rounded-2xl`, `rounded-3xl` and `rounded-4xl` are capped at 32px, so an oversized radius can't creep in through a stock shadcn class. A child's radius is always smaller than its parent's.

### Spacing

- **6px between panels, always.** Use `gap-panel` between cards and grid columns, and `p-panel` around the shell. Never 8, 12 or 16px between panels.
- The shell is the floating sidebar plus a content column: `flex flex-col gap-panel p-panel md:pl-0`. The sidebar's own `p-panel` provides the gap on its side.
- Card padding is `p-6`; the header bar is `px-5 py-3.5`; list rows are `px-4 py-3`.
- Sibling groups use `flex`/`grid` with `gap`, never margins between siblings.

### Elevation

- There is one shadow, `shadow-card`, and only top-level panels get it (cards, header, sidebar, drawer). Nested blocks, rows and buttons stay flat.
- Containers have no outline borders. Surface colour separates them.

### Dashboard frame (`/dashboard`)

The dashboard follows its claude.ai/design file and is the one place with its own spacing and radii:

- The whole screen is one `bg-card` frame (`h-dvh rounded-[44px] p-2.5`) inset 8px into a black backdrop (`p-2`, a thin bezel), so all four corners show like a rounded device screen. The page never scrolls: panels fill the frame and their lists scroll inside them (flexible panels keep a 220px minimum; on very short screens the content column beside the rail scrolls instead). Its panels sit **10px** apart (`gap-2.5`), not 6px.
- Radii: frame 44px, dark rail 38px, panels `rounded-xl` (32px), attention blocks 28px, tiles and bars 20px, rows `rounded-md` (18px).
- Controls sit in **notches**: card-coloured cut-outs in a panel's corner with 36px fillets (`components/notch.tsx`). The sheet and dialog cut their top-right corner for a 48px close button.
- Hero panels and the rail are `.dark` in both themes.

### Landing page (`/`)

- **Sections** are full-width `bg-card` cards (`rounded-[44px] p-2.5`) on a black bezel (`bg-black p-2`, 8px apart), like the dashboard frame: the hero (exactly one screen tall on wide screens), Features (itself a screen-sized card, held while scrolling steps through the tour), the three hover cards, and Get started with the footer.
- **Notches** hold the controls, as on the dashboard: the hero photo's top-right notch has the theme toggle and Log in, its bottom-left notch today's follow-ups; the tour's preview names the active view in its top-left notch; Get started puts its two links in a bottom-right notch. A notch over a `.dark` panel must sit outside the `.dark` element so it keeps the card colour.
- **Scroll story** (GSAP ScrollTrigger, wide screens):
  - The hero is held on screen while it becomes the dashboard (scrubbed): the copy slides away, the panel's clip opens from the right half to the rail, the photo fades to the dark hero, the rail slides in, the figures count up and the tiles grow; then the hero's bottom rises and the dashboard's lower row (the leads card and the orange filter card) comes up under it; its status chips, the rows' status pills and the hero's tiles all filter the leads card as on the dashboard (sliding highlight, rolling count and subtitle, rows gliding), the follow-ups notch riding up with the hero's edge. The top-right notch stays put.
  - In the last 300px of that hold the notch's buttons fly into a floating header that grows in around them, and the notch closes behind them. The buttons live in one fixed layer and are placed between the two slots by scroll (`components/home/home.tsx`).
  - The feature tour is then held while scrolling steps through its four views, with the dashboard's view change (the notch pill resizes with Flip, the old view leaves upwards, bars grow, rows arrive). Clicking a tab switches at once and glides the page to that view's place. No auto-advance.
  - Narrower screens hold nothing: the hero's change plays once the photo is well in view, and the tour switches by tapping its chips.
- The hero photo has the `/auth` photo's subtle orange edge (`--photo-edge`, a 2px inset ring) and its two notches continue it (`<Notch edge>`); the edge fades out with the photo. Panels in the card's corners use 34px radii (the card's 44px less its 10px padding) so their curves are concentric with the card's and nothing peeks between them.
- Every tween in a scrubbed timeline gets explicit start values (`fromTo`): a refresh re-records a `to()`'s start wherever the timeline was rendered while measuring.
- Animate the hero clip with real tweens on the element, never a proxy written in `onUpdate`: ScrollTrigger renders the timeline at other positions while it measures on load, and a proxy leaves the clip stale. A reload restores the scroll position itself (`history.scrollRestoration = "manual"`), because the browser's restore runs before the pins add their space.
- Pinned sections sit directly in flex columns, so their ScrollTriggers set `pinSpacing: true` (ScrollTrigger turns it off for flex parents).
- **Example data only**, labelled on the page. The hero's figures are facts about the product (6 stages, 4 views, 0 page loads), never invented results.

### Auth page (`/auth`)

- **Layout:** the form column is on the left: wordmark, the Log in / Register pill, a left-aligned two-tone title, the form, then the account-switch line. On the right is a photo panel with LeadFlow's own cards floating over it (example data), The panel is hidden below `lg`, where the theme toggle moves into the form header.
- **Corner notch:** the theme toggle sits in a cut-out in the photo's top-right corner. The notch is the card colour, and two radial-gradient fillets curve the photo's edge into it (`CornerToggle`).
- **Photo:** `public/auth/team.jpg`, an AI-generated team-meeting image (Google Gemini) supplied for the project, showing no real people. Record every image's origin in `docs/image-credits.json`. If you swap in a *found* photo instead, it must be openly licensed, show no identifiable real people, and be credited on the page.

### Frosted glass

- The `glass` utility in `app/globals.css` is a frosted glassmorphism material. It has:
  - a smoky, near-neutral tint (`oklch(0.2 0 0 / 68%)`)
  - a very heavy 48px backdrop blur, so whatever is behind melts into soft glowing shapes
  - a fine grain from an inline SVG noise tile
  - a faint 12% white rim and a soft lit top edge
- It's CSS only. Its token names follow `~/projects/context_ai/frontend`, whose WebGL refraction material can replace it later.
- Use glass **only over media** (a photo); over a flat surface it has nothing to frost. The 68% tint is set so small white text stays readable over bright backgrounds. `prefers-reduced-transparency` swaps it for an opaque pane.

### Overlays

- **Dialog / modal (alert-dialog):** a 32px panel centred over a blurred backdrop, with pill actions.
- **Drawer:** floats 6px in from the screen edge (`--drawer-inset: var(--spacing-panel)`) as a rounded `shadow-card` panel. It can slide in from the side (`swipeDirection="right"`) or the bottom.
- **Tooltip:** a small ink pill (`bg-foreground text-background`).
- Icon-only actions are round `size-9` buttons.

The sidebar keeps the stock shadcn animations (`duration-200 ease-linear`) unchanged.

## Motion

Use 150–250 ms on state changes: hover, the active pill, the dialog opening, and a mode switch. Every animation ships with a `prefers-reduced-motion` variant that keeps opacity changes and drops movement.

- **Library:** GSAP (`gsap` + `@gsap/react`) for JS-driven motion. Exception: full-screen effects that must stay smooth while the page is busy (the theme wipe) use native animations. Use `useGSAP()` with a `scope` ref (never `useEffect`), and wrap every animation in `gsap.matchMedia()` with a `prefers-reduced-motion: reduce` branch that keeps only opacity. Simple hover and state changes stay in CSS.
- **View change (dashboard): morph first, fade last.** Whatever two views share morphs instead of fading:
  - `data-flip-id`: an element present on both sides of a switch moves and resizes into its new place with GSAP Flip (0.55s `power3.inOut`). The dark hero and its corner notches always morph, so the black shape stays on screen and shapeshifts; so do the sidebar toggle, title pill, theme/add/bell buttons, the big number, the callouts, the attention notch (which moves between corners), the leads card and each lead row. The ids each view renders are listed in `VIEW_FLIP` in `app/dashboard/page.tsx`; keep it in sync with the markup.
  - `data-roll`: text that changes rolls behind a mask (old text slides up out of its box, new text rises into its own box from below, 0.45s). Used for the title and subtitle, the hero heading, the big number and callout values/labels.
  - Only what one side has and the other doesn't fades or slides: panels slide toward the edge nearest to them, small details fade, and `data-swap` marks blocks inside a morphing panel whose contents differ (the leads card's notch).
  - Order: *out* (0.25s) runs before React swaps the view, then *in*. Clicks during the exit are ignored. Reduced motion swaps instantly and fades the new panels in.
- **Rail:** opening and closing glides the width (76 ↔ 220px) while the labels fade; the active tab is a single pill that slides to the clicked row immediately.
- **Curves:** the `ease-out` and `ease-in-out` utilities use stronger curves, set in `app/globals.css`: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for things entering and leaving, and `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for things moving on screen. Never use `ease-in`.
- **Animated properties:** only transform, opacity and clip-path. The one exception is collapsing a section, which uses grid rows.
- **Segmented toggle:** the active pill is a styled copy of the labels clipped to the active half. The clip slides (250ms ease-in-out), so the fill and the text colour change together. See `/auth`.
- **Dropdowns** use the shadcn Select (`components/ui/select.tsx`), never a native `<select>`. The list opens below its trigger and scales in from it (0.95 → 1, fading, 150ms ease-out) and leaves the same way. The chevron flips while it's open. Items are `rounded-control` pills. Reduced motion turns the animation off.
- **Date and time** use `components/date-time-picker.tsx`, never native date or time inputs.
  - It has two steps: the shadcn calendar, with past days disabled, then a clock dial.
  - The steps slide in from their side (200ms ease-out).
  - The dial hand turns to each pick (200ms ease-out), but follows a drag directly. The numbers crossfade when switching between hours and minutes.
  - The hour and minute boxes take typing, and the dial is a keyboard slider.
  - Selected parts use `bg-primary/12 text-primary`.
- **Toasts** come in four kinds and are coloured by kind (Sonner `richColors`):
  - `success`: a confirmed save.
  - `warning`: an invalid or wrong action, whether caught before sending or rejected by the server (400, 409, 418, 422).
  - `error`: a real failure (offline, signed out, server error).
  - `info`: neutral notices.
  - Show API failures through `toastFailure()` in `lib/api.ts`, which picks the kind from the HTTP status.
- **Swapping text** (titles, button labels): both versions sit in one grid cell and crossfade with a 4px rise (200ms ease-out). The hidden one is `inert`.
- **Theme change:** the new theme wipes in from the left edge over 700ms. The curve is logarithmic, y = ln(1 + 15t) / ln(16), sampled into CSS `linear()`: it leaves the edge fast and settles slowly. It is a native Web Animation on the view-transition snapshot, **not GSAP**: a GSAP tween runs on the main thread and stutters while the app re-renders for the new theme. Persisting the choice (next-themes `setTheme`) waits until the wipe ends. Both the toggle button and the `d` key go through `useThemeToggle()` (`components/theme-provider.tsx`); `app/globals.css` only turns off the default crossfade. With reduced motion, or in a browser without view transitions, the theme switches instantly.
- **Fields or rows that appear or disappear:** grid rows 0fr→1fr plus opacity over 400ms on `ease-drawer` (`cubic-bezier(0.32, 0.72, 0, 1)`), a long settling glide, so a card changing size feels calm rather than snappy. Collapsed inputs are `disabled`, so they skip validation.
