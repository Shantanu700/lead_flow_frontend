import * as React from "react"

import { reduceMotion } from "@/lib/motion"

/** Today's follow-up strip (Follow-ups tab): which ends it can still scroll
 *  towards, and paging it one screen of tiles at a time. */
export function useFollowUpStrip(view: number) {
  const stripRef = React.useRef<HTMLDivElement>(null)
  const [stripEdge, setStripEdge] = React.useState({ start: true, end: true })

  const readStrip = () => {
    const el = stripRef.current
    if (!el) return
    setStripEdge({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    })
  }
  // One page of tiles per press; snapping lines the result up on a tile.
  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({
      left: dir * (el.clientWidth + 8),
      behavior: reduceMotion() ? "auto" : "smooth",
    })
  }
  // Opening Follow-ups: start the strip at the first tile still to do.
  React.useEffect(() => {
    const el = stripRef.current
    if (view !== 2 || !el) return
    const next = [...el.children].find(
      (c) => c instanceof HTMLElement && !c.dataset.fuDone
    ) as HTMLElement | undefined
    el.scrollLeft = next ? next.offsetLeft - el.offsetLeft : 0
    readStrip()
  }, [view])

  return { stripRef, stripEdge, readStrip, scrollStrip }
}
