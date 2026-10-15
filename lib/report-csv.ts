import { csvCell } from "@/lib/format"
import { PERIOD_LABEL, type Period } from "@/lib/leads"
import type { ReportsStats } from "@/src/client/types.gen"

/** The Reports tab as CSV: summary, chart bars, funnel and sources. */
export function reportCsv(rep: ReportsStats, period: Period) {
  const unit = { Week: "day", Month: "month", Quarter: "quarter" }[period]
  const rows: (string | number | null)[][] = [
    ["LeadFlow report", PERIOD_LABEL[period]],
    ["Exported", new Date().toLocaleString("en-IN")],
    [],
    ["Summary"],
    ["Revenue won (₹)", rep.revenue],
    ["Deals won", rep.deals_won],
    ["Avg. deal size (₹)", rep.avg_deal],
    ["Avg. time to close (days)", rep.avg_days_to_close],
    ["Win rate (%)", rep.win_rate],
    ["Win rate last " + period.toLowerCase() + " (%)", rep.prev_win_rate],
    ["Leads created", rep.leads],
    [],
    ["Revenue by " + unit],
    [unit[0].toUpperCase() + unit.slice(1), "Revenue (₹)"],
    ...rep.bars.map((b) => [b.label, b.value]),
    [],
    ["Conversion by stage"],
    ["Stage", "Leads", "Value (₹)"],
    ...rep.funnel.map((f) => [f.status, f.count, f.value]),
    [],
    ["Lead sources"],
    ["Source", "Leads", "Share (%)"],
    ...rep.sources.map((x) => [x.source || "Not recorded", x.count, x.share]),
  ]
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
}
