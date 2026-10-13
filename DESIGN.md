# LeadFlow design system

Visual reference: [VANTA — Real Estate Property Management SaaS](https://www.behance.net/gallery/254582983/VANTA-Real-Estate-Property-Management-SaaS-Platform) (Behance, Oleksandr Vinarskyi). We borrow its palette, type and component shapes. We do not copy its logo or name.

Tokens live in `app/globals.css`. Use the Tailwind classes they generate (`bg-card`, `text-muted-foreground`, `bg-status-won`) and never hard-code hex values in components.

## Colour

| Role | Token | Value | Use |
|---|---|---|---|
| Canvas | `background` | `#F1F1F3` | Page background. Content sits on white cards above it. |
| Surface | `card` / `popover` | `#FFFFFF` | Cards, dialogs, menus |
| Ink | `foreground` | `#1B1B1B` | Text and dark icon buttons |
| Brand | `brand` | `#F75831` | Status dots, chart series, focus rings, large accent words |
| Primary | `primary` | `#D24015` | Filled buttons and the active tab or pill. This is the brand orange deepened so white text reaches 4.5:1. |
| Quiet fill | `secondary` | `#E6E8F1` | Inactive pills, icon chips, segmented controls |
| Muted text | `muted-foreground` | `#64666F` | Secondary lines and placeholders (5:1). The reference's `#878992` fails contrast for text, so it appears only as the `status-lost` dot. |
| Lines | `border` / `input` | `#E6E8F1` / `#C6C6C8` | Hairlines, input outlines |

Use orange sparingly: primary actions, the current selection and state markers. Inactive controls stay grey. Dark mode swaps in `#121212` for the canvas, `#1B1B1B` for cards and `#313131` for fills, matching the reference's dark cards.

### Lead statuses

Each status gets a coloured **dot next to its text label**. The badge itself is a neutral pill (`bg-secondary text-foreground`), so the colour is never the only cue and the text always passes contrast.

| Status | Token |
|---|---|
| New | `status-new` (blue) |
| Contacted | `status-contacted` (violet) |
| Qualified | `status-qualified` (amber) |
| Proposal Sent | `status-proposal` (brand orange) |
| Won | `status-won` (green) |
| Lost | `status-lost` (grey) |

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
| `rounded-md` | 18px | List rows, chips, small tiles, sidebar menu items, swatches |
| `rounded-sm` | 12px | Inline badges, tiny swatches |
| `rounded-full` | pill | Every button, toggle, status pill and filter |

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

Use 150–250 ms ease-out on state changes only: hover, the active pill and the dialog opening. Respect `prefers-reduced-motion`.
