"use client"

// All of the dashboard's state, data loading, handlers and motion. The
// page and its views read it through DashboardContext (useDash()).

import * as React from "react"
import { useRouter } from "next/navigation"
import { Flip } from "gsap/Flip"
import { toast } from "sonner"

import { ApiFailure, got, refreshCsrf, toastFailure } from "@/lib/api"
import { useSession } from "@/components/session"
import { useThemeToggle } from "@/components/theme-provider"
import {
  deleteCoreLogin,
  getApiFollowUpsOverdue,
  getApiFollowUpsToday,
  getApiFollowUpsUpcoming,
  getApiLeads,
  getApiLeadsDiscussions,
  getApiStatsDashboard,
  getApiStatsLeads,
  getApiStatsReports,
  postApiLeads,
  postApiLeadsDiscussions,
  putApiLead,
} from "@/src/client/sdk.gen"
import type {
  DashboardStats,
  Discussion,
  Lead,
  LeadsStats,
  PaginatedLead,
} from "@/src/client/types.gen"
import {
  BLANK_FORM,
  EMPTY_PAGE,
  PERIOD_KEY,
  SORT_KEY,
  ZERO_COUNTS,
  type Note,
  type Period,
  type Sort,
  type Status,
} from "@/lib/leads"
import { reduceMotion } from "@/lib/motion"
import { useViewMorph } from "@/hooks/use-view-morph"
import { useDashboardMotion } from "@/hooks/use-dashboard-motion"
import { useFrameLayout } from "@/hooks/use-frame-layout"
import { useReports } from "@/hooks/use-reports"
import { useFollowUpStrip } from "@/hooks/use-follow-up-strip"
import { useOverdueCard } from "@/hooks/use-overdue-card"

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
  const [filter, setFilter] = React.useState<"All" | Status>("All")
  const [q, setQ] = React.useState("")
  const [pageIdx, setPage] = React.useState(0)
  const [sheet, setSheet] = React.useState(false)
  // The lead open in the sheet; kept here so a save that moves it off the
  // current page doesn't empty the sheet.
  const [selLead, setSelLead] = React.useState<Lead | null>(null)
  const [add, setAdd] = React.useState(false)
  const [form, setForm] = React.useState(BLANK_FORM)
  const [note, setNote] = React.useState("")
  const [fuOn, setFuOn] = React.useState(false)
  const [fuAt, setFuAt] = React.useState<Date | null>(null)
  const [sort, setSort] = React.useState<Sort>("Recent")
  // Server data. Each tab loads only what it shows (see `load`).
  const [ready, setReady] = React.useState(false)
  // One page of the lead list, filtered, searched and sorted by the server.
  const [list, setList] = React.useState<PaginatedLead>(EMPTY_PAGE)
  const listSeq = React.useRef(0)
  const [dash, setDash] = React.useState<DashboardStats | null>(null)
  const [leadStats, setLeadStats] = React.useState<LeadsStats | null>(null)
  const { setReports, setPeriod, ...reportsTab } = useReports()
  const { period } = reportsTab
  const [today, setToday] = React.useState<Lead[]>([])
  const [overdue, setOverdue] = React.useState<Lead[]>([])
  const [upcoming, setUpcoming] = React.useState<Lead[]>([])
  // Each lead's discussions, newest first, fetched when its sheet opens.
  const [talk, setTalk] = React.useState<Record<number, Discussion[]>>({})
  const [saving, setSaving] = React.useState(false)
  // Command palette (search button, ⌘K / Ctrl+K).
  const [palette, setPalette] = React.useState(false)
  // The lead dialog edits this lead; null means it adds a new one.
  const [editLead, setEditLead] = React.useState<Lead | null>(null)

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

  /** Fetch the lead page tab `v` shows. The server does all the filtering,
   *  searching and sorting: 5 rows on the Dashboard (status filter only),
   *  10 on Leads (filter, search, sort, page). */
  const fetchList = async (v: number) => {
    const seq = ++listSeq.current
    const { data, error, response } = await getApiLeads({
      query: {
        status: filter === "All" ? undefined : filter,
        ...(v === 1
          ? {
              q: q.trim() || undefined,
              ordering: SORT_KEY[sort],
              page: pageIdx + 1,
              page_size: 10,
            }
          : { page_size: 5 }),
      },
    })
    if (seq !== listSeq.current) return // a newer request superseded this one
    // The page ran off the end (e.g. after a status change): back to page 1.
    if (response?.status === 404 && pageIdx > 0) return setPage(0)
    if (error !== undefined || !data)
      throw new ApiFailure(error, response?.status)
    setList(data)
  }
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

  const pageCount = Math.max(1, Math.ceil(list.count / 10))
  const page = pageIdx
  const timeline: Note[] = selLead
    ? [
        ...(talk[selLead.id] ?? []).map((d) => ({
          key: "d" + d.id,
          at: d.created_at,
          note: d.note,
          follow: d.follow_up_at,
        })),
        {
          key: "created",
          at: selLead.created_at,
          note: "Lead created",
          system: true,
        },
      ]
    : []
  const fuLeft = today.filter((l) => !l.follow_up_done_at).length
  const filterLabel = filter === "All" ? "All statuses" : filter
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
  }, [filter, q, sort, pageIdx])

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
  // Put a lead the server returned into every list that shows it.
  const merge = (lead: Lead) => {
    const swap = (list: Lead[]) =>
      list.map((l) => (l.id === lead.id ? lead : l))
    setList((p) => ({ ...p, results: swap(p.results) }))
    setSelLead((l) => (l?.id === lead.id ? lead : l))
    setToday(swap)
    setOverdue(swap)
    setUpcoming(swap)
  }
  // Row pencil: the lead dialog, prefilled, in edit mode.
  const openEdit = (lead: Lead) => {
    setEditLead(lead)
    setForm({
      name: lead.name,
      company: lead.company ?? "",
      phone: lead.phone ?? "",
      value: String(lead.value ?? 0),
      source: lead.source ?? "",
    })
    setAdd(true)
  }
  // Header +: a blank dialog (an unsaved new-lead draft is kept).
  const openAdd = () => {
    if (editLead) {
      setEditLead(null)
      setForm(BLANK_FORM)
    }
    setAdd(true)
  }
  // `lead` when the caller already has it (the palette's results may not be
  // in any list on screen); otherwise it's found in those lists.
  const openLead = (id: number, lead?: Lead) => {
    setSelLead(
      lead ??
        [...list.results, ...today, ...overdue, ...upcoming].find(
          (l) => l.id === id
        ) ??
        null
    )
    setSheet(true)
    got(getApiLeadsDiscussions({ path: { id } }), (list) =>
      setTalk((all) => ({ ...all, [id]: list }))
    ).catch(toastFailure)
  }
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
  // Saves show only what the server confirmed; on failure the form keeps
  // everything typed. Editing sends only the fields that changed.
  const saveLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || saving) return
    const fields = {
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      value: Math.max(0, Math.round(Number(form.value) || 0)),
      source: form.source,
    }
    const was = editLead
    const changed = was
      ? Object.fromEntries(
          Object.entries(fields).filter(
            ([k, v]) =>
              v !== (was[k as keyof typeof fields] ?? (k === "value" ? 0 : ""))
          )
        )
      : fields
    if (was && !Object.keys(changed).length) return setAdd(false)
    setSaving(true)
    try {
      if (was) {
        await got(putApiLead({ path: { id: was.id }, body: changed }), merge)
        toast.success("Lead updated.")
      } else {
        await got(postApiLeads({ body: fields }), () => {})
        pickFilter("All")
        toast.success("Lead saved.")
      }
      setForm(BLANK_FORM)
      setEditLead(null)
      setAdd(false)
      refresh()
    } catch (error) {
      toastFailure(error)
    } finally {
      setSaving(false)
    }
  }
  const addNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selLead || !note.trim() || saving) return
    // Keep everything typed when the follow-up is incomplete.
    if (fuOn && !fuAt) {
      toast.warning("Pick a date and time for the follow-up.")
      return
    }
    const id = selLead.id
    setSaving(true)
    try {
      await got(
        postApiLeadsDiscussions({
          path: { id },
          body: {
            note: note.trim(),
            follow_up_at: fuOn ? fuAt!.toISOString() : null,
          },
        }),
        ({ discussion, lead }) => {
          setTalk((all) => ({ ...all, [id]: [discussion, ...(all[id] ?? [])] }))
          merge(lead)
        }
      )
      setNote("")
      setFuOn(false)
      setFuAt(null)
      toast.success(fuOn ? "Note and follow-up saved." : "Note added.")
      refresh()
    } catch (error) {
      toastFailure(error)
    } finally {
      setSaving(false)
    }
  }
  const setStatus = async (status: Status) => {
    if (!selLead || status === selLead.status || saving) return
    setSaving(true)
    try {
      await got(
        putApiLead({ path: { id: selLead.id }, body: { status } }),
        (lead) => {
          captureRows()
          merge(lead)
        }
      )
      toast.success(`Moved to ${status}.`)
      refresh()
    } catch (error) {
      toastFailure(error)
    } finally {
      setSaving(false)
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
    view,
    nav,
    filter,
    setFilter,
    q,
    setQ,
    setPage,
    sheet,
    setSheet,
    selLead,
    add,
    setAdd,
    form,
    setForm,
    note,
    setNote,
    fuOn,
    setFuOn,
    fuAt,
    setFuAt,
    sort,
    setSort,
    ready,
    list,
    dash,
    leadStats,
    today,
    overdue,
    upcoming,
    talk,
    saving,
    palette,
    setPalette,
    editLead,
    load,
    refresh,
    go,
    pending,
    todayShort,
    pageCount,
    page,
    timeline,
    fuLeft,
    filterLabel,
    countOf,
    captureRows,
    pickFilter,
    openEdit,
    openAdd,
    openLead,
    toggleFu,
    saveLead,
    addNote,
    setStatus,
    pickPeriod,
    counts,
    max,
  }
}

export type Dashboard = ReturnType<typeof useDashboard>
