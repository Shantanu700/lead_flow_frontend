# LeadFlow design system

Colour: LeadFlow's own forest-green palette. Type and component shapes were first taken from [VANTA — Real Estate Property Management SaaS](https://www.behance.net/gallery/254582983/VANTA-Real-Estate-Property-Management-SaaS-Platform) (Behance, Oleksandr Vinarskyi). We do not copy its logo or name.

Tokens live in `app/globals.css`. Use the Tailwind classes they generate (`bg-card`, `text-muted-foreground`, `bg-status-won`) and never hard-code hex values in components.

## Colour

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Canvas | `background` | `#F3F4F2` | `#121514` | Page background. Content sits on cards above it. |
| Surface | `card` / `popover` | `#FFFFFF` | `#171A19` | Lead cards, dialogs, inputs, menus, sidebar |
| Text | `foreground` | `#252B27` | `#EEF0EB` | Headings and main content |
| Muted text | `muted-foreground` | `#5F665F` | `#A3AAA4` | Metadata, timestamps, placeholders. At least 4.8:1 on every surface. |
| Primary | `primary` | `#356B53` | `#5FA584` | Primary buttons, selected controls, links, focus ring |
| Primary hover | `primary-hover` | `#28543F` | `#74B595` | Hover and pressed state of primary buttons |
| On primary | `primary-foreground` | `#FFFFFF` | `#0F1A14` | Text on primary. Dark mode uses dark text because white on the lighter green fails (2.9:1). |
| Quiet fill | `secondary` | `#E7E9E4` | `#252A27` | Secondary panels, filter backgrounds, inactive pills |
| Hover surface | `accent` | `#EEF0EB` | `#252A27` | Menu and list hover |
| Lines | `border` / `input` | `#DCDDD5` / `#CFD2CA` | white 10% / 15% | Separators, input outlines |
| Highlight | `highlight` | `#D8B982` | `#D8B982` | Small premium touches: dots, icons, tiny badges. **Never text on light surfaces** (1.9:1). |

Green marks action and selection only. Inactive controls stay neutral. The canvas has a faint green-grey tint rather than the original warm `#F5F3ED`, so it doesn't read as generic beige.

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
