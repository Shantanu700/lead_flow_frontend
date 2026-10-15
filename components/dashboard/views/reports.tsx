"use client"

import * as React from "react"
import { Check, Download } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { Notch } from "@/components/notch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ink, kfmt, money, pct } from "@/lib/format"
import { PERIOD_LABEL, STAGES } from "@/lib/leads"
import { Dot } from "@/components/dashboard/atoms"
import { Hero, Title } from "@/components/dashboard/hero"
import { ic } from "@/components/dashboard/icons"
import { Segmented } from "@/components/dashboard/segmented"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

import {
  Actions,
  BigNumber,
  Callouts,
  PeriodToggle,
  RailNotch,
} from "@/components/dashboard/chrome"
import { useDash } from "@/components/dashboard/context"

/** The Reports tab: revenue chart, win rate, conversion funnel and lead sources. */
export function ReportsView() {
  const {
    pageStyle,
    phone,
    exported,
    period,
    mode,
    setMode,
    narrow,
    compact,
    odW,
    heroH,
    heroPad,
    btnSize,
    stackedRows,
    todayShort,
    rep,
    winNote,
    exportReport,
    bmax,
    funnel,
    fmax,
  } = useDash()
  return (
    <div
      className="grid min-h-0 min-w-0 gap-2.5"
      style={{
        ...pageStyle,
        minHeight: compact ? undefined : heroH + 230,
        gridTemplateColumns: compact
          ? "minmax(0,1fr)"
          : "minmax(0,1.4fr) minmax(0,1fr)",
        gridTemplateRows: compact ? stackedRows(3) : "auto minmax(220px,1fr)",
      }}
    >
      <div
        className="relative col-span-full min-w-0"
        // Room for two rows of figures above the win-rate notch.
        style={{ minHeight: heroH + 40 }}
      >
        <Hero padding={heroPad}>
          {/* Figures on the left; the chart takes the rest of the
            panel, full height (stacked below on smaller screens). */}
          <div
            className={cn(
              "flex min-h-0 flex-1 gap-10",
              compact ? "flex-col" : "flex-row"
            )}
          >
            <div
              className={cn(
                "flex flex-none gap-6",
                compact && !narrow
                  ? "flex-row flex-wrap items-end justify-between"
                  : "flex-col"
              )}
            >
              <div className="flex flex-col gap-3.5">
                <h1
                  data-roll="h1"
                  className="m-0 text-[30px] leading-[1.15] font-light"
                >
                  Revenue won
                  <span className="block text-muted-foreground">
                    {PERIOD_LABEL[period]}
                  </span>
                </h1>
                <BigNumber value={money(rep.revenue)} />
              </div>
              <Callouts
                items={[
                  {
                    value: String(rep.deals_won),
                    label: "Deals won",
                  },
                  {
                    value: money(rep.avg_deal),
                    label: "Avg. deal size",
                  },
                  {
                    value:
                      rep.avg_days_to_close === null
                        ? "—"
                        : Math.round(rep.avg_days_to_close) + " days",
                    label: "Avg. time to close",
                  },
                ]}
                row={true}
                cols={phone ? undefined : 2}
              />
            </div>
            {phone && <PeriodToggle />}
            <div
              className="box-content flex min-h-[200px] min-w-0 flex-1 items-end gap-2"
              style={{
                // Stacked, the chart clears the bottom-left win-rate notch.
                paddingLeft: compact && !narrow ? odW + 10 : 0,
                paddingBottom: narrow ? 150 : 0,
              }}
            >
              {rep.bars.map(({ label, value: v }, i) => {
                const last = i === rep.bars.length - 1
                return (
                  <div
                    key={label}
                    className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2.5"
                  >
                    <div
                      data-bar
                      className={cn(
                        "box-border flex min-h-11 items-start overflow-hidden rounded-[18px] py-3 transition-[height] duration-300",
                        phone ? "px-1.5" : "px-2.5",
                        last ? "bg-foreground" : "bg-card",
                        v === 0 && "opacity-45"
                      )}
                      style={{ height: (v / bmax) * 100 + "%" }}
                    >
                      <span
                        className={cn(
                          "font-normal whitespace-nowrap tabular-nums",
                          phone ? "text-[11px]" : "text-sm",
                          last ? "text-background" : "text-foreground"
                        )}
                      >
                        {kfmt(v)}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Hero>
        <RailNotch
          title={"Reports"}
          sub={"Updated " + todayShort.split(", ")[1]}
        />
        <Notch corner="tr" className="flex items-center gap-2">
          {!phone && <PeriodToggle />}
          <Actions
            orange={
              <Button
                size="icon-lg"
                className={cn(btnSize, "rounded-full p-0")}
                aria-label="Export report as CSV"
                title="Export report as CSV"
                onClick={exportReport}
              >
                {/* Download and check share one cell and swap. */}
                <span className="grid *:transition-[opacity,scale] *:duration-200 *:ease-out *:[grid-area:1/1] motion-reduce:*:transition-none">
                  <Download
                    {...ic}
                    className={cn(
                      "size-5",
                      exported ? "scale-75 opacity-0" : "opacity-100"
                    )}
                  />
                  <Check
                    {...ic}
                    className={cn(
                      "size-5",
                      exported ? "opacity-100" : "scale-75 opacity-0"
                    )}
                  />
                </span>
              </Button>
            }
          />
        </Notch>
        <Notch corner="bl" style={{ width: odW }}>
          <div className="flex items-end justify-between gap-3 rounded-[28px] bg-attention px-[22px] py-5 text-attention-foreground">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium">Win rate</span>
              <span
                data-roll="win-note"
                className="text-sm text-attention-foreground/70"
              >
                {winNote}
              </span>
            </div>
            <span
              data-roll="win"
              className="text-5xl leading-none font-light tabular-nums"
            >
              {pct(rep.win_rate)}
            </span>
          </div>
        </Notch>
      </div>

      <section className="relative flex min-h-0 min-w-0 flex-col gap-[18px] rounded-xl bg-background p-6">
        {/* Phones: below the notch rather than beside it. */}
        <div className={cn("min-h-[58px]", phone ? "pt-12" : "pr-[200px]")}>
          <Title title="Conversion" sub="By stage" />
        </div>
        <Notch corner="tr">
          <Segmented
            className="h-13 p-[5px]"
            itemClass="h-[42px] px-[18px]"
            options={["Count", "Value"] as const}
            value={mode}
            onChange={setMode}
          />
        </Notch>
        {/* Funnel: right-aligned bars whose length and opacity both
          follow the stage's share of the largest stage. */}
        <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {STAGES.map(([name, dot]) => (
            <div
              key={name}
              className={cn(
                "grid items-center px-1",
                phone
                  ? "grid-cols-[104px_minmax(0,1fr)_72px] gap-2.5"
                  : "grid-cols-[130px_minmax(0,1fr)_84px] gap-3.5"
              )}
            >
              <span className="flex items-center gap-2 text-[13px] font-medium whitespace-nowrap">
                <Dot color={dot} />
                {name}
              </span>
              <span className="flex justify-end">
                <span
                  title={`${name}: ${mode === "Count" ? funnel[name] : money(funnel[name])}`}
                  className="block h-9 min-w-9 rounded-full bg-foreground transition-[width,opacity] duration-300"
                  style={{
                    width: (funnel[name] / fmax) * 100 + "%",
                    // Floor so the smallest stage stays visible.
                    opacity: Math.max(0.15, funnel[name] / fmax),
                  }}
                />
              </span>
              <span className="text-right text-[15px] font-light tabular-nums">
                {mode === "Count" ? funnel[name] : money(funnel[name])}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col gap-[18px] overflow-y-auto rounded-xl bg-brand-surface p-6 text-brand-ink">
        <div className="flex items-start justify-between gap-3">
          <Title
            title="Lead sources"
            sub={PERIOD_LABEL[period]}
            subClass="opacity-70"
            subRoll="src-sub"
          />
          <span data-roll="src-leads" className="text-[13px] font-medium">
            {rep.leads} leads
          </span>
        </div>
        {/* Part-to-whole: one bar split by share, largest first, in
          steps of the ink (2px surface gaps between segments). */}
        <div className="flex h-14 flex-none gap-0.5 overflow-hidden rounded-[18px]">
          {rep.sources.length === 0 && (
            <span className="flex-1 rounded-[4px] bg-brand-ink/20" />
          )}
          {rep.sources.map(({ source, share: p }, i) => (
            <span
              key={source}
              title={`${source || "Not recorded"}: ${p}%`}
              className="rounded-[4px] bg-brand-ink"
              style={{ flexGrow: p, opacity: ink(i) }}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {rep.sources.length === 0 && (
            <span className="text-sm opacity-70">
              No leads came in this {period.toLowerCase()}.
            </span>
          )}
          {rep.sources.map(({ source, share: p }, i) => (
            <div
              key={source}
              className="flex items-center gap-2.5 text-sm font-medium"
            >
              <span
                className="size-2.5 flex-none rounded-full bg-brand-ink"
                style={{ opacity: ink(i) }}
              />
              <span className="flex-1">{source || "Not recorded"}</span>
              <span className="tabular-nums">{p}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
