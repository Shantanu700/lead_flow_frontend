"use client"

import * as React from "react"
import { ArrowRight, Check, Phone } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { toast } from "sonner"

import { Segmented } from "@/components/dashboard/segmented"
import { Notch } from "@/components/notch"
import { money } from "@/lib/format"
import { reduceMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"
import {
  DOT,
  EXAMPLE_LEADS,
  FOLLOWS,
  OVERDUE,
  REPORTS,
  STAGE_COUNTS,
  TABS,
  TIMELINE,
  type Period,
} from "./data"
import { Line, Roll, countUp } from "./motion"

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger)

const SMAX = Math.max(...STAGE_COUNTS.map(([, n]) => n))
const PIPE_TOTAL = 184200
const LEADS = STAGE_COUNTS.reduce((a, [, n]) => a + n, 0)
const PERIODS = Object.keys(REPORTS) as Period[]

/** "One screen for the whole day": four example views, switched like the
 *  dashboard's tabs. On wide screens the whole section is a screen-sized
 *  card held while you scroll, and scrolling steps through the views;
 *  clicking a tab switches at once and glides the page to that view's place,
 *  so scrolling carries on from there. Narrower screens switch by tapping. */
export function Tour({
  done,
  toggleDone,
}: {
  done: boolean[]
  toggleDone: (i: number) => void
}) {
  const root = React.useRef<HTMLElement>(null)
  const [tab, setTab] = React.useState(0)
  const [stage, setStage] = React.useState<number | null>(null)
  const [day, setDay] = React.useState<number | null>(null)
  const [period, setPeriod] = React.useState<Period>("Week")
  const [overdueDone, setOverdueDone] = React.useState(false)
  const [notes, setNotes] = React.useState<string[]>([])
  const [draft, setDraft] = React.useState("")
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

  // Wide screens: hold the section while the page scrolls through four views.
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
          start: "top 8px",
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
  // its bars growing and rows arriving in turn. overwrite: a fast second
  // switch kills the first one's tweens, so a view still coming in can't
  // finish visible over its successor.
  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const views = q("[data-view]")
      const from = notchFrom.current
      notchFrom.current = null
      const was = shown.current
      shown.current = tab
      const view = views[tab]
      if (from) Flip.from(from, { duration: 0.45, ease: "power3.inOut" })
      if (reduceMotion() || was === tab) return
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
      grow(view.querySelectorAll("[data-grow]"), 0.2)
      gsap.fromTo(
        view.querySelectorAll("[data-arrive]"),
        { x: -12, autoAlpha: 0 },
        {
          x: 0,
          autoAlpha: 1,
          duration: 0.45,
          stagger: 0.07,
          delay: 0.2,
          ease: "power3.out",
          overwrite: true,
        }
      )
      view
        .querySelectorAll<HTMLElement>("[data-tour-count]")
        .forEach((el) =>
          countUp(el, Number(el.dataset.tourCount), money, { delay: 0.15 })
        )
    },
    { scope: root, dependencies: [tab] }
  )

  // Reports: a new period rolls its figures (Roll) and regrows its bars.
  useGSAP(
    () => {
      if (shown.current !== 2 || reduceMotion()) return
      grow(root.current!.querySelectorAll("[data-view='2'] [data-grow]"), 0)
    },
    { scope: root, dependencies: [period] }
  )

  const left = done.filter((d) => !d).length
  const rep = REPORTS[period]
  const repTotal = rep.bars.reduce((a, [, v]) => a + v, 0)
  const repMax = Math.max(...rep.bars.map(([, v]) => v))
  const inStage =
    stage === null
      ? []
      : EXAMPLE_LEADS.filter(([, , s]) => s === STAGE_COUNTS[stage][0])
  const timeline = [
    ...notes.map((n) => [n, "Note · just now", "Proposal Sent"] as const),
    ...[...TIMELINE].reverse(),
  ]

  return (
    <section
      ref={root}
      id="features"
      className="flex w-full flex-col gap-2.5 rounded-[44px] bg-card p-2.5 lg:h-[max(640px,calc(100svh-16px))]"
    >
      {/* Clear of the floating header while the section is held. */}
      <div className="flex flex-wrap items-end justify-between gap-6 px-5 pt-8 pb-3 sm:px-9 lg:pt-[72px]">
        <h2
          data-reveal
          className="m-0 text-[32px] leading-[1.1] font-light tracking-[-0.02em] sm:text-[40px]"
        >
          <Line>One screen for the whole day</Line>
          <Line muted>Four views, no page loads.</Line>
        </h2>
        <p
          data-reveal
          className="m-0 max-w-[360px] text-[15px] leading-[1.55] text-muted-foreground"
        >
          Pick a view, or keep scrolling. Everything here is example data and
          nothing is saved.
        </p>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 gap-2.5 lg:grid-cols-[minmax(300px,380px)_1fr]">
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
          className="relative min-h-[820px] min-w-0 sm:min-h-[640px] lg:min-h-0"
        >
          <div className="dark absolute inset-0 overflow-hidden rounded-[32px] bg-background text-foreground">
            {/* Pipeline */}
            <View i={0} on={tab === 0}>
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted-foreground">
                    Open pipeline
                  </span>
                  <span className="text-5xl leading-none font-light tracking-[-0.03em] tabular-nums">
                    {stage === null ? (
                      <span data-tour-count={PIPE_TOTAL}>
                        {money(PIPE_TOTAL)}
                      </span>
                    ) : (
                      <Roll
                        text={`${STAGE_COUNTS[stage][1]} in ${STAGE_COUNTS[stage][0]}`}
                      />
                    )}
                  </span>
                </div>
                <Callouts
                  className="max-lg:flex-row max-lg:flex-wrap"
                  items={[
                    ["Leads", String(LEADS)],
                    ["Avg. deal", money(41000)],
                    ["Won this month", money(205000)],
                  ]}
                />
              </div>
              {/* Who is in the tapped stage. */}
              <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 pt-6">
                {stage === null ? (
                  <span
                    data-arrive
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="size-1.5 animate-pulse rounded-full bg-highlight motion-reduce:animate-none" />
                    Tap a stage to see who is in it
                  </span>
                ) : (
                  inStage.map(([name, company, , value]) => (
                    <span
                      key={name}
                      className="flex animate-in items-center gap-2.5 rounded-full bg-card py-1.5 pr-3.5 pl-1.5 text-[13px] duration-300 fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
                    >
                      <Initials name={name} />
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">
                        {company} · {money(value)}
                      </span>
                    </span>
                  ))
                )}
              </div>
              <div className="mt-auto flex h-[46%] min-h-[180px] items-end gap-2 pt-6">
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

            {/* Follow-ups */}
            <View i={1} on={tab === 1}>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <h3 className="m-0 text-[26px] leading-[1.15] font-light">
                  Today&apos;s
                  <span className="block text-muted-foreground">
                    Follow-ups · <Roll text={String(left)} /> left
                  </span>
                </h3>
                {/* Done today, as a bar that fills as you tick. */}
                <span className="flex w-[200px] flex-col gap-2 text-[13px] text-muted-foreground">
                  <span className="flex justify-between">
                    Done today
                    <span className="text-foreground tabular-nums">
                      <Roll text={String(FOLLOWS.length - left)} /> of{" "}
                      {FOLLOWS.length}
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-card">
                    <span
                      className="block h-full origin-left rounded-full bg-highlight transition-transform duration-500 ease-out"
                      style={{
                        transform: `scaleX(${(FOLLOWS.length - left) / FOLLOWS.length})`,
                      }}
                    />
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {FOLLOWS.map(([time, name, company, status], i) => {
                  const d = done[i]
                  return (
                    <div
                      key={name}
                      data-arrive
                      className={cn(
                        "flex items-center gap-3.5 rounded-full bg-card py-2.5 pr-2.5 pl-[18px] transition-opacity duration-300",
                        d && "opacity-60"
                      )}
                    >
                      <span className="w-16 flex-none text-[13px] text-muted-foreground tabular-nums">
                        {time}
                      </span>
                      <Initials name={name} />
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
              {/* The one overdue call, as on the dashboard's attention card. */}
              <div
                data-arrive
                className="mt-auto flex items-center gap-4 rounded-[28px] bg-attention p-5 text-attention-foreground"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[13px] font-medium">
                    <Roll text={overdueDone ? "Caught up" : "Overdue"} />
                  </span>
                  <span className="truncate text-xl font-light">
                    {OVERDUE.name}
                    <span className="text-attention-foreground/70">
                      {" "}
                      · {OVERDUE.company}
                    </span>
                  </span>
                  <span className="truncate text-[13px] text-attention-foreground/70">
                    <Roll
                      text={
                        overdueDone
                          ? "Called back · moved off the overdue list"
                          : OVERDUE.note
                      }
                    />
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOverdueDone((v) => !v)
                    if (!overdueDone) toast.success("Marked as called back.")
                  }}
                  className={cn(
                    "flex h-11 flex-none cursor-pointer items-center gap-2 rounded-full border-0 px-5 text-sm font-medium transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] motion-reduce:active:scale-100",
                    overdueDone
                      ? "bg-attention-foreground/10 text-attention-foreground"
                      : "bg-attention-foreground text-attention"
                  )}
                >
                  {overdueDone ? (
                    <Check size={16} strokeWidth={1.75} />
                  ) : (
                    <Phone size={16} strokeWidth={1.75} />
                  )}
                  {overdueDone ? "Done" : "Called back"}
                </button>
              </div>
            </View>

            {/* Reports */}
            <View i={2} on={tab === 2}>
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex flex-col gap-2.5">
                  <span className="flex items-center gap-2.5 text-[15px] font-medium">
                    <span className="size-2 rounded-full bg-highlight" />
                    Revenue won
                    <span className="font-normal text-muted-foreground">
                      · This <Roll text={period.toLowerCase()} />
                    </span>
                  </span>
                  <span className="text-[56px] leading-none font-light tracking-[-0.03em] tabular-nums">
                    <Roll text={money(repTotal)} />
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    <Roll
                      text={
                        day === null || !rep.bars[day]
                          ? "Point at a bar"
                          : `${rep.bars[day][0]} · ${money(rep.bars[day][1])}`
                      }
                    />
                  </span>
                </div>
                <div className="flex flex-col items-end gap-5">
                  <Segmented
                    aria-label="Report period"
                    className="h-12 bg-card p-1"
                    itemClass="h-10 px-4 text-sm"
                    options={PERIODS}
                    value={period}
                    onChange={(p) => {
                      setDay(null)
                      setPeriod(p)
                    }}
                  />
                  <Callouts
                    row
                    items={[
                      ["Deals won", String(rep.deals)],
                      ["Avg. deal", money(repTotal / rep.deals)],
                      ["Win rate", rep.winRate + "%"],
                    ]}
                  />
                </div>
              </div>
              <div className="mt-auto flex h-[48%] min-h-[180px] items-end gap-2 pt-6">
                {rep.bars.map(([d, v], i) => (
                  <button
                    key={period + d}
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
                        v === repMax
                          ? "bg-primary"
                          : "bg-card group-hover:bg-secondary"
                      )}
                      style={{ height: `${(v / repMax) * 100}%` }}
                    />
                    <span className="text-center text-xs font-medium text-muted-foreground">
                      {d}
                    </span>
                  </button>
                ))}
              </div>
            </View>

            {/* Lead timeline */}
            <View i={3} on={tab === 3}>
              <div className="grid min-h-0 flex-1 gap-6 max-lg:grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
                <div className="flex min-h-0 flex-col">
                  <h3 className="m-0 mb-6 text-[26px] leading-[1.15] font-light">
                    Priya Sharma
                    <span className="block text-muted-foreground">
                      Acme Corp
                    </span>
                  </h3>
                  <ol className="m-0 flex min-h-0 list-none flex-col overflow-hidden p-0">
                    {timeline.map(([title, meta, status], i) => (
                      <li
                        key={title + meta}
                        data-arrive
                        className={cn(
                          "flex gap-4",
                          i < notes.length &&
                            "animate-in duration-400 fade-in-0 slide-in-from-top-2 motion-reduce:animate-none"
                        )}
                      >
                        <span className="flex w-3 flex-none flex-col items-center">
                          <span
                            className={cn(
                              "mt-[5px] size-2.5 rounded-full",
                              i === 0 &&
                                "shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
                            )}
                            style={{
                              background:
                                i === 0 ? "var(--primary)" : DOT[status],
                            }}
                          />
                          {i < timeline.length - 1 && (
                            <span className="w-px flex-1 bg-border" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5 pb-[22px]">
                          <span className="truncate text-[15px] font-medium">
                            {title}
                          </span>
                          <span className="text-[13px] text-muted-foreground">
                            {meta}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                {/* The lead, and a note box that adds to the timeline. */}
                <div
                  data-arrive
                  className="flex flex-col gap-4 self-start rounded-[28px] bg-card p-5"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: DOT["Proposal Sent"] }}
                      />
                      Proposal Sent
                    </span>
                    <span className="text-2xl font-light tabular-nums">
                      {money(48000)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 rounded-full bg-primary/12 px-3.5 py-2 text-xs font-medium text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Follow-up tomorrow, 11:30 am
                  </span>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const text = draft.trim()
                      if (!text) return
                      setNotes((n) => [text, ...n])
                      setDraft("")
                      toast.success("Note added. (Example only, not saved.)")
                    }}
                    className="flex flex-col gap-2"
                  >
                    <label htmlFor="tour-note" className="sr-only">
                      Add a note
                    </label>
                    <textarea
                      id="tour-note"
                      rows={3}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="What was discussed?"
                      className="w-full resize-none rounded-[18px] border border-transparent bg-input/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className="h-11 cursor-pointer rounded-full border-0 bg-primary text-sm font-medium text-primary-foreground transition-[background-color,opacity] duration-200 hover:bg-primary-hover disabled:cursor-default disabled:opacity-50"
                    >
                      Add note
                    </button>
                  </form>
                </div>
              </div>
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
    </section>
  )
}

/** Bars rise from their baseline (clip, like the dashboard's charts). */
function grow(els: NodeListOf<Element>, delay: number) {
  if (!els.length) return // Follow-ups and Timeline have no bars
  gsap.fromTo(
    els,
    { clipPath: "inset(100% 0% 0% 0%)" },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: 0.6,
      stagger: 0.05,
      delay,
      ease: "power3.out",
      clearProps: "clipPath",
      overwrite: true,
    }
  )
}

function View({
  i,
  on,
  children,
}: {
  i: number
  on: boolean
  children: React.ReactNode
}) {
  return (
    <div
      data-view={i}
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

/** Figures with a thin rule on the left, as on the dashboard's hero. */
function Callouts({
  items,
  row,
  className,
}: {
  items: string[][]
  row?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex gap-x-6 gap-y-4",
        row ? "flex-row" : "flex-col",
        className
      )}
    >
      {items.map(([label, value]) => (
        <span
          key={label}
          data-arrive
          className="flex flex-col gap-1.5 border-l border-muted-foreground/40 pl-4"
        >
          <span className="text-[13px] text-muted-foreground">{label}</span>
          <span className="text-2xl leading-none font-light tabular-nums">
            <Roll text={value} />
          </span>
        </span>
      ))}
    </div>
  )
}

function Initials({ name }: { name: string }) {
  return (
    <span className="grid size-8 flex-none place-items-center rounded-full bg-secondary text-[11px] font-medium">
      {name
        .split(" ")
        .map((w) => w[0])
        .join("")}
    </span>
  )
}
