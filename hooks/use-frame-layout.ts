import * as React from "react"

import { layoutFor } from "@/lib/layout"

/** The dashboard frame's width (ResizeObserver), the rail's collapsed state
 *  and the breakpoints and sizes that follow from them (lib/layout.ts). */
export function useFrameLayout() {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const [w, setW] = React.useState(1400)
  // Phones (frame under 600px): the rail becomes a bottom tab bar and every
  // view stacks and scrolls.
  const phone = w < 600
  const [rail, setRail] = React.useState(false)

  React.useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { frameRef, w, phone, rail, setRail, ...layoutFor(w, rail, phone) }
}
