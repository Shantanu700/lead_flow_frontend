import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import type { Period, Status } from "@/lib/leads"
import { reduceMotion } from "@/lib/motion"
import type { PaginatedLead } from "@/src/client/types.gen"

/** The dashboard's in-place animations: the Reports period roll, lead rows
 *  gliding to a new order, the filter chip highlight, the overdue card's
 *  step and the bell badge pop. The refs are set by the handlers that cause
 *  the change (captureRows, pickFilter, stepOd). */
export function useDashboardMotion({
  contentRef,
  odRef,
  period,
  list,
  filter,
  od,
  pendingCount,
  rollTexts,
  chipFromRef,
  rollOnListRef,
  odDirRef,
  rowsStateRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>
  odRef: React.RefObject<HTMLDivElement | null>
  period: Period
  list: PaginatedLead
  filter: "All" | Status
  od: number
  pendingCount: number
  rollTexts: () => void
  chipFromRef: React.RefObject<DOMRect | null>
  rollOnListRef: React.RefObject<boolean>
  odDirRef: React.RefObject<number>
  rowsStateRef: React.RefObject<Flip.FlipState | null>
}) {
  // Period change (Reports): changed figures roll like a view change and the
  // new bars grow from the baseline. The first run is the view's own entrance.
  const periodShown = React.useRef(period)
  useGSAP(
    () => {
      if (periodShown.current === period) return
      periodShown.current = period
      rollTexts()
      const bars = contentRef.current?.querySelectorAll("[data-bar]")
      if (!bars?.length || reduceMotion()) return
      gsap.fromTo(
        bars,
        { clipPath: "inset(100% 0 0 0)" },
        {
          clipPath: "inset(0% 0 0 0)",
          duration: 0.5,
          stagger: 0.03,
          delay: 0.1,
          ease: "power3.out",
          clearProps: "clipPath",
        }
      )
    },
    { scope: contentRef, dependencies: [period] }
  )

  useGSAP(
    () => {
      if (rollOnListRef.current) {
        rollOnListRef.current = false
        rollTexts()
      }
      const from = rowsStateRef.current
      rowsStateRef.current = null
      if (!from) return
      Flip.from(from, {
        targets: contentRef.current?.querySelectorAll(
          '[data-flip-id^="lead-"]'
        ),
        duration: 0.3,
        ease: "power3.inOut",
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { opacity: 0 },
            { opacity: 1, duration: 0.2, delay: 0.1, clearProps: "opacity" }
          ),
      })
    },
    { scope: contentRef, dependencies: [list] }
  )

  // Filter chips: the dark highlight slides from the old chip to the new one,
  // across rows if it has to.
  useGSAP(
    () => {
      const old = chipFromRef.current
      chipFromRef.current = null
      const pill =
        contentRef.current?.querySelector<HTMLElement>("[data-chip-pill]")
      if (!old || !pill) return
      const now = pill.getBoundingClientRect()
      gsap.fromTo(
        pill,
        {
          x: old.left - now.left,
          y: old.top - now.top,
          width: old.width,
          height: old.height,
        },
        {
          x: 0,
          y: 0,
          width: now.width,
          height: now.height,
          duration: 0.3,
          ease: "power3.inOut",
          clearProps: "transform,width,height",
        }
      )
    },
    { scope: contentRef, dependencies: [filter] }
  )

  // Overdue card: the next lead slides in from the side you stepped towards.
  useGSAP(
    () => {
      const dir = odDirRef.current
      odDirRef.current = 0
      if (!dir || !odRef.current) return
      gsap.fromTo(
        odRef.current.querySelectorAll("[data-od-slide]"),
        { x: dir * 24, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.25,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      )
      gsap.fromTo(
        odRef.current.querySelector("[data-od-num]"),
        { yPercent: dir * 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.25,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      )
    },
    { scope: odRef, dependencies: [od] }
  )

  // Bell badge: a small pop when the count changes (not on first show).
  const bellCount = React.useRef<number | null>(null)
  useGSAP(
    () => {
      const was = bellCount.current
      bellCount.current = pendingCount
      if (was === null || was === pendingCount || reduceMotion()) return
      gsap.fromTo(
        "[data-bell-badge]",
        { scale: 0.6 },
        { scale: 1, duration: 0.25, ease: "power3.out", clearProps: "scale" }
      )
    },
    { scope: contentRef, dependencies: [pendingCount] }
  )
}
