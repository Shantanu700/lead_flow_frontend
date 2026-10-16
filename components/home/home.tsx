"use client"

import "@/lib/api"

import * as React from "react"
import Link from "next/link"
import { BellRing, ChartColumn, Layers, MoonIcon, SunIcon } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { Logo } from "@/components/logo"
import { Notch } from "@/components/notch"
import { useThemeToggle } from "@/components/theme-provider"
import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { getCoreLogin } from "@/src/client/sdk.gen"
import { FOLLOWS } from "./data"
import { ArrowLink, Hero } from "./hero"
import { countUp, scrollToId } from "./motion"
import { Tour } from "./tour"

gsap.registerPlugin(useGSAP, ScrollTrigger)

/** Header buttons are the notch's at this scale (44px vs 64px). */
const S = 44 / 64

const CARDS = [
  {
    Icon: Layers,
    title: "Six clear stages",
    body: "New, Contacted, Qualified, Proposal Sent, Won and Lost. Every lead sits in exactly one.",
  },
  {
    Icon: BellRing,
    title: "Nothing slips past today",
    body: "Overdue follow-ups stay at the top until someone calls back.",
  },
  {
    Icon: ChartColumn,
    title: "Reports that add up",
    body: "Revenue, deal size and time to close, worked out from the leads you already have.",
  },
]

