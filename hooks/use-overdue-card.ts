import * as React from "react"
import type { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { reduceMotion } from "@/lib/motion"
import type { Lead } from "@/src/client/types.gen"

/** The Dashboard's overdue card: which overdue lead it shows and stepping
 *  through them. The slide-in is in useDashboardMotion (it reads `odDir`). */
export function useOverdueCard({
  overdue,
  contextSafe,
}: {
  overdue: Lead[]
  /** From useViewMorph, so the tweens join its GSAP context. */
  contextSafe: ReturnType<typeof useGSAP>["contextSafe"]
}) {
  const [od, setOd] = React.useState(0)
  // Direction of the step in progress (-1 back, 1 forward).
  const odDir = React.useRef(0)
  const odRef = React.useRef<HTMLDivElement>(null)

  // The current lead slides out, then the swap (the effect slides the next
  // one in).
  const stepOd = (dir: 1 | -1) =>
    contextSafe(() => {
      const n = overdue.length
      if (n < 2) return
      const next = (Math.min(od, n - 1) + dir + n) % n
      const el = odRef.current
      if (reduceMotion() || !el) return setOd(next)
      const out = {
        opacity: 0,
        duration: 0.12,
        ease: "power2.out",
        overwrite: true,
      }
      gsap.to(el.querySelector("[data-od-num]"), {
        ...out,
        yPercent: -dir * 100,
      })
      gsap.to(el.querySelector("[data-od-slide]"), {
        ...out,
        x: -dir * 24,
        onComplete: () => {
          odDir.current = dir
          setOd(next)
        },
      })
    })()

  const odLead = overdue[Math.min(od, overdue.length - 1)]

  return { od, odRef, odDir, stepOd, odLead }
}
