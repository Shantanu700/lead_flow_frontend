"use client"

// All of the dashboard's state, data loading, handlers and motion. The
// page and its views read it through DashboardContext (useDash()).

import * as React from "react"
import { useRouter } from "next/navigation"
import { Flip } from "gsap/Flip"
import { toast } from "sonner"

import { got, refreshCsrf, toastFailure } from "@/lib/api"
import { useSession } from "@/components/session"
import { useThemeToggle } from "@/components/theme-provider"
import {
  deleteCoreLogin,
  getApiFollowUpsOverdue,
  getApiFollowUpsToday,
  getApiFollowUpsUpcoming,
  getApiStatsDashboard,
  getApiStatsLeads,
  getApiStatsReports,
  putApiLead,
} from "@/src/client/sdk.gen"
import type { DashboardStats, Lead, LeadsStats } from "@/src/client/types.gen"
import { PERIOD_KEY, ZERO_COUNTS, type Period, type Status } from "@/lib/leads"
import { reduceMotion } from "@/lib/motion"
import { useViewMorph } from "@/hooks/use-view-morph"
import { useDashboardMotion } from "@/hooks/use-dashboard-motion"
import { useFrameLayout } from "@/hooks/use-frame-layout"
import { useReports } from "@/hooks/use-reports"
import { useFollowUpStrip } from "@/hooks/use-follow-up-strip"
import { useOverdueCard } from "@/hooks/use-overdue-card"
import { useLeadList } from "@/hooks/use-lead-list"
import { useLeadSheet } from "@/hooks/use-lead-sheet"
import { useLeadDialog } from "@/hooks/use-lead-dialog"