/** The public landing page at `/`. */
export function Home() {
  const root = React.useRef<HTMLDivElement>(null)
  const header = React.useRef<HTMLElement>(null)
  const flyer = React.useRef<HTMLDivElement>(null)
  const slotStart = React.useRef<HTMLSpanElement>(null)
  const slotEnd = React.useRef<HTMLSpanElement>(null)
  const heroPin = React.useRef<ScrollTrigger | null>(null)
  const place = React.useRef<() => void>(() => {})
  const [signedIn, setSignedIn] = React.useState(false)
  const [done, setDone] = React.useState(() => FOLLOWS.map(() => false))

  // Signed in already: offer the dashboard instead of Log in.
  React.useEffect(() => {
    getCoreLogin()
      .then(({ data }) => setSignedIn(!!data))
      .catch(() => {})
  }, [])
  // The buttons' widths change with the label.
  React.useEffect(() => place.current(), [signedIn])

  // The notch lifts off: once the hero has finished becoming the dashboard
  // and starts to scroll away, its top-right notch's buttons fly into the
  // floating header, which grows in around them, and the notch closes
  // behind them. Scrolling back up sends them home. The buttons live in
  // one fixed layer and are placed between the two slots by scroll.
  useGSAP(
    () => {
      const fly = flyer.current!
      const head = header.current!
      const a = slotStart.current!
      const b = slotEnd.current!
      const notch = a.parentElement!
      const inOut = gsap.parseEase("power2.inOut")
      const out = gsap.parseEase("power3.out")
      const lerp = gsap.utils.interpolate
      // Wide screens: during the last 300px of the hero's hold, while the
      // finished dashboard is still on screen. Otherwise as the notch nears
      // the top.
      const st = ScrollTrigger.create({
        start: () =>
          heroPin.current
            ? heroPin.current.end - 300
            : // Never at load: a notch near the top would start "landed".
              Math.max(
                80,
                a.getBoundingClientRect().top +
                  window.scrollY -
                  innerHeight * 0.3
              ),
        end: (self) => self.start + 300,
      })
      place.current = () => {
        const w = fly.offsetWidth
        a.style.width = w + "px"
        b.style.width = w * S + "px"
        const p = st.progress
        const e = reduceMotion() ? Math.round(p) : inOut(p)
        const h = reduceMotion()
          ? Math.round(p)
          : out(gsap.utils.clamp(0, 1, (p - 0.35) / 0.65))
        // The header first: the landing slot is measured where it is now.
        gsap.set(head, {
          autoAlpha: h,
          y: lerp(-24, 0, h),
          scale: lerp(0.92, 1, h),
        })
        head.inert = h < 0.5
        // The notch shrinks towards its top-right corner, where the slot
        // sits, so measure from that corner rather than the shrinking slot.
        const from = notch.getBoundingClientRect()
        const to = b.getBoundingClientRect()
        gsap.set(fly, {
          x: lerp(from.right - w, to.left, e),
          y: lerp(from.top, to.top, e),
          scale: lerp(1, S, e),
          visibility: "visible",
        })
        gsap.set(notch, {
          scale: Math.max(0.001, 1 - e),
          transformOrigin: "100% 0%",
        })
      }
      const update = () => place.current()
      update()
      window.addEventListener("scroll", update, { passive: true })
      ScrollTrigger.addEventListener("refresh", update)
      // Font swaps move things: measure again once the text is final.
      document.fonts?.ready.then(() => ScrollTrigger.refresh())
      return () => {
        window.removeEventListener("scroll", update)
        ScrollTrigger.removeEventListener("refresh", update)
      }
    },
    { scope: root }
  )

  // Sections below the hero rise in as they arrive; two-tone titles roll up
  // line by line behind a mask; counts tick up.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<HTMLElement>("[data-reveal]")
        const linesOf = (el: Element) => el.querySelectorAll("[data-line]")
        items.forEach((el) => {
          const lines = linesOf(el)
          if (lines.length) gsap.set(lines, { yPercent: 105 })
          else gsap.set(el, { y: 28, autoAlpha: 0 })
        })
        ScrollTrigger.batch(items, {
          start: "top 88%",
          once: true,
          onEnter: (els) =>
            els.forEach((el, i) => {
              const lines = linesOf(el)
              const vars = {
                duration: 0.8,
                delay: i * 0.08,
                ease: "power3.out",
              }
              if (lines.length)
                gsap.to(lines, { yPercent: 0, stagger: 0.08, ...vars })
              else
                gsap.to(el, {
                  y: 0,
                  autoAlpha: 1,
                  clearProps: "transform",
                  ...vars,
                })
            }),
        })
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) =>
          countUp(el, Number(el.dataset.count), (v) => String(Math.round(v)), {
            delay: 0.6,
          })
        )
      })
    },
    { scope: root }
  )

  return (
    <div
      ref={root}
      className="flex min-h-svh flex-col items-center gap-2.5 bg-background px-3 pt-3 pb-10 text-foreground sm:px-7 sm:pt-7"
    >
      <header
        ref={header}
        className="invisible fixed top-3 left-1/2 z-30 flex w-[min(860px,calc(100%-24px))] -translate-x-1/2 items-center gap-3 rounded-full bg-card p-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_rgb(0_0_0/0.14)]"
      >
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({
              top: 0,
              behavior: reduceMotion() ? "auto" : "smooth",
            })
          }}
          className="rounded-full pl-1.5"
        >
          <Logo small />
        </a>
        <nav className="hidden flex-1 justify-center gap-1 sm:flex">
          {[
            ["features", "Features"],
            ["start", "Get started"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={"#" + id}
              onClick={(e) => {
                e.preventDefault()
                scrollToId(id)
              }}
              className="rounded-full px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              {label}
            </a>
          ))}
        </nav>
        <span className="ml-auto flex items-center gap-1.5 sm:ml-0">
          <span ref={slotEnd} aria-hidden className="block h-11" />
          {!signedIn && (
            <ArrowLink
              href="/auth?mode=register"
              label="Create account"
              className="hidden h-11 px-5 text-sm sm:flex"
            />
          )}
        </span>
      </header>

      {/* The notch's buttons, placed between the notch and the header. */}
      <div
        ref={flyer}
        className="invisible fixed top-0 left-0 z-40 flex origin-top-left gap-2 will-change-transform"
      >
        <ThemeButton />
        <Link
          href={signedIn ? "/dashboard" : "/auth"}
          className="flex h-16 items-center rounded-full bg-background px-[26px] text-[15px] font-medium whitespace-nowrap transition-colors hover:text-highlight"
        >
          {signedIn ? "Open dashboard" : "Log in"}
        </Link>
      </div>

      <Hero
        slotRef={slotStart}
        pinRef={heroPin}
        left={done.filter((d) => !d).length}
        signedIn={signedIn}
      />

      <section
        id="features"
        className="flex w-full max-w-[1320px] flex-col gap-2.5 rounded-[44px] bg-card p-2.5 shadow-card"
      >
        <div className="flex flex-wrap items-end justify-between gap-6 px-5 pt-8 pb-4 sm:px-11 sm:pt-10 sm:pb-6">
          <h2
            data-reveal
            className="m-0 text-[32px] leading-[1.1] font-light tracking-[-0.02em] sm:text-[46px]"
          >
            <Line>One screen for the whole day</Line>
            <Line muted>Four views, no page loads.</Line>
          </h2>
          <p
            data-reveal
            className="m-0 max-w-[360px] text-[15px] leading-[1.55] text-muted-foreground"
          >
            Pick a view, or keep scrolling. Everything below is example data and
            nothing is saved.
          </p>
        </div>

        <Tour
          done={done}
          toggleDone={(i) =>
            setDone((d) => d.map((x, k) => (k === i ? !x : x)))
          }
        />

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {CARDS.map(({ Icon, title, body }) => (
            <SpotCard key={title} title={title} body={body}>
              <Icon size={20} strokeWidth={1.75} />
            </SpotCard>
          ))}
        </div>
      </section>

      <section
        id="start"
        className="w-full max-w-[1320px] rounded-[44px] bg-card p-2.5 shadow-card"
      >
        {/* The notch is outside the .dark panel, so it keeps the card's
            colour and reads as a cut-out. */}
        <div className="relative min-h-[420px] sm:min-h-[380px]">
          <div className="dark absolute inset-0 rounded-[32px] bg-background" />
          <div className="dark relative flex max-w-[640px] flex-col gap-[18px] px-6 pt-12 pb-40 text-foreground sm:px-11 sm:pt-14 sm:pb-32">
            <h2
              data-reveal
              className="m-0 text-[34px] leading-[1.08] font-light tracking-[-0.02em] sm:text-[54px]"
            >
              <Line>Start following up</Line>
              <Line muted>Your first lead takes a minute.</Line>
            </h2>
            <p
              data-reveal
              className="m-0 max-w-[460px] text-base leading-[1.55] text-muted-foreground"
            >
              Add a name, set a date, and LeadFlow puts it on today&apos;s list
              when it&apos;s due.
            </p>
          </div>
          {/* Bottom-right notch: the two ways in. */}
          <Notch corner="br" className="flex max-w-full gap-2">
            {!signedIn && (
              <Link
                href="/auth"
                className="flex h-16 items-center rounded-full bg-background px-[26px] text-[15px] font-medium whitespace-nowrap transition-colors hover:text-highlight"
              >
                Log in
              </Link>
            )}
            <ArrowLink
              href={signedIn ? "/dashboard" : "/auth?mode=register"}
              label={signedIn ? "Open dashboard" : "Create free account"}
              className="h-16 px-[30px] text-[15px]"
            />
          </Notch>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-4 px-6 pt-7 pb-5 text-sm text-muted-foreground sm:px-9">
          <span className="flex items-center gap-2.5 font-medium text-foreground">
            <span className="size-2.5 rounded-full bg-primary" />
            LeadFlow
          </span>
          <nav className="flex flex-wrap gap-5">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault()
                scrollToId("features")
              }}
              className="transition-colors hover:text-foreground"
            >
              Features
            </a>
            <Link
              href="/auth"
              className="transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
          </nav>
          <span>© 2026 LeadFlow</span>
        </footer>
      </section>
    </div>
  )
}

