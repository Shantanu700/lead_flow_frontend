"use client"

import * as React from "react"
import { ArrowRight, Check } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { toast } from "sonner"

import { Notch } from "@/components/notch"
import { money } from "@/lib/format"
import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { DOT, FOLLOWS, STAGE_COUNTS, TABS, TIMELINE, WEEK } from "./data"
import { Roll, countUp } from "./motion"

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger)

const SMAX = Math.max(...STAGE_COUNTS.map(([, n]) => n))
const PIPE_TOTAL = 184200
const WMAX = Math.max(...WEEK.map(([, v]) => v))
const WEEK_TOTAL = WEEK.reduce((a, [, v]) => a + v, 0)

/** "One screen for the whole day": four example views, switched like the
 *  dashboard's tabs. On wide screens the card stays on screen while you
 *  scroll, and scrolling steps through the views; clicking a tab switches at
 *  once and glides the page to that view's place, so scrolling carries on
 *  from there. Narrower screens switch by tapping only. */
export function Tour({
  done,
  toggleDone,
}: {
  done: boolean[]
  toggleDone: (i: number) => void
}) {
  const root = React.useRef<HTMLDivElement>(null)
  const [tab, setTab] = React.useState(0)
  const [stage, setStage] = React.useState<number | null>(null)
  const [day, setDay] = React.useState<number | null>(null)
  const st = React.useRef<ScrollTrigger | null>(null)
  // A click's glide must not switch the view back on its way past.
  const gliding = React.useRef(false)
  const notchFrom = React.useRef<Flip.FlipState | null>(null)
  const current = React.useRef(0)
  const shown = React.useRef(-1)

  const select = React.useCallback((i: number) => {
    if (current.current === i) return
    current.current = i
    const pill = root.current?.querySelector("[data-tour-pill]")
    if (pill && !reduceMotion()) notchFrom.current = Flip.getState(pill)
    setTab(i)
  }, [])

  // Wide screens: hold the card while the page scrolls through four views.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add("(min-width: 1024px)", () => {
        const fills = gsap.utils.toArray<HTMLElement>(
          "[data-fill]",
          root.current
        )
        st.current = ScrollTrigger.create({
          trigger: root.current,
          // Centred below the floating header.
          start: "center center+=36",
          end: "+=1800",
          pin: true,
          pinSpacing: true, // the parent is a flex column (see hero.tsx)
          onUpdate: (self) => {
            const p = self.progress * TABS.length
            const i = Math.min(TABS.length - 1, Math.floor(p))
            fills.forEach((f, k) =>
              gsap.set(f, {
                scaleX: k < i ? 1 : k === i ? Math.min(1, p - i) : 0,
              })
            )
            if (!gliding.current) select(i)
          },
        })
        return () => {
          st.current = null
        }
      })
    },
    { scope: root }
  )

  const go = (i: number) => {
    select(i)
    const t = st.current
    if (!t) return
    gliding.current = true
    let settle: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(settle)
      settle = setTimeout(() => {
        gliding.current = false
        window.removeEventListener("scroll", onScroll)
      }, 140)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.scrollTo({
      top: t.start + ((t.end - t.start) * (i + 0.02)) / TABS.length,
      behavior: reduceMotion() ? "auto" : "smooth",
    })
    onScroll()
  }

  // A view change: the notch pill resizes to the new name (Flip), the name
  // rises into it, the old view leaves upwards and the new one comes in with
  // its bars growing and rows arriving in turn.
  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const views = q("[data-view]")
      const from = notchFrom.current
      notchFrom.current = null
      const was = shown.current
      shown.current = tab
      const view = views[tab]
      const motion = !reduceMotion()
      if (from) Flip.from(from, { duration: 0.45, ease: "power3.inOut" })
      if (!motion || was === tab) return
      // overwrite: a fast second switch kills the first one's tweens, so a
      // view still coming in can't finish visible over its successor.
      if (was >= 0)
        gsap.to(views[was], {
          y: -14,
          autoAlpha: 0,
          duration: 0.25,
          ease: "power2.in",
          overwrite: true,
        })
      gsap.fromTo(
        view,
        { y: was < 0 ? 0 : 18, autoAlpha: was < 0 ? 1 : 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.45,
          ease: "power3.out",
          delay: was < 0 ? 0 : 0.12,
          overwrite: true,
        }
      )
      gsap.fromTo(
        q("[data-tour-label]"),
        { yPercent: 100 },
        { yPercent: 0, duration: 0.45, ease: "power3.inOut" }
      )
      gsap.fromTo(
        view.querySelectorAll("[data-grow]"),
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.6,
          stagger: 0.05,
          delay: 0.2,
          ease: "power3.out",
          clearProps: "clipPath",
          overwrite: true,
        }
      )
      gsap.fromTo(
        view.querySelectorAll("[data-arrive]"),
        { x: -12, autoAlpha: 0 },
        {
          x: 0,
          autoAlpha: 1,
          duration: 0.45,
          stagger: 0.09,
          delay: 0.2,
          ease: "power3.out",
          overwrite: true,
        }
      )
      const big = view.querySelector("[data-tour-count]")
      if (big)
        countUp(big, Number((big as HTMLElement).dataset.tourCount), money, {
          delay: 0.15,
        })
    },
    { scope: root, dependencies: [tab] }
  )

  const left = done.filter((d) => !d).length

  return (
    <div
      ref={root}
      className="grid min-w-0 gap-2.5 lg:h-[min(600px,calc(100svh-120px))] lg:grid-cols-[minmax(300px,380px)_1fr]"
    >
      <div
        role="tablist"
        aria-label="LeadFlow views"
        className="flex min-w-0 gap-1.5 overflow-x-auto px-2 pb-1 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-4"
      >
        {TABS.map((t, i) => {
          const on = i === tab
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              id={`tour-tab-${i}`}
              aria-selected={on}
              aria-controls="tour-panel"
              onClick={() => go(i)}
              className={cn(
                "relative flex flex-none cursor-pointer flex-col rounded-[28px] border-0 px-5 py-4 text-left text-foreground transition-colors duration-300 lg:px-6 lg:py-[22px]",
                on ? "bg-background" : "bg-transparent hover:bg-secondary"
              )}
            >
              <span className="flex w-full items-center gap-3.5">
                <span className="hidden w-[22px] text-[13px] font-medium text-muted-foreground tabular-nums lg:inline">
                  0{i + 1}
                </span>
                <span className="flex-1 text-base font-light whitespace-nowrap lg:text-xl">
                  {t.label}
                </span>
                <span
                  className={cn(
                    "hidden size-9 place-items-center rounded-full transition-colors duration-300 lg:grid",
                    on
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <ArrowRight size={18} strokeWidth={1.75} />
                </span>
              </span>
              {/* The description opens under the active tab. */}
              <span
                className={cn(
                  "hidden transition-[grid-template-rows,opacity] duration-400 ease-drawer lg:grid",
                  on
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                )}
              >
                <span className="overflow-hidden">
                  <span className="block pt-2.5 pl-9 text-sm leading-[1.55] text-muted-foreground">
                    {t.desc}
                  </span>
                </span>
              </span>
              {/* How far the scroll has got through this view. */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-6 bottom-0 hidden h-0.5 overflow-hidden rounded-full bg-border lg:block",
                  !on && "opacity-0"
                )}
              >
                <span
                  data-fill
                  className="block h-full origin-left scale-x-0 bg-highlight"
                />
              </span>
            </button>
          )
        })}
      </div>

      <div
        id="tour-panel"
        role="tabpanel"
        aria-labelledby={`tour-tab-${tab}`}
        className="relative min-h-[520px] min-w-0"
      >
        <div className="dark absolute inset-0 overflow-hidden rounded-[32px] bg-background text-foreground">
          <View on={tab === 0}>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                Open pipeline
              </span>
              <span className="text-5xl leading-none font-light tracking-[-0.03em] tabular-nums">
                {stage === null ? (
                  <span data-tour-count={PIPE_TOTAL}>{money(PIPE_TOTAL)}</span>
                ) : (
                  <Roll
                    text={`${STAGE_COUNTS[stage][1]} in ${STAGE_COUNTS[stage][0]}`}
                  />
                )}
              </span>
            </div>
            <div className="mt-auto flex h-60 items-end gap-2">
              {STAGE_COUNTS.map(([name, n], i) => {
                const sel = stage === i
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setStage(sel ? null : i)}
                    className="group flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end gap-2.5 border-0 bg-transparent p-0 text-left text-foreground"
                  >
                    <span
                      data-grow
                      className={cn(
                        "flex min-h-12 items-start rounded-[18px] px-2.5 py-3 text-2xl font-light tabular-nums transition-[background-color,opacity] duration-250",
                        sel
                          ? "bg-primary text-primary-foreground"
                          : "bg-card group-hover:bg-secondary",
                        stage !== null && !sel && "opacity-45"
                      )}
                      style={{ height: `${(n / SMAX) * 100}%` }}
                    >
                      {n}
                    </span>
                    <span className="flex w-full flex-col items-start gap-1.5 text-[11px] leading-[1.2] font-medium sm:text-xs">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: DOT[name] }}
                      />
                      <span className="w-full truncate sm:whitespace-normal">
                        {name}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </View>

          <View on={tab === 1}>
            <h3 className="m-0 mb-5 text-[26px] leading-[1.15] font-light">
              Today&apos;s
              <span className="block text-muted-foreground">
                Follow-ups · <Roll text={String(left)} /> left
              </span>
            </h3>
            <div className="flex flex-col gap-1.5">
              {FOLLOWS.map(([time, name, company, status], i) => {
                const d = done[i]
                return (
                  <div
                    key={name}
                    data-arrive
                    className={cn(
                      "flex items-center gap-3.5 rounded-full bg-card py-3 pr-3 pl-[18px] transition-opacity duration-300",
                      d && "opacity-60"
                    )}
                  >
                    <span className="w-16 flex-none text-[13px] text-muted-foreground tabular-nums">
                      {time}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          d && "line-through"
                        )}
                      >
                        {name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {company}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium whitespace-nowrap sm:inline-flex">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: DOT[status] }}
                      />
                      {status}
                    </span>
                    <button
                      type="button"
                      aria-label={
                        d ? `Mark ${name} not done` : `Mark ${name} done`
                      }
                      aria-pressed={d}
                      onClick={() => {
                        toggleDone(i)
                        if (!d) toast.success("Follow-up marked done.")
                      }}
                      className={cn(
                        "grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.94] motion-reduce:active:scale-100",
                        d
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Check size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                )
              })}
            </div>
          </View>

          <View on={tab === 2}>
            <div className="flex flex-col gap-2.5">
              <span className="flex items-center gap-2.5 text-[15px] font-medium">
                <span className="size-2 rounded-full bg-highlight" />
                Revenue won
                <span className="font-normal text-muted-foreground">
                  · This week
                </span>
              </span>
              <span
                data-tour-count={WEEK_TOTAL}
                className="text-[56px] leading-none font-light tracking-[-0.03em] tabular-nums"
              >
                {money(WEEK_TOTAL)}
              </span>
              <span className="text-[13px] text-muted-foreground">
                <Roll
                  text={
                    day === null
                      ? "Point at a day"
                      : `${WEEK[day][0]} · ${money(WEEK[day][1])}`
                  }
                />
              </span>
            </div>
            <div className="mt-auto flex h-[220px] items-end gap-2">
              {WEEK.map(([d, v], i) => (
                <button
                  key={d}
                  type="button"
                  aria-label={`${d}: ${money(v)}`}
                  onMouseEnter={() => setDay(i)}
                  onFocus={() => setDay(i)}
                  onMouseLeave={() => setDay(null)}
                  onBlur={() => setDay(null)}
                  className="group flex h-full min-w-0 flex-1 cursor-default flex-col justify-end gap-2.5 border-0 bg-transparent p-0 text-foreground"
                >
                  <span
                    data-grow
                    className={cn(
                      "block min-h-2.5 rounded-[14px] transition-colors duration-200",
                      v === WMAX
                        ? "bg-primary"
                        : "bg-card group-hover:bg-secondary"
                    )}
                    style={{ height: `${(v / WMAX) * 100}%` }}
                  />
                  <span className="text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </span>
                </button>
              ))}
            </div>
          </View>

          <View on={tab === 3}>
            <h3 className="m-0 mb-6 text-[26px] leading-[1.15] font-light">
              Priya Sharma
              <span className="block text-muted-foreground">Acme Corp</span>
            </h3>
            <ol className="m-0 flex list-none flex-col p-0">
              {TIMELINE.map(([title, meta, status], i) => (
                <li key={title} data-arrive className="flex gap-4">
                  <span className="flex w-3 flex-none flex-col items-center">
                    <span
                      className="mt-[5px] size-2.5 rounded-full"
                      style={{ background: DOT[status] }}
                    />
                    {i < TIMELINE.length - 1 && (
                      <span className="w-px flex-1 bg-border" />
                    )}
                  </span>
                  <span className="flex flex-col gap-0.5 pb-[22px]">
                    <span className="text-[15px] font-medium">{title}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {meta}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </View>
        </div>

        {/* Top-left notch: the active view's name. The pill resizes to it. */}
        <Notch corner="tl" className="z-10 flex">
          <span
            data-tour-pill
            className="flex h-16 items-center gap-2.5 overflow-hidden rounded-[32px] bg-background px-6 whitespace-nowrap"
          >
            <span className="size-2 flex-none rounded-full bg-highlight" />
            <span className="overflow-hidden">
              <span
                key={tab}
                data-tour-label
                className="block text-base font-medium"
              >
                {TABS[tab].label}
              </span>
            </span>
          </span>
        </Notch>
      </div>
    </div>
  )
}

function View({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <div
      data-view
      inert={!on}
      aria-hidden={!on}
      className={cn(
        "absolute inset-0 flex flex-col px-6 pt-24 pb-6 sm:px-8 sm:pb-8",
        !on && "invisible"
      )}
    >
      {children}
    </div>
  )
}
