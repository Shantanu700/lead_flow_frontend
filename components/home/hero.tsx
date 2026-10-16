"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { Notch } from "@/components/notch"
import { Logo } from "@/components/logo"
import { NAV, ic } from "@/components/dashboard/icons"
import { money } from "@/lib/format"
import type { Status } from "@/lib/leads"
import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"
import teamPhoto from "@/public/auth/team.jpg"
import { DOT, EXAMPLE_LEADS, FOLLOWS, LIVE, STAGE_COUNTS } from "./data"
import { Roll, countUp, scrollToId } from "./motion"

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger)

// What the product is, not invented results.
const FACTS = [
  [6, "stages from New to Won"],
  [4, "views on one screen"],
  [0, "page loads between them"],
] as const

// First-paint entrance in CSS, so it never waits for hydration: a rise and
// fade, and a mask roll for the headline lines.
const RISE =
  "animate-in duration-700 ease-out fill-mode-both fade-in-0 slide-in-from-bottom-6 motion-reduce:animate-none"
const LINE =
  "animate-in duration-700 ease-out fill-mode-both slide-in-from-bottom motion-reduce:animate-none"

// The dashboard the photo turns into (example data).
const OPEN_VALUE = 1234500
const SMAX = Math.max(...STAGE_COUNTS.map(([, n]) => n))

/** The hero card. On wide screens it stays on screen while you scroll and
 *  the photo panel shapeshifts into the dashboard's dark hero: the copy
 *  slides away, the clip opens to the rail, the photo fades to the app and
 *  the figures arrive. The top-right notch stays put throughout; the page
 *  flies its buttons into the header afterwards (see home.tsx). On narrower
 *  screens the same change plays once the photo is well in view. */
