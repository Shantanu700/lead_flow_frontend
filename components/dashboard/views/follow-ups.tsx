"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { Notch } from "@/components/notch"
import { cn } from "@/lib/utils"
import { byDay, hhmm, overdueNote } from "@/lib/format"
import { Avatar } from "@/components/dashboard/atoms"
import { Hero, Title } from "@/components/dashboard/hero"
import { sm } from "@/components/dashboard/icons"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

import {
  Actions,
  AddButton,
  BellButton,
  RailNotch,
  StripArrow,
} from "@/components/dashboard/chrome"
import { useDash } from "@/components/dashboard/context"

/** The Follow-ups tab: today's strip, done-today notch, upcoming and overdue lists. */
export function FollowUpsView() {
  const {
    pageStyle,
    phone,
    stripRef,
    today,
    overdue,
    upcoming,
    cw,
    stackedRows,
    todayShort,
    fuLeft,
    openLead,
    toggleFu,
    readStrip,
  } = useDash()
  return (
    <div
      className="flex min-h-0 min-w-0 flex-col gap-2.5"
      style={{ ...pageStyle, minHeight: 480 + 230 }}
    >
      <div className="relative min-w-0" style={{ minHeight: 480 }}>
        <Hero padding={phone ? "80px 20px 106px" : "104px 36px 118px"}>
          <h1
            data-roll="h1"
            className="m-0 text-[30px] leading-[1.15] font-light"
          >
            Today
            <span className="block text-muted-foreground">{todayShort}</span>
          </h1>
          <div className="min-h-6 flex-1" />
          {/* One row at a fixed height: more follow-ups scroll
            sideways (snapping to tiles) instead of growing the
            panel. The corner arrows page through it. */}
          <div
            ref={stripRef}
            onScroll={readStrip}
            className="flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
          >
            {today.length === 0 && (
              <div className="flex h-[150px] w-full items-center rounded-[20px] bg-card px-5 text-sm text-muted-foreground">
                No follow-ups today.
              </div>
            )}
            {today.map((l) => (
              <button
                key={l.id}
                data-fu-done={l.follow_up_done_at ? true : undefined}
                onClick={() => toggleFu(l)}
                title={
                  l.follow_up_done_at ? "Mark as not done" : "Mark as done"
                }
                className={cn(
                  "box-border flex h-[150px] min-w-0 flex-none cursor-pointer snap-start flex-col justify-between gap-[22px] rounded-[20px] border-0 p-4 text-left transition-colors duration-200",
                  l.follow_up_done_at
                    ? "bg-foreground text-background"
                    : "bg-card text-foreground"
                )}
                style={{
                  width:
                    cw < 1014
                      ? "calc((100% - 8px) / 2)"
                      : "calc((100% - 24px) / 4)",
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[28px] leading-none font-light tabular-nums">
                    {hhmm(l.next_follow_up_at)}
                  </span>
                  <span
                    className={cn(
                      "grid size-[30px] flex-none place-items-center rounded-full",
                      l.follow_up_done_at
                        ? "bg-background text-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Check {...sm} />
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{l.name}</span>
                  <span className="truncate text-xs opacity-70">
                    {l.last_note?.note ?? "Follow up"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Hero>
        <RailNotch title={"Follow-ups"} sub={`${fuLeft} left today`} />
        {/* Phones swipe the strip instead. */}
        {!phone && <StripArrow dir={-1} />}
        {!phone && <StripArrow dir={1} />}
        <Notch corner="b">
          <div className="box-border flex w-[280px] items-center justify-between gap-3 rounded-[28px] bg-attention px-[22px] py-4 text-attention-foreground">
            <span className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium">Done today</span>
              <span className="text-[13px] opacity-70">
                {fuLeft} still to go
              </span>
            </span>
            <span className="text-[40px] leading-none font-light tabular-nums">
              {today.length - fuLeft}/{today.length}
            </span>
          </div>
        </Notch>
        <Notch corner="tr" className="flex items-center gap-2">
          <BellButton />
          <Actions orange={<AddButton />} />
        </Notch>
      </div>

      <div
        className="grid min-h-0 flex-1 gap-2.5"
        style={{
          gridTemplateColumns:
            cw < 1014 ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(0,1fr)",
          gridTemplateRows: phone
            ? stackedRows(2)
            : cw < 1014
              ? "minmax(0,1fr) minmax(0,1fr)"
              : "minmax(0,1fr)",
        }}
      >
        <section className="flex min-h-0 min-w-0 flex-col gap-[18px] overflow-y-auto rounded-xl bg-background p-6">
          <Title title="Upcoming" sub="Next 7 days" />
          {upcoming.length === 0 && (
            <span className="px-1 text-sm text-muted-foreground">
              Nothing scheduled for the next 7 days.
            </span>
          )}
          {byDay(upcoming).map(([day, items]) => (
            <div key={day} className="flex flex-col gap-1.5">
              <span className="px-1 text-xs font-medium text-muted-foreground">
                {day}
              </span>
              {items.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openLead(u.id)}
                  className="flex cursor-pointer items-center gap-3 rounded-[18px] border-0 bg-card py-3 pr-4 pl-3.5 text-left text-foreground hover:bg-secondary"
                >
                  <Avatar name={u.name} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {u.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {u.last_note?.note ?? u.company}
                    </span>
                  </span>
                  <span className="text-[15px] font-light tabular-nums">
                    {hhmm(u.next_follow_up_at)}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </section>
        <section className="flex min-h-0 min-w-0 flex-col gap-[18px] overflow-y-auto rounded-xl bg-attention p-6 text-attention-foreground">
          <div className="flex items-start justify-between">
            <Title title="Overdue" sub="Needs a reply" subClass="opacity-70" />
            <span className="text-[44px] leading-none font-light tabular-nums">
              {overdue.length}
            </span>
          </div>
          {overdue.length === 0 && (
            <span className="text-sm opacity-70">Nothing overdue.</span>
          )}
          {overdue.map((o) => (
            <button
              key={o.id}
              onClick={() => openLead(o.id)}
              className="flex cursor-pointer flex-col gap-0.5 border-0 border-t border-attention-foreground/20 bg-transparent px-0 pt-3.5 pb-0 text-left text-attention-foreground"
            >
              <span className="text-lg font-light">{o.name}</span>
              <span className="text-sm opacity-70">{overdueNote(o)}</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}
