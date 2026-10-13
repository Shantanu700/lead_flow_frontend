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

## Shape and layout

- `--radius: 1rem`. Use `rounded-2xl` for cards and dialogs, and `rounded-full` for buttons, tabs, filter pills, badges and the search field.
- Separate cards with space and the canvas colour rather than borders or shadows. White cards on grey need no outline.
- Icon-only actions (expand, close) are round `size-9` buttons. Use dark ones (`bg-foreground text-background`) for the main action on a card and `secondary` ones in toolbars.
- Status filters are a segmented pill row. The active pill is `primary`, the rest `secondary`.

## Motion

Use 150–250 ms ease-out on state changes only: hover, the active pill and the dialog opening. Respect `prefers-reduced-motion`.