export function useDashboard() {
  const user = useSession()
  const router = useRouter()

  async function logOut() {
    const { error } = await deleteCoreLogin().catch(() => ({
      error: true as const,
    }))
    refreshCsrf()
    if (error)
      toast.warning("We could not reach the server to end your session.")
    else toast.success("Signed out.")
    router.replace("/auth")
  }
  const toggleTheme = useThemeToggle()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [view, setView] = React.useState(0)
  // The rail highlight follows a click at once; `view` follows after the
  // exit animation.
  const [nav, setNav] = React.useState(0)
  const { setList, fetchList, ...listTab } = useLeadList()
  const { filter, q, sort, page, list, setFilter, setPage } = listTab
  // Server data. Each tab loads only what it shows (see `load`).
  const [ready, setReady] = React.useState(false)
  const [dash, setDash] = React.useState<DashboardStats | null>(null)
  const [leadStats, setLeadStats] = React.useState<LeadsStats | null>(null)
  const { setReports, setPeriod, ...reportsTab } = useReports()
  const { period } = reportsTab
  const [today, setToday] = React.useState<Lead[]>([])
  const [overdue, setOverdue] = React.useState<Lead[]>([])
  const [upcoming, setUpcoming] = React.useState<Lead[]>([])
  const [saving, setSaving] = React.useState(false)
  // Command palette (search button, ⌘K / Ctrl+K).
  const [palette, setPalette] = React.useState(false)

  // Filter change: the chip highlight's old box, and whether the list's
  // label and count should roll once the new page arrives.
  const chipFrom = React.useRef<DOMRect | null>(null)
  const rollOnList = React.useRef(false)
  // Lead rows before a list change (see captureRows).
  const rowsState = React.useRef<Flip.FlipState | null>(null)
  // Ids each view renders, so the exit knows what will survive the swap.
  // Lead rows are added from the data (see rowIds).
  const rowIds = (v: number) =>
    (v === 0 || v === 1 ? list.results : []).map((l) => "lead-" + l.id)

  /** Fetch what tab `v` shows (and nothing else). Resolves when it's in;
   *  a failure shows a toast and resolves anyway, so the tab still opens. */
  const load = (v: number, p: Period = period) => {
    const jobs =
      v === 0
        ? [
            got(getApiStatsDashboard(), setDash),
            got(getApiFollowUpsToday(), setToday),
            got(getApiFollowUpsOverdue(), setOverdue),
            fetchList(0),
          ]
        : v === 1
          ? [got(getApiStatsLeads(), setLeadStats), fetchList(1)]
          : v === 2
            ? [
                got(getApiFollowUpsToday(), setToday),
                got(getApiFollowUpsOverdue(), setOverdue),
                got(getApiFollowUpsUpcoming(), setUpcoming),
              ]
            : [
                got(
                  getApiStatsReports({ query: { period: PERIOD_KEY[p] } }),
                  (r) => setReports((all) => ({ ...all, [p]: r }))
                ),
              ]
    return Promise.all(jobs).then(
      () => {},
      (error) => {
        toastFailure(error, {
          id: "load-failed",
        })
      }
    )
  }
  // After a save: refresh what the open tab shows (stats, follow-up lists).
  // Saves call it after an await, when the tab, filter or page they closed
  // over may be out of date, so it runs the latest render's load for the tab
  // on screen or on its way in.
  const latestRefresh = React.useRef(() => {})
  React.useEffect(() => {
    latestRefresh.current = () => void load(nav)
  })
  const refresh = () => latestRefresh.current()

  // One save at a time. Saves show only what the server confirmed; on
  // failure the form keeps everything typed.
  const save = async (job: () => Promise<void>) => {
    if (saving) return
    setSaving(true)
    try {
      await job()
      refresh()
    } catch (error) {
      toastFailure(error)
    } finally {
      setSaving(false)
    }
  }

  // First data, then the entrance plays (the view effect waits for `ready`).
  // Deferred a tick: React's dev double-mount cancels the first timer, so
  // the data loads once.
  React.useEffect(() => {
    const t = setTimeout(() => void load(0).then(() => setReady(true)))
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, [])

  // View switching: morph, roll and slide (hooks/use-view-morph.ts).
  const { go, contextSafe, freezeRolls, rollTexts } = useViewMorph({
    contentRef,
    view,
    setView,
    setNav,
    ready,
    rowIds,
    load,
  })

  const { odDir, ...overdueCard } = useOverdueCard({ overdue, contextSafe })

  const pending = [...overdue, ...today.filter((l) => !l.follow_up_done_at)]
  // List, filter, period, overdue-card and bell animations.
  useDashboardMotion({
    contentRef,
    odRef: overdueCard.odRef,
    period,
    list,
    filter,
    od: overdueCard.od,
    pendingCount: pending.length,
    rollTexts,
    chipFromRef: chipFrom,
    rollOnListRef: rollOnList,
    odDirRef: odDir,
    rowsStateRef: rowsState,
  })

  // ⌘K / Ctrl+K opens the palette from anywhere on the dashboard.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      setPalette((o) => !o)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Frame width, rail and the breakpoints and sizes from them.
  const layout = useFrameLayout()

  const todayShort = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })

  const fuLeft = today.filter((l) => !l.follow_up_done_at).length
  /** Leads per status from the open tab's stats ("All" sums them). */
  const countOf = (name: string, by = dash?.by_status ?? ZERO_COUNTS) =>
    name === "All"
      ? Object.values(by).reduce((a, n) => a + n, 0)
      : by[name as Status]

  // Filter, search, sort or page changed: fetch that page. Search waits for
  // a pause in typing.
  React.useEffect(() => {
    if (!ready || (view !== 0 && view !== 1)) return
    const t = setTimeout(
      () =>
        fetchList(view).catch((e) => {
          toastFailure(e)
          if (rollOnList.current) {
            rollOnList.current = false
            rollTexts() // shows the frozen text again
          }
        }),
      q ? 200 : 0
    )
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list inputs only
  }, [filter, q, sort, page])

  // Today's follow-up strip on the Follow-ups tab.
  const strip = useFollowUpStrip(view)

  // Lead rows glide to their new order when the list changes (sort, filter,
  // search, status); rows that newly appear fade in. Call before the change.
  const captureRows = () => {
    const rows = contentRef.current?.querySelectorAll('[data-flip-id^="lead-"]')
    if (rows?.length && !reduceMotion()) rowsState.current = Flip.getState(rows)
  }
  const pickFilter = (name: "All" | Status) => {
    if (name === filter) return
    captureRows()
    if (!reduceMotion()) {
      chipFrom.current =
        contentRef.current
          ?.querySelector("[data-chip-pill]")
          ?.getBoundingClientRect() ?? null
      // The label changes now and the count when the page arrives; freeze
      // both so they roll together then.
      freezeRolls()
      rollOnList.current = true
    }
    setFilter(name)
    setPage(0)
  }

  const { merge, ...leadSheet } = useLeadSheet({
    leads: [...list.results, ...today, ...overdue, ...upcoming],
    mergeLists: (lead) => {
      const swap = (list: Lead[]) =>
        list.map((l) => (l.id === lead.id ? lead : l))
      setList((p) => ({ ...p, results: swap(p.results) }))
      setToday(swap)
      setOverdue(swap)
      setUpcoming(swap)
    },
    save,
    captureRows,
  })

  const leadDialog = useLeadDialog({
    save,
    merge,
    onCreated: () => pickFilter("All"),
  })

  const toggleFu = async (lead: Lead) => {
    const done = !lead.follow_up_done_at
    try {
      await got(
        putApiLead({ path: { id: lead.id }, body: { follow_up_done: done } }),
        merge
      )
      if (done) toast.success("Follow-up done.")
      refresh()
    } catch (error) {
      toastFailure(error)
    }
  }
  // Reports: fetch the period first, then roll the figures to it.
  const pickPeriod = (p: Period) =>
    load(3, p).then(() => {
      if (!reduceMotion()) freezeRolls()
      setPeriod(p)
    })

  const counts = dash?.by_status ?? ZERO_COUNTS
  const max = Math.max(1, ...Object.values(counts))

  return {
    user,
    logOut,
    toggleTheme,
    contentRef,
    ...layout,
    ...reportsTab,
    ...strip,
    ...overdueCard,
    ...listTab,
    ...leadSheet,
    ...leadDialog,
    view,
    nav,
    ready,
    dash,
    leadStats,
    today,
    overdue,
    upcoming,
    saving,
    palette,
    setPalette,
    load,
    refresh,
    go,
    pending,
    todayShort,
    fuLeft,
    countOf,
    captureRows,
    pickFilter,
    toggleFu,
    pickPeriod,
    counts,
    max,
  }
}

export type Dashboard = ReturnType<typeof useDashboard>
