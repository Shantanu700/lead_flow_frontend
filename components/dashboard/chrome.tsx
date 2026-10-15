"use client"

import * as React from "react"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sun,
} from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { Notch } from "@/components/notch"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {} from "@/src/client/types.gen"
import { cn } from "@/lib/utils"
import { hhmm, overdueNote } from "@/lib/format"
import { PERIODS } from "@/lib/leads"
import { RoundButton } from "@/components/dashboard/buttons"
import { ic, sm } from "@/components/dashboard/icons"
import { Segmented } from "@/components/dashboard/segmented"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap
import { useDash } from "@/components/dashboard/context"

// Pieces several views share: the top notches' buttons, the figures and
// the controls that move between notch and hero.

export function StripArrow({ dir }: { dir: 1 | -1 }) {
  const { stripEdge, scrollStrip } = useDash()
  return (
    <Notch corner={dir < 0 ? "bl" : "br"} data-swap>
      <Button
        size="icon-lg"
        className="size-16 min-w-16 rounded-full p-0"
        aria-label={dir < 0 ? "Earlier follow-ups" : "Later follow-ups"}
        title={dir < 0 ? "Earlier follow-ups" : "Later follow-ups"}
        disabled={dir < 0 ? stripEdge.start : stripEdge.end}
        onClick={() => scrollStrip(dir)}
      >
        {dir < 0 ? (
          <ArrowLeft {...ic} className="size-5" />
        ) : (
          <ArrowRight {...ic} className="size-5" />
        )}
      </Button>
    </Notch>
  )
}

