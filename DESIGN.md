# LeadFlow design system

Visual reference: [VANTA — Real Estate Property Management SaaS](https://www.behance.net/gallery/254582983/VANTA-Real-Estate-Property-Management-SaaS-Platform) (Behance, Oleksandr Vinarskyi). We borrow its orange palette, type and component shapes, pushed to higher contrast. We do not copy its logo or name.

Tokens live in `app/globals.css`. Use the Tailwind classes they generate (`bg-card`, `text-muted-foreground`, `bg-status-won`) and never hard-code hex values in components.

## Colour

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Canvas | `background` | `#E9EAEE` | `#0B0B0B` | Page background. Darker than VANTA's `#F1F1F3` so white cards stand off it. |
| Surface | `card` / `popover` | `#FFFFFF` | `#1B1B1B` | Cards, dialogs, menus, sidebar |
| Ink | `foreground` | `#111111` | `#F5F5F7` | Headings and main content (18.9:1 / 15.8:1) |
| Muted text | `muted-foreground` | `#4E5058` | `#ADB1BC` | Metadata, timestamps, placeholders. At least 6:1 on every surface. |
| Primary | `primary` | `#C73A10` | `#C73A10` | Filled buttons, the active pill, links, focus ring. VANTA orange deepened for 5.2:1 with white text. |
| Primary hover | `primary-hover` | `#A8300B` | `#A8300B` | Hover and pressed state of primary buttons |
| Highlight | `highlight` | `#F75831` | `#F75831` | The original VANTA orange: status dots, chart series, large accent words. Not for small text on white (3.3:1). |
| Quiet fill | `secondary` | `#E1E3EB` | `#313131` | Inactive pills, icon chips, segmented controls |
| Hover surface | `accent` | `#F1F2F5` | `#262626` | Menu and list hover |
| Lines | `border` / `input` | `#D3D5DE` / `#ABADB5` | white 12% / 18% | Separators; `input` is a 50% fill behind fields |

Use orange sparingly: primary actions, the current selection and state markers. Inactive controls stay grey.

### Lead statuses

Each status gets a coloured **dot next to its text label**. The badge itself is a neutral pill (`bg-secondary text-foreground`), so the colour is never the only cue and the text always passes contrast. Every dot is at least 3:1 against cards in both modes.

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

Use 150–250 ms ease-out on state changes only: hover, the active pill and the dialog opening. Respect `prefers-reduced-motion`.
