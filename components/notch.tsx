import * as React from "react"

import { cn } from "@/lib/utils"

/** The notch's inner corner radius (the design's `notchRadius`). */
const R = 36

type Corner = "tl" | "tr" | "br" | "bl" | "b"

const fillet = (at: string, R: number, edge?: boolean) =>
  edge
    ? // A 2px --photo-edge band on the arc, continuing a photo's edge line.
      `radial-gradient(circle at ${at}, transparent ${R - 2}px, var(--photo-edge) ${R - 2}px, var(--photo-edge) ${R}px, var(--card) ${R + 0.5}px)`
    : `radial-gradient(circle at ${at}, transparent ${R - 0.5}px, var(--card) ${R}px)`

// The edge line along the notch's two inner sides, per corner.
const EDGE_SHADOW: Record<Corner, string> = {
  tl: "2px 2px 0 0 var(--photo-edge)",
  tr: "-2px 2px 0 0 var(--photo-edge)",
  br: "-2px -2px 0 0 var(--photo-edge)",
  bl: "2px -2px 0 0 var(--photo-edge)",
  b: "0 -2px 0 0 var(--photo-edge)",
}

// Each corner: the block's position, padding and rounded inner corner, plus
// two fillets that curve the panel's edge into the notch.
const corners = (
  R: number,
  G: number
): Record<
  Corner,
  {
    box: React.CSSProperties
    // [position, gradient centre, role while the notch changes corner]
    fillets: [React.CSSProperties, string, role?: "edge" | "fly"][]
  }
> => ({
  tl: {
    box: {
      top: 0,
      left: 0,
      borderBottomRightRadius: R,
      padding: `0 ${G}px ${G}px 0`,
    },
    fillets: [
      [{ top: 0, right: -R }, "100% 100%"],
      [{ left: 0, bottom: -R }, "100% 100%"],
    ],
  },
  tr: {
    box: {
      top: 0,
      right: 0,
      borderBottomLeftRadius: R,
      padding: `0 0 ${G}px ${G}px`,
    },
    fillets: [
      [{ top: 0, left: -R }, "0 100%"],
      [{ right: 0, bottom: -R }, "0 100%"],
    ],
  },
  br: {
    box: {
      bottom: 0,
      right: 0,
      borderTopLeftRadius: R,
      padding: `${G}px 0 0 ${G}px`,
    },
    fillets: [
      [{ right: 0, top: -R }, "0 0", "edge"],
      [{ bottom: 0, left: -R }, "0 0"],
      // Rounds the other side while the notch moves; hidden at rest, where
      // it would sit outside the panel over its neighbour.
      [{ bottom: 0, right: -R }, "100% 0", "fly"],
    ],
  },
  bl: {
    box: {
      bottom: 0,
      left: 0,
      borderTopRightRadius: R,
      padding: `${G}px ${G}px 0 0`,
    },
    fillets: [
      [{ left: 0, top: -R }, "100% 0", "edge"],
      [{ bottom: 0, right: -R }, "100% 0"],
      // Rounds the other side while the notch moves; hidden at rest, where
      // it would sit outside the panel over its neighbour.
      [{ bottom: 0, left: -R }, "0 0", "fly"],
    ],
  },
  b: {
    box: {
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      borderTopLeftRadius: R,
      borderTopRightRadius: R,
      padding: `${G}px ${G}px 0`,
    },
    fillets: [
      [{ bottom: 0, left: -R }, "0 0"],
      [{ bottom: 0, right: -R }, "100% 0"],
    ],
  },
})

/** A card-coloured cut-out in a panel's corner that holds controls. */
export { R as NOTCH_R }

export function Notch({
  corner,
  r = R,
  gap = 10,
  edge,
  className,
  style,
  children,
  ...rest
}: {
  corner: Corner
  /** Inner corner radius; smaller for small cards (the drawer's notes). */
  r?: number
  /** Space between the panel and what the notch holds. */
  gap?: number
  /** Continue the panel's `--photo-edge` line round the notch (as on /auth). */
  edge?: boolean
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const { box, fillets } = corners(r, gap)[corner]
  return (
    <div
      data-notch={corner}
      className={cn("absolute box-border bg-card", className)}
      style={{
        ...box,
        ...(edge && { boxShadow: EDGE_SHADOW[corner] }),
        ...style,
      }}
      {...rest}
    >
      {children}
      {fillets.map(([pos, at, role], i) => (
        <span
          key={i}
          aria-hidden
          data-fillet={role}
          className={cn(
            "pointer-events-none absolute",
            // Out of the layout at rest: sitting past the panel's edge, it
            // would otherwise widen the scroll area.
            role === "fly" && "hidden"
          )}
          style={{
            ...pos,
            width: r,
            height: r,
            background: fillet(at, r, edge),
          }}
        />
      ))}
    </div>
  )
}