export function RailNotch({ title, sub }: { title: string; sub?: string }) {
  const { phone, rail, setRail, subVisible } = useDash()
  return (
    // Phones drop it: the tab bar shows where you are.
    <Notch
      corner="tl"
      className={cn("flex items-center gap-2", phone && "hidden")}
    >
      <RoundButton
        data-flip-id="btn-rail"
        onClick={() => setRail(!rail)}
        title={rail ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={rail}
      >
        {rail ? <PanelLeftClose {...ic} /> : <PanelLeftOpen {...ic} />}
      </RoundButton>
      <div
        data-flip-id="title-pill"
        className="flex h-16 items-center gap-2.5 rounded-[32px] bg-background pr-[26px] pl-6"
      >
        <span
          data-roll="title"
          className="text-xl font-medium tracking-[-0.01em] whitespace-nowrap"
        >
          {title}
        </span>
        {sub && (
          <span
            data-roll="sub"
            className="text-[13px] whitespace-nowrap text-muted-foreground"
            style={{
              display:
                title === "LeadFlow" || subVisible ? "inline-block" : "none",
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </Notch>
  )
}

export function ThemeButton() {
  const { toggleTheme, btnSize } = useDash()
  return (
    <RoundButton className={btnSize} onClick={toggleTheme} title="Toggle theme">
      <Sun {...ic} className="hidden dark:block" />
      <Moon {...ic} className="dark:hidden" />
    </RoundButton>
  )
}

// Bell: how many follow-ups need you (overdue + still to do today); the
// menu lists them, and an item opens that lead.
export function BellButton() {
  const { phone, view, today, overdue, go, pending, btnSize, openLead } =
    useDash()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <RoundButton
            data-flip-id="btn-bell"
            title={
              pending.length
                ? `${pending.length} follow-up${pending.length === 1 ? "" : "s"} need you`
                : "Notifications"
            }
            className={cn(
              btnSize,
              "relative transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100"
            )}
          />
        }
      >
        <Bell {...ic} />
        {pending.length > 0 && (
          <span
            data-bell-badge
            className={cn(
              "absolute grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1 text-[11px] leading-none font-medium text-white tabular-nums shadow-[0_0_0_2px_var(--background)]",
              phone ? "top-1.5 right-1.5" : "top-3 right-3"
            )}
          >
            {pending.length > 9 ? "9+" : pending.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80">
        {pending.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        )}
        {overdue.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Overdue</DropdownMenuLabel>
            {overdue.map((l) => (
              <DropdownMenuItem key={l.id} onClick={() => openLead(l.id)}>
                <span className="size-2 flex-none rounded-full bg-highlight" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{l.name}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {overdueNote(l)}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
        {today.some((l) => !l.follow_up_done_at) && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Today</DropdownMenuLabel>
            {today
              .filter((l) => !l.follow_up_done_at)
              .map((l) => (
                <DropdownMenuItem key={l.id} onClick={() => openLead(l.id)}>
                  <span className="w-11 flex-none text-xs text-muted-foreground tabular-nums">
                    {hhmm(l.next_follow_up_at)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{l.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {l.last_note?.note ?? l.company}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
          </DropdownMenuGroup>
        )}
        {view !== 2 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go(2)}>
              Open Follow-ups
              <ArrowRight {...sm} className="ml-auto" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AddButton() {
  const { btnSize, openAdd } = useDash()
  return (
    <Button
      size="icon-lg"
      className={cn(btnSize, "rounded-full p-0")}
      aria-label="Add lead"
      title="Add lead"
      onClick={openAdd}
    >
      <Plus {...ic} className="size-5" />
    </Button>
  )
}

// Theme + the orange action (Add lead; Export on Reports) are one unit:
// every view has it, so it always morphs and never fades.
export function Actions({ orange }: { orange: React.ReactNode }) {
  return (
    <div data-flip-id="actions" className="flex items-center gap-2">
      <ThemeButton />
      {orange}
    </div>
  )
}

/** Figures with a leader line. `row` lays them out side by side
 *  (left-aligned) instead of stacked on the hero's right; `cols` puts
 *  them in that many columns, wrapping onto further rows. */
export function Callouts({
  items,
  row: rowProp,
  cols,
}: {
  items: { value: string; label: string }[]
  row?: boolean
  cols?: number
}) {
  const { compact } = useDash()
  const row = rowProp ?? compact
  return (
    <div
      data-flip-id="callouts"
      className={cn(
        "gap-x-4 gap-y-5 pt-1.5",
        cols ? "grid w-fit" : "flex flex-wrap"
      )}
      style={
        cols
          ? { gridTemplateColumns: `repeat(${cols}, auto)` }
          : { flexDirection: row ? "row" : "column" }
      }
    >
      {items.map((c, i) => (
        // Label over value, set off by a thin rule on the left.
        <div
          key={c.label}
          className="flex min-w-[140px] flex-col gap-1.5 border-l border-muted-foreground/40 pr-6 pl-4"
        >
          <span
            data-roll={"co-l" + i}
            className="text-[13px] text-muted-foreground"
          >
            {c.label}
          </span>
          <span
            data-roll={"co-v" + i}
            className="text-[28px] leading-none font-light tabular-nums"
          >
            {c.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function BigNumber({ value: v }: { value: string }) {
  const { bigSize } = useDash()
  return (
    <span data-flip-id="big" className="inline-block">
      <span
        data-roll="big"
        className="inline-block leading-none font-light tracking-[-0.03em] tabular-nums"
        style={{ fontSize: bigSize }}
      >
        {v}
      </span>
    </span>
  )
}

// Reports period: in the top notch, or in the hero on phones (the notch
// keeps only theme and export there).
export function PeriodToggle() {
  const { phone, period, cw, pickPeriod } = useDash()
  return (
    <Segmented
      data-flip-id="periods"
      className={cn(phone ? "h-13 self-start bg-card p-[5px]" : "h-16 p-1.5")}
      itemClass={cn(
        phone ? "h-[42px] px-4" : "h-13",
        !phone && (cw < 1014 ? "px-3" : "px-[18px]")
      )}
      options={PERIODS}
      value={period}
      onChange={pickPeriod}
    />
  )
}

// Leads tab: sort, search and paging.
export function LeadControls() {
  const {
    phone,
    q,
    setQ,
    setPage,
    sort,
    setSort,
    narrow,
    pageCount,
    page,
    captureRows,
  } = useDash()
  return (
    <>
      <Segmented
        aria-label="Sort leads"
        className="h-13 p-[5px]"
        itemClass={cn("h-[42px]", phone ? "px-3" : "px-[18px]")}
        options={["Recent", "Value", "Name"] as const}
        value={sort}
        onChange={(v) => {
          captureRows()
          setSort(v)
          setPage(0)
        }}
      />
      <div
        className={cn(
          "box-border flex h-13 items-center gap-2.5 rounded-full bg-background px-[18px]",
          // In the card's own row: full width, above sort and paging.
          narrow ? "order-first w-full" : "w-[240px]"
        )}
      >
        <span className="flex text-muted-foreground">
          <Search {...ic} />
        </span>
        <input
          value={q}
          onChange={(e) => {
            captureRows()
            setQ(e.target.value)
            setPage(0)
          }}
          placeholder="Search leads"
          aria-label="Search leads"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-0"
        />
      </div>
      <div className="ml-auto box-border flex h-13 items-center rounded-full bg-background px-1">
        <div className="flex items-center gap-1.5">
          <Button
            size="icon-lg"
            className="size-11 min-w-11 rounded-full p-0"
            aria-label="Previous page"
            title="Previous page"
            disabled={page === 0}
            onClick={() => setPage(Math.max(0, page - 1))}
          >
            <ArrowLeft {...sm} />
          </Button>
          <span className="min-w-14 text-center text-[13px] font-medium whitespace-nowrap tabular-nums">
            {page + 1}{" "}
            <span className="text-muted-foreground">of {pageCount}</span>
          </span>
          <Button
            size="icon-lg"
            className="size-11 min-w-11 rounded-full p-0"
            aria-label="Next page"
            title="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
          >
            <ArrowRight {...sm} />
          </Button>
        </div>
      </div>
    </>
  )
}