export function Hero({
  slotRef,
  pinRef,
  left,
  signedIn,
}: {
  /** Where the flying theme/Log in buttons sit while in the notch. */
  slotRef: React.RefObject<HTMLSpanElement | null>
  /** The morph's ScrollTrigger, so the header knows where the pin ends. */
  pinRef: React.RefObject<ScrollTrigger | null>
  /** Follow-ups still to do today (ticked off in the tour). */
  left: number
  signedIn: boolean
}) {
  const root = React.useRef<HTMLElement>(null)
  // The finished dashboard's status filter: its chips and its tiles.
  const [filter, setFilter] = React.useState<Filter>("All")
  // Where the chip highlight and leads rows were before a change, for Flip.
  const flipFrom = React.useRef<Flip.FlipState | null>(null)
  const pick = (f: Filter) => {
    if (f === filter) return
    const els = root.current?.querySelectorAll("[data-row] [data-flip-id]")
    if (els?.length && !reduceMotion()) flipFrom.current = Flip.getState(els)
    setFilter(f)
  }

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const stage = q("[data-stage]")[0] as HTMLElement
      const half = () => stage.clientWidth / 2 + 5
      // The leads and filter panels' row under the finished hero, plus the gap.
      const rowH = () => (q("[data-row]")[0] as HTMLElement).offsetHeight + 10
      const mm = gsap.matchMedia()
      mm.add(
        {
          wide: "(min-width: 1024px)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        ({ conditions }) => {
          if (!conditions?.motion) return
          const [big] = q("[data-big]")
          // Explicit start values throughout (fromTo, not to): a refresh
          // re-records a to()'s start wherever the timeline happens to be
          // rendered while measuring, which can freeze it at its end state.
          const shared = (tl: gsap.core.Timeline, at: number) =>
            tl
              .fromTo(
                q("[data-glass]"),
                { autoAlpha: 1, y: 0 },
                { autoAlpha: 0, y: -16, duration: 0.2 },
                at
              )
              .fromTo(
                q("[data-photo]"),
                { autoAlpha: 1 },
                { autoAlpha: 0, duration: 0.3 },
                at + 0.2
              )
              .fromTo(
                stage,
                { "--edge": 1 },
                { "--edge": 0, duration: 0.3 },
                at + 0.2
              )
              .fromTo(
                q("[data-dash-text]"),
                { y: 24, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, stagger: 0.04, duration: 0.2 },
                at + 0.45
              )
              .fromTo(
                q("[data-tile]"),
                { clipPath: "inset(100% 0% 0% 0%)" },
                {
                  clipPath: "inset(0% 0% 0% 0%)",
                  stagger: 0.03,
                  duration: 0.25,
                },
                at + 0.55
              )
              .add(countUp(big, OPEN_VALUE, money, { duration: 0.3 }), at + 0.5)

          if (!conditions.wide) {
            // Narrow: no pinning; the change plays as the photo comes up.
            const tl = gsap.timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: {
                trigger: q("[data-panel-wrap]")[0],
                start: "top 30%",
                toggleActions: "play none none reverse",
              },
            })
            shared(tl, 0).timeScale(1.6)
            return
          }

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: "top 8px",
              end: "+=1500",
              pin: true,
              // Its parent is a flex column, where ScrollTrigger skips the
              // spacing by default.
              pinSpacing: true,
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          })
          tl.fromTo(
            q("[data-copy]"),
            { x: 0, autoAlpha: 1 },
            { x: -56, autoAlpha: 0, duration: 0.3, ease: "power1.in" },
            0
          )
          // The panel's clip: its left edge opens to the rail, then its bottom
          // rises to make room for the dashboard's lower row of panels. Real
          // tweens on the element (not a proxy written in onUpdate), so any
          // render, including a refresh restoring the scroll, sets it right.
          const lift = { duration: 0.3, ease: "power2.inOut" }
          const inset = (b: number, l: number) =>
            `inset(0px 0px ${b}px ${l}px round 34px)`
          tl.fromTo(
            q("[data-panel]"),
            { clipPath: () => inset(0, half()) },
            {
              clipPath: inset(0, 86),
              duration: 0.45,
              ease: "power2.inOut",
            },
            0.05
          )
            .fromTo(
              q("[data-panel]"),
              { clipPath: inset(0, 86) },
              {
                clipPath: () => inset(rowH(), 86),
                ...lift,
                immediateRender: false, // the first clip tween owns the start
              },
              0.5
            )
            .fromTo(
              q("[data-bl]"),
              { x: 0 },
              { x: () => 86 - half(), duration: 0.45, ease: "power2.inOut" },
              0.05
            )
            // The follow-ups notch rides up with the hero's bottom edge.
            .fromTo(
              q("[data-bl]"),
              { y: 0 },
              { y: () => -rowH(), ...lift },
              0.5
            )
            .fromTo(
              q("[data-row] > *"),
              { y: 60, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                stagger: 0.06,
                duration: 0.3,
                ease: "power3.out",
              },
              0.62
            )
            .fromTo(
              q("[data-rail]"),
              { xPercent: -120, autoAlpha: 0 },
              { xPercent: 0, autoAlpha: 1, duration: 0.3, ease: "power2.out" },
              0.38
            )
            .fromTo(
              q("[data-tl]"),
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.15 },
              0.5
            )
          shared(tl, 0.02)
          tl.to({}, { duration: 0.3 }) // hold the finished dashboard; the notch lifts off here
          pinRef.current = tl.scrollTrigger ?? null
          return () => {
            pinRef.current = null
          }
        }
      )
    },
    { scope: root }
  )

  return (
    <section
      id="top"
      ref={root}
      className="w-full rounded-[44px] bg-card p-2.5 lg:h-[max(620px,calc(100svh-16px))]"
    >
      <div
        data-stage
        className="relative flex h-full flex-col gap-2.5 [--row:clamp(230px,36%,330px)] lg:block lg:overflow-hidden"
        // The photo's subtle orange edge (as on /auth): brand orange mixed
        // into the card colour, faded out (--edge) as the photo goes.
        style={
          {
            "--edge": 1,
            "--photo-edge":
              "color-mix(in oklch, color-mix(in oklch, var(--primary) 55%, var(--card)) calc(var(--edge) * 100%), transparent)",
          } as React.CSSProperties
        }
      >
        <Copy signedIn={signedIn} />
        <Rail />
        <div
          data-panel-wrap
          className="pointer-events-none relative min-h-[600px] animate-in delay-150 duration-700 ease-out fade-in-0 fill-mode-both motion-reduce:animate-none lg:absolute lg:inset-0 lg:min-h-0"
        >
          <Panel filter={filter} setFilter={pick} />
          <LowerRow filter={filter} setFilter={pick} flipFromRef={flipFrom} />
          {/* Top right: the theme and Log in buttons sit here until the
              header takes them. */}
          {/* Its outer corner follows the card's (44px less the 10px
              padding), or the square corner pokes past the curve. */}
          <Notch
            corner="tr"
            edge
            className="pointer-events-auto z-10 rounded-tr-[34px]"
          >
            <span ref={slotRef} className="block h-16 w-[178px]" />
          </Notch>
          {/* Bottom left: moves with the panel's left edge. */}
          <div
            data-bl
            className="pointer-events-auto absolute bottom-0 left-0 z-10 lg:left-[calc(50%+5px)]"
          >
            {/* In the card's corner on narrow screens (stacked). */}
            <Notch corner="bl" edge className="max-lg:rounded-bl-[34px]">
              <TodayCard left={left} />
            </Notch>
          </div>
          {/* Top left: the dashboard's title pill, once the morph is done. */}
          <div
            data-tl
            className="invisible absolute top-0 left-[86px] z-10 hidden lg:block"
          >
            <Notch corner="tl">
              <span className="flex h-16 items-center gap-2.5 rounded-[32px] bg-background pr-[26px] pl-6 whitespace-nowrap">
                <span className="text-xl font-medium tracking-[-0.01em]">
                  LeadFlow
                </span>
                <span className="text-[13px] text-muted-foreground">
                  Example data
                </span>
              </span>
            </Notch>
          </div>
        </div>
      </div>
    </section>
  )
}

