"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { CommandPalette } from "@/components/command-palette"
import { cn } from "@/lib/utils"
import { DOT } from "@/lib/leads"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

import { useDashboard } from "./use-dashboard"
import { DashboardContext } from "@/components/dashboard/context"
import { LeadDialog } from "@/components/dashboard/lead-dialog"
import { LeadSheet } from "@/components/dashboard/lead-sheet"
import { Rail } from "@/components/dashboard/rail"
import { FollowUpsView } from "@/components/dashboard/views/follow-ups"
import { LeadsView } from "@/components/dashboard/views/leads"
import { OverviewView } from "@/components/dashboard/views/overview"
import { ReportsView } from "@/components/dashboard/views/reports"

export default function Page() {
  const d = useDashboard()
  const {
    toggleTheme,
    frameRef,
    contentRef,
    phone,
    view,
    palette,
    setPalette,
    go,
    compact,
    stackedRows,
    openEdit,
    openAdd,
    openLead,
  } = d

  return (
    <DashboardContext value={d}>
      {/* Black bezel + a screen-sized rounded frame. The page never scrolls:
          panels fill the frame and their lists scroll inside them. Only when
          the dashboard/reports layout stacks (compact) does the content
          column scroll. */}
      <div className="box-border h-dvh overflow-hidden bg-black p-2 text-foreground">
        <div
          ref={frameRef}
          className={cn(
            "box-border flex h-full gap-2.5 overflow-hidden rounded-[44px] bg-card p-2.5",
            phone && "flex-col-reverse"
          )}
        >
          <Rail />

          <div
            ref={contentRef}
            className="grid min-h-0 min-w-0 flex-1 gap-2.5 overflow-y-auto overscroll-contain rounded-xl"
            style={{
              gridTemplateColumns: compact
                ? "minmax(0,1fr)"
                : "minmax(0,1fr) minmax(320px,380px)",
              gridTemplateRows:
                view === 0
                  ? compact
                    ? stackedRows(3)
                    : "auto minmax(220px,1fr)"
                  : (view === 3 && compact) || phone
                    ? stackedRows(1)
                    : "1fr",
            }}
          >
            {view === 0 && <OverviewView />}

            {view === 1 && <LeadsView />}

            {view === 2 && <FollowUpsView />}

            {view === 3 && <ReportsView />}
          </div>
        </div>

        <LeadSheet />

        <CommandPalette
          open={palette}
          onOpenChange={setPalette}
          view={view}
          dotOf={(s) => DOT[s]}
          onOpenLead={(l) => openLead(l.id, l)}
          onEditLead={openEdit}
          onNavigate={go}
          onAddLead={openAdd}
          onToggleTheme={toggleTheme}
        />

        {/* Add lead */}
        <LeadDialog />
      </div>
    </DashboardContext>
  )
}
