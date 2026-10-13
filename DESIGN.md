# LeadFlow design system

Colour: dark emerald, forest green and cream, with a champagne gold taken from the same reference board. Type and component shapes were first taken from [VANTA — Real Estate Property Management SaaS](https://www.behance.net/gallery/254582983/VANTA-Real-Estate-Property-Management-SaaS-Platform) (Behance, Oleksandr Vinarskyi). We do not copy its logo or name.

Tokens live in `app/globals.css`. Use the Tailwind classes they generate (`bg-card`, `text-muted-foreground`, `bg-status-won`) and never hard-code hex values in components.

## Colour

Source palette: Dark Emerald `#02110C`, Forest/Olive Green `#1A422F`, Cream Beige `#F3EBD6`. Light mode is cream with emerald ink; dark mode is emerald with cream ink.

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Canvas | `background` | `#F3EBD6` cream | `#02110C` emerald | Page background. Content sits on cards above it. |
| Surface | `card` / `popover` | `#FFFDF7` | `#0A1F17` | Lead cards, dialogs, inputs, menus, sidebar |
| Text | `foreground` | `#02110C` | `#F3EBD6` | Headings and main content |
| Muted text | `muted-foreground` | `#55604F` | `#A7B0A0` | Metadata, timestamps, placeholders. At least 5:1 on every surface. |
| Primary | `primary` | `#1A422F` | `#5FA27D` | Primary buttons, selected controls, links, focus ring. Dark mode lifts it because forest green disappears on emerald. |
| Primary hover | `primary-hover` | `#0F2F20` | `#76B593` | Hover and pressed state of primary buttons |
| On primary | `primary-foreground` | `#F3EBD6` cream | `#02110C` | Text on primary (9.5:1 / 6.4:1) |
| Quiet fill | `secondary` | `#E9E0C8` | `#143024` | Secondary panels, filter backgrounds, inactive pills |
| Hover surface | `accent` | `#F7F1E2` | `#143024` | Menu and list hover |
| Lines | `border` / `input` | `#E2D8BE` / `#D3C9AE` | cream 10% / 15% | Separators, input outlines |
| Highlight | `highlight` | `#C2A878` | `#C2A878` | Champagne gold for small premium touches. **Decorative only on light** (2.3:1); fine as text on dark (7.5:1). |

Green marks action and selection only. Inactive controls stay cream or neutral.

### Lead statuses

Each status gets a coloured **dot next to its text label**. The badge itself is a neutral pill (`bg-secondary text-foreground`), so the colour is never the only cue and the text always passes contrast. Every dot is at least 3:1 against cards in both modes.

| Status | Token |
|---|---|
| New | `status-new` (blue `#5B7BE0`) |
| Contacted | `status-contacted` (violet `#9B5FD6`) |
| Qualified | `status-qualified` (teal `#2A8FA0`) |
| Proposal Sent | `status-proposal` (orange `#E2683C`) |
| Won | `status-won` (gold `#A8842F`). Deliberately not green, so a won lead never looks like a primary action. |
| Lost | `status-lost` (grey `#878C86`) |

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
