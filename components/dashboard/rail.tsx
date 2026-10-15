"use client"

import * as React from "react"
import { LogOut } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { cn } from "@/lib/utils"
import { initials } from "@/lib/format"
import { NAV, ic } from "@/components/dashboard/icons"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

import { useDash } from "@/components/dashboard/context"
import { reduceMotion } from "@/lib/motion"

/** The rail: logo, tabs, Log out and the signed-in user. On phones it becomes a bottom tab bar. */
export function Rail() {
  const { user, logOut, w, phone, nav, rail, go } = useDash()
  const railRef = React.useRef<HTMLElement>(null)
  const railMounted = React.useRef(false)
  const pillRef = React.useRef<HTMLSpanElement>(null)

  // Rail highlight: one pill slides to the active row instead of each row
  // swapping its own background. Placed without motion on first render.
  const pillPlaced = React.useRef(false)
  useGSAP(
    () => {
      const row = railRef.current?.querySelector<HTMLElement>(
        `[data-nav-row="${nav}"]`
      )
      if (!row) return
      // Down the rail; along the tab bar on phones, as wide as a tab.
      if (!phone) gsap.set(pillRef.current, { clearProps: "width" })
      const to = phone
        ? { x: row.offsetLeft, y: row.offsetTop, width: row.offsetWidth }
        : { x: 0, y: row.offsetTop }
      if (!pillPlaced.current || reduceMotion()) {
        pillPlaced.current = true
        gsap.set(pillRef.current, to)
        return
      }
      gsap.to(pillRef.current, { ...to, duration: 0.4, ease: "power3.inOut" })
    },
    { scope: railRef, dependencies: [nav, phone, phone && w] }
  )

  // Rail open/close: the width glides between 76 and 220px while the labels
  // fade (in after it starts opening, out before it finishes closing). Icons
  // never move: rows keep the same left padding in both states.
  useGSAP(
    () => {
      const labels = "[data-rail-label]"
      // The tab bar spans the frame, icons only.
      if (phone) {
        gsap.set(railRef.current, { clearProps: "width" })
        gsap.set(labels, { autoAlpha: 0 })
        railMounted.current = false
        return
      }
      const to = { width: rail ? 220 : 76 }
      if (!railMounted.current) {
        railMounted.current = true
        gsap.set(railRef.current, to)
        gsap.set(labels, { autoAlpha: rail ? 1 : 0 })
        return
      }
      const mm = gsap.matchMedia()
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        ({ conditions }) => {
          const d = conditions?.reduce ? 0 : 1
          gsap.to(railRef.current, {
            ...to,
            duration: 0.45 * d,
            ease: "power3.inOut",
          })
          gsap.to(labels, {
            autoAlpha: rail ? 1 : 0,
            duration: (rail ? 0.25 : 0.15) * d,
            delay: rail ? 0.15 * d : 0,
            ease: rail ? "power2.out" : "power2.in",
          })
        }
      )
    },
    { scope: railRef, dependencies: [rail, phone] }
  )

  return (
    <nav
      ref={railRef}
      className={cn(
        "dark relative z-5 box-border flex w-[76px] min-w-0 flex-none flex-col items-stretch gap-2 overflow-hidden rounded-[38px] bg-background p-3 text-foreground",
        // Phones: a bottom tab bar of icons only (tabs and Log out).
        phone &&
          "w-auto! flex-row [&_[data-rail-label]]:hidden [&>[data-phone-hide]]:hidden [&>button]:min-w-0 [&>button]:flex-1 [&>button]:justify-center [&>button]:px-0"
      )}
    >
      <span
        ref={pillRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 h-13 rounded-full bg-foreground",
          phone ? "left-0 w-13" : "right-3 left-3"
        )}
      />
      <div data-phone-hide className="mb-1 flex h-13 items-center gap-3">
        <div className="grid size-13 flex-none place-items-center rounded-full bg-card">
          <span className="flex items-end gap-[3px]">
            <span className="h-2.5 w-1.5 rounded-[3px] bg-foreground" />
            <span className="h-4 w-1.5 rounded-[3px] bg-foreground" />
            <span className="h-[22px] w-1.5 rounded-[3px] bg-highlight" />
          </span>
        </div>
        <span
          data-rail-label
          className="invisible text-lg font-medium whitespace-nowrap opacity-0"
        >
          LeadFlow
        </span>
      </div>
      {NAV.map(([label, Icon], i) => (
        <RailRow
          key={label}
          label={label}
          index={i}
          active={nav === i}
          onClick={() => go(i)}
        >
          <Icon {...ic} />
        </RailRow>
      ))}
      <div data-phone-hide className="flex-1" />
      <RailRow label="Log out" active={false} onClick={logOut}>
        <LogOut {...ic} />
      </RailRow>
      <div data-phone-hide className="flex items-center gap-3">
        <div className="grid size-13 flex-none place-items-center rounded-full bg-attention text-[15px] font-medium text-attention-foreground">
          {initials(user.name || user.email)}
        </div>
        <span
          data-rail-label
          className="invisible flex min-w-0 flex-col gap-px whitespace-nowrap opacity-0"
        >
          <span className="truncate text-sm font-medium">
            {user.name || user.email}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </span>
      </div>
    </nav>
  )
}

function RailRow({
  label,
  index,
  active,
  onClick,
  children,
}: {
  label: string
  index?: number
  active: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      data-nav-row={index}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative box-border flex h-13 w-full min-w-13 cursor-pointer items-center gap-3 overflow-hidden rounded-full border-0 bg-transparent px-4 transition-colors duration-200 [&>svg]:shrink-0",
        // Hover tints only rows the sliding pill isn't on (Tailwind's hover:
        // already skips touch screens).
        active
          ? "text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
      <span
        data-rail-label
        className="invisible text-sm font-medium whitespace-nowrap opacity-0"
      >
        {label}
      </span>
    </button>
  )
}