function Copy({ signedIn }: { signedIn: boolean }) {
  return (
    <div
      data-copy
      className="flex min-w-0 flex-col gap-10 px-5 pt-8 pb-6 sm:px-11 sm:pt-10 lg:absolute lg:inset-y-0 lg:left-0 lg:w-1/2 lg:pr-12 lg:pb-9"
    >
      <Logo />
      <div className="flex flex-1 flex-col justify-center gap-[22px]">
        <span
          className={`${RISE} inline-flex items-center gap-2 self-start rounded-full bg-secondary px-3.5 py-2 text-[13px] font-medium`}
        >
          <span className="size-2 rounded-full bg-highlight" />
          Lead tracking for small sales teams
        </span>
        <h1 className="m-0 text-[44px] leading-[1.05] font-light tracking-[-0.03em] text-balance sm:text-[56px] lg:text-[46px] xl:text-[56px]">
          <span className="block overflow-hidden pb-[0.06em]">
            <span className={`${LINE} block delay-100`}>Every lead,</span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <span className={`${LINE} block text-muted-foreground delay-200`}>
              followed up on time.
            </span>
          </span>
        </h1>
        <p
          className={`${RISE} m-0 max-w-[440px] text-[17px] leading-[1.55] text-pretty text-muted-foreground delay-300`}
        >
          LeadFlow keeps your pipeline, today&apos;s calls and this week&apos;s
          revenue on one screen, so nobody waits for a callback that never
          comes.
        </p>
        <div className={`${RISE} flex flex-wrap gap-2 pt-1.5 delay-[400ms]`}>
          <ArrowLink
            href={signedIn ? "/dashboard" : "/auth?mode=register"}
            label={signedIn ? "Open dashboard" : "Create free account"}
            className="h-14 px-7 text-base"
          />
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault()
              scrollToId("features")
            }}
            className="flex h-14 items-center rounded-full bg-secondary px-[26px] text-base font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
          >
            See how it works
          </a>
        </div>
      </div>
      <div className={`${RISE} grid grid-cols-3 delay-500`}>
        {FACTS.map(([n, label]) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 border-l border-border py-0.5 pr-3 pl-4"
          >
            <span
              data-count={n}
              className="text-[30px] leading-[1.1] font-light tabular-nums"
            >
              {n}
            </span>
            <span className="text-[13px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** The orange pill with an arrow that slides out on hover. */
export function ArrowLink({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 rounded-full bg-primary font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover",
        className
      )}
    >
      {label}
      <ArrowRight
        size={18}
        strokeWidth={1.75}
        className="transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none"
      />
    </Link>
  )
}

const COUNT = Object.fromEntries(STAGE_COUNTS) as Record<Status, number>
const TOTAL = STAGE_COUNTS.reduce((a, [, n]) => a + n, 0)

