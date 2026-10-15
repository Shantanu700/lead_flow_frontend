"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { Notch } from "@/components/notch"
import { cn } from "@/lib/utils"
import { ago, hhmm, lastAt, money, overdueNote, pct } from "@/lib/format"
import { CHIPS, DOT, STAGES } from "@/lib/leads"
import { Avatar, Dot } from "@/components/dashboard/atoms"
import { AttentionButton, RoundButton } from "@/components/dashboard/buttons"
import { Hero, Title } from "@/components/dashboard/hero"
import { ic, sm } from "@/components/dashboard/icons"
import { LeadTable } from "@/components/dashboard/lead-table"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

import {
  Actions,
  AddButton,
  BellButton,
  BigNumber,
  Callouts,
  RailNotch,
} from "@/components/dashboard/chrome"
import { useDash } from "@/components/dashboard/context"

/** The Dashboard tab: pipeline hero, overdue card, today's follow-ups, filter and recent leads. */
export function OverviewView() {
  const {
    phone,
    filter,
    od,
    list,
    dash,
    today,
    overdue,
    setPalette,
    odRef,
    go,
    narrow,
    compact,
    odW,
    heroH,
    heroPad,
    btnSize,
    todayShort,
    fuLeft,
    odLead,
    filterLabel,
    countOf,
    pickFilter,
    openLead,
    toggleFu,
    stepOd,
    counts,
    max,
  } = useDash()
  return (
    <>
      {/* Hero */}
      <div className="relative min-w-0" style={{ minHeight: heroH }}>
        <Hero padding={heroPad}>
          <div className="flex flex-wrap justify-between gap-6">
            <div className="flex flex-col gap-3.5">
              <h1
                data-roll="h1"
                className="m-0 text-[30px] leading-[1.15] font-light"
              >
                Pipeline
                <span className="block text-muted-foreground">Open deals</span>
              </h1>
              <div className="flex items-baseline gap-3">
                <BigNumber value={money(dash?.open_value ?? 0)} />
                <span className="text-[15px] font-medium text-muted-foreground">
                  open value
                </span>
              </div>
            </div>
            <Callouts
              items={[
                {
                  value: pct(dash?.conversion_rate),
                  label: "Conversion rate",
                },
                {
                  value:
                    dash?.avg_first_response_hours == null
                      ? "—"
                      : dash.avg_first_response_hours + "h",
                  label: "Avg. first response",
                },
                {
                  value: String(dash?.active_leads ?? 0),
                  label: "Active leads",
                },
              ]}
            />
          </div>
          <div className="min-h-10 flex-1" />
          <div
            className={cn(
              "box-content flex h-[220px] flex-none items-end",
              phone ? "gap-1.5" : "gap-2"
            )}
            style={{
              paddingRight: narrow ? 0 : odW + 10,
              paddingBottom: narrow ? 150 : 0,
            }}
          >
            {STAGES.map(([name, dot]) => {
              const on = filter === name
              const dim = filter !== "All" && !on
              return (
                <button
                  key={name}
                  onClick={() => pickFilter(on ? "All" : name)}
                  aria-pressed={on}
                  aria-label={name}
                  title={name}
                  className="flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end gap-2.5 border-0 bg-transparent p-0 text-left text-foreground"
                >
                  <div
                    data-bar
                    className={cn(
                      "box-border flex min-h-14 items-start rounded-[20px] py-3 transition-[opacity,background] duration-200",
                      phone ? "justify-center px-1" : "px-3.5",
                      on ? "bg-foreground" : "bg-card",
                      dim && "opacity-45"
                    )}
                    style={{
                      height: Math.max(22, (counts[name] / max) * 100) + "%",
                    }}
                  >
                    <span
                      className={cn(
                        "font-light tabular-nums",
                        phone ? "text-xl" : "text-[28px]",
                        on ? "text-background" : "text-foreground"
                      )}
                    >
                      {counts[name]}
                    </span>
                  </div>
                  {/* Phones: the dot alone (the Filter card names them). */}
                  <span
                    className={cn(
                      "flex items-center gap-1.5 overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap",
                      phone && "justify-center"
                    )}
                  >
                    <Dot color={dot} />
                    {!phone && name}
                  </span>
                </button>
              )
            })}
          </div>
        </Hero>

        <RailNotch title={"LeadFlow"} sub={todayShort} />

        <Notch corner="tr" className="flex items-center gap-2">
          {(!narrow || phone) && (
            <RoundButton
              className={btnSize}
              data-flip-id="btn-search"
              title="Search (⌘K)"
              onClick={() => setPalette(true)}
            >
              <Search {...ic} />
            </RoundButton>
          )}
          <BellButton />
          <Actions orange={<AddButton />} />
        </Notch>

        <Notch corner="br" style={{ width: odW }}>
          <div
            ref={odRef}
            className="flex flex-col gap-3.5 overflow-hidden rounded-[28px] bg-attention px-[22px] py-5 text-attention-foreground"
          >
            <div className="flex items-center justify-between">
              <span className="flex text-[13px] font-medium">
                Overdue
                {odLead && (
                  <>
                    &nbsp;·&nbsp;
                    <span className="inline-flex overflow-hidden">
                      <span data-od-num className="inline-block">
                        {Math.min(od, overdue.length - 1) + 1}
                      </span>
                    </span>
                    &nbsp;of {overdue.length}
                  </>
                )}
              </span>
              <div className="flex gap-1.5">
                <AttentionButton
                  title="Previous"
                  disabled={overdue.length < 2}
                  onClick={() => stepOd(-1)}
                >
                  <ArrowLeft {...sm} />
                </AttentionButton>
                <AttentionButton
                  title="Next"
                  disabled={overdue.length < 2}
                  onClick={() => stepOd(1)}
                >
                  <ArrowRight {...sm} />
                </AttentionButton>
              </div>
            </div>
            {odLead ? (
              <button
                data-od-slide
                onClick={() => openLead(odLead.id)}
                className="cursor-pointer border-0 bg-transparent p-0 text-left text-[22px] leading-[1.2] font-light text-attention-foreground"
              >
                {odLead.name}
                <span className="block text-sm leading-[1.4] font-normal text-attention-foreground/70">
                  {overdueNote(odLead)}
                </span>
              </button>
            ) : (
              <span className="text-[22px] leading-[1.2] font-light">
                Nothing overdue
                <span className="block text-sm leading-[1.4] font-normal text-attention-foreground/70">
                  Every follow-up is on time.
                </span>
              </span>
            )}
          </div>
        </Notch>
      </div>

      {/* Right column */}
      <div
        className="flex min-w-0 gap-2.5"
        style={
          compact
            ? // Stacked: above the lead list (the spec's pinned section).
              { gridColumn: 1, gridRow: 2, flexWrap: "wrap" }
            : {
                gridRow: "span 2",
                flexDirection: "column",
                minHeight: 0,
              }
        }
      >
        <section
          className="flex min-h-0 min-w-0 flex-[1_1_300px] flex-col gap-[18px] rounded-xl bg-background p-6"
          // Stacked, the list still shows a few follow-ups.
          style={compact ? { minHeight: 320 } : undefined}
        >
          <div className="flex items-start justify-between">
            <Title title="Today's" sub="Follow-ups" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[44px] leading-none font-light tabular-nums">
                {fuLeft}
              </span>
              <span className="text-[13px] font-medium text-muted-foreground">
                left
              </span>
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
            {today.length === 0 && (
              <span className="px-1 text-sm text-muted-foreground">
                No follow-ups today.
              </span>
            )}
            {today.map((l) => {
              const done = !!l.follow_up_done_at
              return (
                <div
                  key={l.id}
                  className={cn(
                    "flex items-center gap-3 rounded-[18px] bg-card py-3 pr-3 pl-3.5",
                    done && "opacity-55"
                  )}
                >
                  <Avatar name={l.name} />
                  <button
                    onClick={() => openLead(l.id)}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 border-0 bg-transparent p-0 text-left text-foreground"
                  >
                    <span className="truncate text-sm">
                      <span
                        className={cn("font-medium", done && "line-through")}
                      >
                        {l.name}
                      </span>
                      {l.company && (
                        <span className="text-muted-foreground">
                          {" · " + l.company}
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <Dot color={DOT[l.status]} />
                      <span className="flex-none text-foreground">
                        {l.status}
                      </span>
                      <span className="truncate">
                        {"· " +
                          (l.last_note
                            ? `${l.last_note.note} · ${ago(lastAt(l))}`
                            : "No notes yet")}
                      </span>
                    </span>
                  </button>
                  <span className="flex-none text-[15px] font-light tabular-nums">
                    {hhmm(l.next_follow_up_at)}
                  </span>
                  <button
                    onClick={() => toggleFu(l)}
                    title={done ? "Mark as not done" : "Mark as done"}
                    className={cn(
                      "grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 transition-colors duration-200",
                      done
                        ? "bg-foreground text-card"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Check {...sm} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="flex min-h-0 min-w-0 flex-[1_1_300px] flex-col gap-[18px] overflow-y-auto rounded-xl bg-brand-surface p-6 text-brand-ink">
          <div className="flex items-start justify-between">
            <Title title="Filter" sub="By status" subClass="opacity-70" />
            <span className="text-[13px] font-medium">
              <span data-roll="list-count">{list.count} shown</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHIPS.map(([name, dot]) => {
              const on = filter === name
              return (
                <button
                  key={name}
                  onClick={() => pickFilter(name)}
                  aria-pressed={on}
                  className={cn(
                    "relative inline-flex h-9 cursor-pointer items-center gap-[7px] rounded-full border bg-transparent px-3.5 text-[13px] font-medium transition-colors duration-300",
                    on
                      ? "border-brand-ink text-brand-surface"
                      : "border-brand-ink/35 text-brand-ink"
                  )}
                >
                  {/* The highlight slides between chips (see the
                    filter-chip effect); the label sits above it. */}
                  {on && (
                    <span
                      data-chip-pill
                      aria-hidden
                      className="absolute -inset-px rounded-full bg-brand-ink"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-[7px]">
                    {dot && <Dot color={dot} />}
                    {name}
                    <span className="tabular-nums opacity-70">
                      {countOf(name)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex-1" />
          <div className="flex items-end justify-between gap-3 border-t border-brand-ink/25 pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium">Won this month</span>
              <span className="text-[40px] leading-none font-light tabular-nums">
                {money(dash?.won_this_month ?? 0)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Leads */}
      <section
        data-flip-id="leads-card"
        className="relative flex min-h-0 min-w-0 flex-col gap-3.5 rounded-xl bg-background p-6"
        style={compact ? { gridRow: 3 } : undefined}
      >
        {/* Phones: below the notch rather than beside it. */}
        <div
          className={cn(
            "flex min-h-[58px] items-start justify-between",
            phone ? "pt-12" : "pr-[200px]"
          )}
        >
          <Title title="Leads" sub={filterLabel} subRoll="list-sub" />
        </div>
        <Notch corner="tr" data-swap>
          <button
            onClick={() => go(1)}
            className="flex h-13 cursor-pointer items-center gap-2 rounded-full border-0 bg-background px-[22px] text-sm font-medium text-foreground"
          >
            View all leads <ArrowRight {...sm} />
          </button>
        </Notch>
        <LeadTable rows={list.results} onOpen={openLead} stacked={phone} />
      </section>
    </>
  )
}
