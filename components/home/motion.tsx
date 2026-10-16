"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

gsap.registerPlugin(useGSAP)

/** Text that rolls when it changes, like the dashboard's data-roll: the old
 *  value slides up out of a mask while the new one rises into it (0.45s). */
export function Roll({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [shown, setShown] = React.useState({
    now: text,
    was: null as string | null,
    n: 0,
  })
  // A new value: keep the old one on screen until it has rolled out.
  if (shown.now !== text)
    setShown((s) => ({ now: text, was: s.now, n: s.n + 1 }))

  useGSAP(
    () => {
      const el = ref.current
      if (!el || shown.was === null) return
      const done = () =>
        setShown((s) => (s.n === shown.n ? { ...s, was: null } : s))
      if (reduceMotion()) return done()
      const [old, now] = el.children
      const roll = { duration: 0.45, ease: "power3.inOut" }
      gsap.fromTo(now, { yPercent: 100 }, { yPercent: 0, ...roll })
      gsap.fromTo(
        old,
        { yPercent: 0 },
        { yPercent: -100, ...roll, onComplete: done }
      )
    },
    { dependencies: [shown.n], scope: ref }
  )

  return (
    <span
      ref={ref}
      className={cn(
        "inline-grid overflow-hidden align-bottom *:[grid-area:1/1]",
        className
      )}
    >
      {shown.was !== null && (
        <span key={"was" + shown.n} aria-hidden>
          {shown.was}
        </span>
      )}
      <span key={"now" + shown.n}>{shown.now}</span>
    </span>
  )
}

/** One line of a two-tone title, inside the mask it rolls up through as it
 *  comes into view (home.tsx's reveal). */
export function Line({
  muted,
  children,
}: {
  muted?: boolean
  children: string
}) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <span data-line className={cn("block", muted && "text-muted-foreground")}>
        {children}
      </span>
    </span>
  )
}

/** Glide to a section, clear of the floating header. Not CSS smooth
 *  scrolling: that fights ScrollTrigger's own scroll restoring. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - 84,
    behavior: reduceMotion() ? "auto" : "smooth",
  })
}

/** Counts a figure up from zero; `format` turns the running value into text. */
export function countUp(
  el: Element,
  to: number,
  format: (v: number) => string,
  vars: gsap.TweenVars = {}
) {
  const o = { v: 0 }
  return gsap.to(o, {
    v: to,
    duration: 1.1,
    ease: "power3.out",
    ...vars,
    onUpdate: () => {
      el.textContent = format(o.v)
    },
  })
}
