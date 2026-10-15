"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { Notch } from "@/components/notch"
import { cn } from "@/lib/utils"
import { money, pct } from "@/lib/format"
import { CHIPS } from "@/lib/leads"
import { Dot } from "@/components/dashboard/atoms"
import { Hero, Title } from "@/components/dashboard/hero"
import { LeadTable } from "@/components/dashboard/lead-table"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

import {
  Actions,
  AddButton,
  BigNumber,
  Callouts,
  LeadControls,
  RailNotch,
} from "@/components/dashboard/chrome"
import { useDash } from "@/components/dashboard/context"

/** The Leads tab: open value, status tiles and the full lead list with sort, search and paging. */
export function LeadsView() {
  const {
    pageStyle,
    phone,
    filter,
    list,
    leadStats,
    cw,
    narrow,
    heroPad,
    filterLabel,
    countOf,
    pickFilter,
    openEdit,
    openLead,
  } = useDash()
  return (
    <div
      className="flex min-h-0 min-w-0 flex-col gap-2.5"
      style={{
        ...pageStyle,
        minHeight: (cw < 1114 ? 500 : 380) + 230,
      }}
    >
      <div
        className="relative min-w-0"
        style={{ minHeight: cw < 1114 ? 500 : 380 }}
      >
        <Hero padding={heroPad}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted-foreground">
                Open value
              </span>
              <BigNumber value={money(leadStats?.open_value ?? 0)} />
            </div>
            <Callouts
              items={[
                {
                  value: String(leadStats?.open_leads ?? 0),
                  label: "Open leads",
                },
                {
                  value: money(leadStats?.avg_value ?? 0),
                  label: "Avg. lead value",
                },
                {
                  value: pct(leadStats?.win_rate),
                  label: "Win rate (closed)",
                },
              ]}
              row={true}
            />
          </div>
          <div className="min-h-[30px] flex-1" />
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns:
                cw < 1114
                  ? "repeat(4,minmax(0,1fr))"
                  : "repeat(7,minmax(0,1fr))",
            }}
          >
            {CHIPS.map(([name, dot]) => {
              const on = filter === name
              return (
                <button
                  key={name}
                  onClick={() => pickFilter(name)}
                  aria-pressed={on}
                  className={cn(
                    "box-border flex h-[120px] min-w-0 cursor-pointer flex-col justify-between gap-[18px] rounded-[20px] border-0 p-3.5 text-left transition-colors duration-200",
                    on
                      ? "bg-foreground text-background"
                      : "bg-card text-foreground"
                  )}
                >
                  <span className="text-[32px] leading-none font-light tabular-nums">
                    {countOf(name, leadStats?.by_status)}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap">
                    {dot && <Dot color={dot} />}
                    <span className="truncate">{name}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Hero>
        <RailNotch
          title={"Leads"}
          sub={`${countOf("All", leadStats?.by_status)} total`}
        />
        <Notch corner="tr" className="flex items-center gap-2">
          <Actions orange={<AddButton />} />
        </Notch>
      </div>

      <section
        data-flip-id="leads-card"
        className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 rounded-xl bg-background p-6"
      >
        <div
          className={cn(
            "flex min-h-[58px] items-start justify-between",
            !narrow && "pr-[720px]"
          )}
        >
          <Title title="Leads" sub={filterLabel} subRoll="list-sub" />
        </div>
        {narrow ? (
          // Too tight beside the title: its own row in the card.
          <div className="flex flex-wrap items-center gap-2 rounded-[28px] bg-card p-2">
            <LeadControls />
          </div>
        ) : (
          <Notch corner="tr" data-swap className="flex items-center gap-2">
            <LeadControls />
          </Notch>
        )}
        <LeadTable
          rows={list.results}
          onOpen={openLead}
          onEdit={openEdit}
          stacked={phone}
        />
      </section>
    </div>
  )
}
