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
| Brand surface | `brand-surface` | `#E5532F` | `#E5532F` | Large orange fields such as the `/auth` brand panel. It is the brand orange deepened 8% towards ink, so a big area doesn't glare. Use `brand-ink` text on it (4.6:1); muted ink at 70% only for 24px+ text (3.1:1). Small orange elements stay `primary`. |
| Brand ink | `brand-ink` | `#1B1B1B` | `#1B1B1B` | Text on large orange surfaces such as the `/auth` brand panel (5.25:1). Unlike `foreground`, it stays dark in dark mode. Large text may use white on orange (3.3:1, large only). |
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

### Overlays

- **Dialog / modal (alert-dialog):** a 32px panel centred over a blurred backdrop, with pill actions.
- **Drawer:** floats 6px in from the screen edge (`--drawer-inset: var(--spacing-panel)`) as a rounded `shadow-card` panel. It can slide in from the side (`swipeDirection="right"`) or the bottom.
- **Tooltip:** a small ink pill (`bg-foreground text-background`).
- Icon-only actions are round `size-9` buttons.

The sidebar keeps the stock shadcn animations (`duration-200 ease-linear`) unchanged.

## Motion

Use 150–250 ms on state changes: hover, the active pill, the dialog opening, and a mode switch. Every animation ships with a `prefers-reduced-motion` variant that keeps opacity changes and drops movement.

- **Curves:** the `ease-out` and `ease-in-out` utilities use stronger curves, set in `app/globals.css`: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for things entering and leaving, and `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for things moving on screen. Never use `ease-in`.
- **Animated properties:** only transform, opacity and clip-path. The one exception is collapsing a section, which uses grid rows.
- **Segmented toggle:** the active pill is a styled copy of the labels clipped to the active half. The clip slides (250ms ease-in-out), so the fill and the text colour change together. See `/auth`.
- **Swapping text** (titles, button labels): both versions sit in one grid cell and crossfade with a 4px rise (200ms ease-out). The hidden one is `inert`.
- **Fields or rows that appear or disappear:** grid rows 0fr→1fr plus opacity over 400ms on `ease-drawer` (`cubic-bezier(0.32, 0.72, 0, 1)`), a long settling glide, so a card changing size feels calm rather than snappy. Collapsed inputs are `disabled`, so they skip validation.
- **Swapping sides** (`/auth`: Log in puts the form on the left; Register moves it to the right): both columns are equal width, so each translates one column plus the 6px gap. This is transform only, 500ms `ease-in-out`, a long move justified by the distance. The brand panel is `z-10` so it passes over the form. With reduced motion the sides swap instantly.
- **Panels that change height** (such as the `/auth` brand panel) use `justify-between` and reveal extra content, so the new space fills with something rather than leaving a gap.
