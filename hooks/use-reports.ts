import * as React from "react"
import { toast } from "sonner"

import { points } from "@/lib/format"
import { EMPTY_REPORT, PERIOD_KEY, type Period, type Status } from "@/lib/leads"
import { reportCsv } from "@/lib/report-csv"
import type { ReportsStats } from "@/src/client/types.gen"

/** The Reports tab: the period and Count/Value toggles, each period's report
 *  (filled by the dashboard's `load`), the figures drawn from it and the CSV
 *  export. */
export function useReports() {
  const [period, setPeriod] = React.useState<Period>("Month")
  const [mode, setMode] = React.useState<"Count" | "Value">("Count")
  const [reports, setReports] = React.useState<
    Partial<Record<Period, ReportsStats>>
  >({})
  // Export: the button shows a check for a moment after a download.
  const [exported, setExported] = React.useState(false)
  const exportTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const rep = reports[period] ?? EMPTY_REPORT
  const winNote =
    rep.win_rate === null
      ? "No closed deals yet"
      : rep.prev_win_rate === null
        ? `No closed deals last ${period.toLowerCase()}`
        : rep.win_rate === rep.prev_win_rate
          ? `Same as last ${period.toLowerCase()}`
          : `${rep.win_rate > rep.prev_win_rate ? "Up" : "Down"} ${points(
              Math.abs(rep.win_rate - rep.prev_win_rate)
            )} on last ${period.toLowerCase()}`

  /** Download the selected period's report as CSV: summary, chart bars,
   *  funnel and sources, from the report already loaded for this tab. */
  const exportReport = () => {
    const csv = reportCsv(rep, period)
    // BOM so spreadsheet apps read ₹ and other UTF-8 correctly.
    const url = URL.createObjectURL(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    )
    const a = document.createElement("a")
    a.href = url
    a.download = `leadflow-report-${PERIOD_KEY[period]}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Report downloaded.")
    clearTimeout(exportTimer.current)
    setExported(true)
    exportTimer.current = setTimeout(() => setExported(false), 1500)
  }

  const bmax = Math.max(1, ...rep.bars.map((b) => b.value))
  const funnel = Object.fromEntries(
    rep.funnel.map((f) => [f.status, mode === "Count" ? f.count : f.value])
  ) as Record<Status, number>
  const fmax = Math.max(1, ...Object.values(funnel))

  return {
    period,
    setPeriod,
    mode,
    setMode,
    setReports,
    exported,
    exportReport,
    rep,
    winNote,
    bmax,
    funnel,
    fmax,
  }
}