/** One line of a two-tone title, inside the mask it rolls up through. */
function Line({ muted, children }: { muted?: boolean; children: string }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <span data-line className={cn("block", muted && "text-muted-foreground")}>
        {children}
      </span>
    </span>
  )
}

function ThemeButton() {
  const toggle = useThemeToggle()
  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle theme"
      className="grid size-16 cursor-pointer place-items-center rounded-full border-0 bg-background text-foreground transition-colors hover:text-highlight"
    >
      <SunIcon size={20} strokeWidth={1.75} className="hidden dark:block" />
      <MoonIcon size={20} strokeWidth={1.75} className="dark:hidden" />
    </button>
  )
}

/** A feature card that lifts on hover, with a soft orange light that
 *  follows the cursor. */
function SpotCard({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <div
      data-reveal
      onMouseMove={(e) => {
        const b = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty("--mx", e.clientX - b.left + "px")
        e.currentTarget.style.setProperty("--my", e.clientY - b.top + "px")
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.setProperty("--mx", "-500px")
        e.currentTarget.style.setProperty("--my", "-500px")
      }}
      className="flex min-h-[220px] flex-col justify-between gap-6 rounded-[32px] bg-background bg-[radial-gradient(260px_circle_at_var(--mx,-500px)_var(--my,-500px),color-mix(in_oklch,var(--highlight)_16%,transparent),transparent_70%)] p-7 transition-transform duration-350 ease-out hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="grid size-13 place-items-center rounded-full bg-card">
        {children}
      </span>
      <span className="flex flex-col gap-2">
        <span className="text-xl font-light">{title}</span>
        <span className="text-sm leading-[1.55] text-muted-foreground">
          {body}
        </span>
      </span>
    </div>
  )
}