/** Wide screens: the dashboard's lower row (the leads card and the orange
 *  filter card), rising in under the finished hero. Picking a status works
 *  as on the dashboard: the dark highlight slides to the chip, the count
 *  and the card's subtitle roll, and the rows glide to the new list while
 *  new ones fade in. Example data. */
function LowerRow({
  filter,
  setFilter,
  flipFromRef,
}: FilterProps & { flipFromRef: React.RefObject<Flip.FlipState | null> }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const rows = EXAMPLE_LEADS.filter(
    ([, , status]) => filter === "All" || status === filter
  )

  useGSAP(
    () => {
      const from = flipFromRef.current
      flipFromRef.current = null
      if (!from) return
      Flip.from(from, {
        targets: ref.current!.querySelectorAll("[data-flip-id]"),
        duration: 0.4,
        ease: "power3.inOut",
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.3, delay: 0.12, stagger: 0.04 }
          ),
      })
    },
    { scope: ref, dependencies: [filter] }
  )

  return (
    <div
      ref={ref}
      data-row
      className="pointer-events-auto absolute right-0 bottom-0 left-[86px] hidden h-(--row) gap-2.5 lg:flex"
    >
      <div className="invisible flex min-w-0 flex-1 flex-col gap-3.5 overflow-hidden rounded-[32px] bg-background p-6">
        <h3 className="m-0 text-2xl leading-[1.2] font-light">
          Leads
          <Roll
            text={filter === "All" ? "All statuses" : filter}
            className="grid! text-muted-foreground"
          />
        </h3>
        <div className="flex min-h-0 flex-col gap-1.5">
          {rows.map(([name, company, status, value]) => (
            <div
              key={name}
              data-flip-id={"row-" + name}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] bg-card px-4 py-2.5 transition-colors hover:bg-secondary"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {company}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setFilter(filter === status ? "All" : status)}
                className="flex cursor-pointer items-center gap-1.5 justify-self-start rounded-full border-0 bg-secondary px-2.5 py-[3px] text-xs font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
                title={`Show ${status} leads`}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: DOT[status] }}
                />
                {status}
              </button>
              <span className="text-[15px] font-light tabular-nums">
                {money(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="invisible flex w-[380px] flex-none flex-col gap-4 overflow-hidden rounded-[32px] bg-brand-surface p-6 text-brand-ink">
        <div className="flex items-start justify-between">
          <h3 className="m-0 text-2xl leading-[1.2] font-light">
            Filter
            <span className="block text-brand-ink/70">By status</span>
          </h3>
          <span className="text-sm tabular-nums">
            <Roll text={String(filter === "All" ? TOTAL : COUNT[filter])} />{" "}
            shown
          </span>
        </div>
        <div
          role="group"
          aria-label="Filter leads by status"
          className="flex flex-wrap gap-1.5"
        >
          {(["All", ...STAGE_COUNTS.map(([name]) => name)] as Filter[]).map(
            (name) => {
              const on = filter === name
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(name)}
                  className={cn(
                    "relative flex cursor-pointer items-center gap-1.5 rounded-full border border-brand-ink/25 bg-transparent px-3 py-1.5 text-[13px] font-medium transition-colors duration-200",
                    on
                      ? "border-transparent text-white"
                      : "text-brand-ink hover:bg-brand-ink/10"
                  )}
                >
                  {/* One dark highlight; Flip slides it between chips. */}
                  {on && (
                    <span
                      data-flip-id="chip"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-brand-ink"
                    />
                  )}
                  {name !== "All" && (
                    <span
                      className="relative size-2 rounded-full"
                      style={{ background: DOT[name] }}
                    />
                  )}
                  <span className="relative">
                    {name} {name === "All" ? TOTAL : COUNT[name]}
                  </span>
                </button>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}

/** The dark rail that slides in as the hero becomes the dashboard. */
function Rail() {
  return (
    <div
      data-rail
      aria-hidden
      className="dark invisible absolute inset-y-0 left-0 hidden w-[76px] flex-col gap-2 rounded-[38px] bg-background p-3 text-foreground lg:flex"
    >
      <span className="mb-1 grid size-13 place-items-center rounded-full bg-card">
        <span className="flex items-end gap-[3px]">
          <span className="h-2.5 w-1.5 rounded-[3px] bg-foreground" />
          <span className="h-4 w-1.5 rounded-[3px] bg-foreground" />
          <span className="h-[22px] w-1.5 rounded-[3px] bg-highlight" />
        </span>
      </span>
      {NAV.map(([label, Icon], i) => (
        <span
          key={label}
          className={cn(
            "grid h-13 place-items-center rounded-full",
            i === 0 ? "bg-foreground text-background" : "text-muted-foreground"
          )}
        >
          <Icon {...ic} />
        </span>
      ))}
    </div>
  )
}

/** The photo, the glass follow-up card, and under them the dashboard the
 *  panel turns into. Wide screens clip it to the right half to start. */
type Filter = "All" | Status
type FilterProps = { filter: Filter; setFilter: (f: Filter) => void }

function Panel(props: FilterProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const drift = React.useRef<((x: number, y: number) => void) | null>(null)

  // The glass card leans a little towards the cursor.
  useGSAP(
    () => {
      const card = ref.current?.querySelector("[data-drift]")
      if (!card || !matchMedia("(pointer: fine)").matches) return
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const opts = { duration: 0.6, ease: "power3.out" }
        const x = gsap.quickTo(card, "x", opts)
        const y = gsap.quickTo(card, "y", opts)
        drift.current = (px, py) => {
          x(px * 14)
          y(py * 10)
        }
        return () => {
          drift.current = null
        }
      })
    },
    { scope: ref }
  )

  return (
    <div
      ref={ref}
      data-panel
      onMouseMove={(e) => {
        const b = e.currentTarget.getBoundingClientRect()
        drift.current?.(
          ((e.clientX - b.left) / b.width - 0.5) * 2,
          ((e.clientY - b.top) / b.height - 0.5) * 2
        )
      }}
      onMouseLeave={() => drift.current?.(0, 0)}
      className="dark pointer-events-auto absolute inset-0 overflow-hidden rounded-[34px] bg-background text-foreground lg:[clip-path:inset(0px_0px_0px_calc(50%+5px)_round_34px)]"
    >
      <Dashboard {...props} />
      <div data-photo className="absolute inset-0 lg:left-[calc(50%+5px)]">
        <Image
          src={teamPhoto}
          alt="A small team talking around a meeting table with a laptop, coffee and notes"
          fill
          preload
          placeholder="blur"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-[center_20%]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[34px] ring-2 ring-(--photo-edge) ring-inset"
        />
      </div>
      <div
        data-glass
        className="absolute top-[100px] right-5 left-5 sm:right-6 sm:left-6 lg:left-[calc(50%+29px)]"
      >
        <div data-drift>
          <LiveCard />
        </div>
      </div>
    </div>
  )
}

function Dashboard({ filter, setFilter }: FilterProps) {
  return (
    <div className="absolute inset-0 flex flex-col px-5 pt-24 pb-6 sm:px-9 lg:bottom-[calc(var(--row)+10px)] lg:pt-[104px] lg:pr-9 lg:pl-[122px]">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-6">
          <h2
            data-dash-text
            className="m-0 text-[30px] leading-[1.15] font-light"
          >
            Pipeline
            <span className="block text-muted-foreground">Open deals</span>
          </h2>
          <span data-dash-text className="flex items-baseline gap-3">
            <span
              data-big
              className="text-[52px] leading-none font-light tracking-[-0.03em] tabular-nums sm:text-[72px] xl:text-[84px]"
            >
              {money(OPEN_VALUE)}
            </span>
            <span className="text-sm text-muted-foreground">open value</span>
          </span>
        </div>
        <div className="hidden flex-col gap-5 sm:flex">
          {[
            ["Conversion rate", "38%"],
            ["Avg. first response", "3h"],
            ["Active leads", "45"],
          ].map(([label, value]) => (
            <span
              key={label}
              data-dash-text
              className="flex flex-col gap-1.5 border-l border-muted-foreground/40 pl-4"
            >
              <span className="text-[13px] text-muted-foreground">{label}</span>
              <span className="text-[28px] leading-none font-light tabular-nums">
                {value}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-auto mb-[84px] flex h-[170px] items-end gap-2">
        {/* Tiles filter the leads card below, like its chips. */}
        {STAGE_COUNTS.map(([name, n]) => {
          const sel = filter === name
          return (
            <button
              key={name}
              type="button"
              aria-pressed={sel}
              aria-label={`Show ${name} leads`}
              onClick={() => setFilter(sel ? "All" : name)}
              className="group flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end gap-2.5 border-0 bg-transparent p-0 text-left text-foreground"
            >
              <span
                data-tile
                className={cn(
                  "flex min-h-12 items-start rounded-[20px] p-3 text-2xl font-light tabular-nums transition-[background-color,opacity] duration-250",
                  sel
                    ? "bg-primary text-primary-foreground"
                    : "bg-card group-hover:bg-secondary",
                  filter !== "All" && !sel && "opacity-45"
                )}
                style={{ height: `${(n / SMAX) * 100}%` }}
              >
                {n}
              </span>
              <span
                data-dash-text
                className="flex items-center gap-1.5 truncate text-xs font-medium"
              >
                <span
                  className="size-2 flex-none rounded-full"
                  style={{ background: DOT[name] }}
                />
                <span className="truncate">{name}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** "Next follow-up", in frosted glass over the photo. It steps through a
 *  few example leads; the bars at the bottom pick one. */
function LiveCard() {
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setInterval(() => setI((n) => (n + 1) % LIVE.length), 3200)
    return () => clearInterval(t)
  }, [i])
  const lead = LIVE[i]
  return (
    <div className="flex max-w-[400px] flex-col gap-3.5 rounded-[28px] glass p-5 text-white">
      <div className="flex items-center justify-between text-xs font-medium tracking-[0.02em]">
        <span className="opacity-85">Next follow-up · Example</span>
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] animate-pulse rounded-full bg-highlight motion-reduce:animate-none" />
          Live
        </span>
      </div>
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 flex-none place-items-center rounded-full bg-white/18 text-[15px] font-medium">
          <Roll text={lead.initials} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Roll text={lead.name} className="truncate text-xl font-light" />
          <Roll text={lead.company} className="text-[13px] opacity-75" />
        </span>
        <Roll
          text={money(lead.value)}
          className="text-xl font-light tabular-nums"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {lead.steps.map(([status, label, meta], k) => (
          <div
            key={k}
            className="flex items-center gap-2.5 rounded-full bg-white/12 px-3.5 py-[9px] text-[13px]"
          >
            <span
              className="size-2 flex-none rounded-full transition-colors duration-300"
              style={{ background: DOT[status] }}
            />
            <Roll text={label} className="min-w-0 flex-1" />
            <Roll text={meta} className="tabular-nums opacity-75" />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {LIVE.map((l, k) => (
          <button
            key={l.name}
            type="button"
            aria-label={`Show ${l.name}`}
            aria-pressed={k === i}
            onClick={() => setI(k)}
            className={cn(
              "h-1 cursor-pointer rounded-full border-0 p-0 transition-[flex-grow,background-color] duration-400 ease-out",
              k === i ? "grow-3 bg-white" : "grow bg-white/30 hover:bg-white/60"
            )}
          />
        ))}
      </div>
    </div>
  )
}

/** Today's follow-ups, in the photo's bottom-left notch. Ticking calls off in
 *  the tour below counts down here too. */
function TodayCard({ left }: { left: number }) {
  return (
    <div className="flex max-w-[calc(100vw-120px)] items-center gap-6 rounded-[28px] bg-background py-4 pr-4 pl-[22px]">
      <span className="flex min-w-0 flex-col gap-0.5 whitespace-nowrap">
        <span className="text-base font-medium">Today&apos;s Follow-ups</span>
        <span className="text-[13px] text-muted-foreground">
          <Roll text={String(left)} /> of {FOLLOWS.length} left · Example data
        </span>
      </span>
      {/* Phones: just the line of text. */}
      <span className="hidden flex-none sm:flex">
        {FOLLOWS.slice(0, 3).map(([, name, , status]) => (
          <span
            key={name}
            className="relative -ml-2 grid size-11 place-items-center rounded-full bg-card text-[13px] font-medium shadow-[0_0_0_3px_var(--background)] first:ml-0"
          >
            {name
              .split(" ")
              .map((w) => w[0])
              .join("")}
            <span
              className="absolute right-0 bottom-0 size-2.5 rounded-full shadow-[0_0_0_2px_var(--background)]"
              style={{ background: DOT[status] }}
            />
          </span>
        ))}
      </span>
    </div>
  )
}
