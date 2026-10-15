"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  ChartColumn,
  Check,
  Download,
  House,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Sun,
  Users,
  X,
} from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"
import { toast } from "sonner"

import { ApiFailure, refreshCsrf, toastFailure } from "@/lib/api"
import { CommandPalette } from "@/components/command-palette"
import { DateTimePicker } from "@/components/date-time-picker"
import { NOTCH_R, Notch } from "@/components/notch"
import { useSession } from "@/components/session"
import { useThemeToggle } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  ReportsStats,
  SourceEnum,
} from "@/src/client/types.gen"
import { cn } from "@/lib/utils"

type Status = (typeof STAGES)[number][0]
type Period = (typeof PERIODS)[number]
/** A timeline entry. System events (lead created) aren't discussions. */
type Note = { date: string; note: string; follow?: string; system?: boolean }
type Sort = "Recent" | "Value" | "Name"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

const ic = { size: 20, strokeWidth: 1.75 }
const sm = { size: 16, strokeWidth: 1.75 }
const LEAD_COLS = "minmax(0,2fr) minmax(0,1.3fr) minmax(0,1fr) 110px"

export default function Page() {
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
  const frameRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const railRef = React.useRef<HTMLElement>(null)
  const railMounted = React.useRef(false)
  const [w, setW] = React.useState(1400)
  const [view, setView] = React.useState(0)
  // The rail highlight follows a click at once; `view` follows after the
  // exit animation.
  const [nav, setNav] = React.useState(0)
  const pillRef = React.useRef<HTMLSpanElement>(null)
  const [rail, setRail] = React.useState(false)
  const [filter, setFilter] = React.useState<"All" | Status>("All")
  const [q, setQ] = React.useState("")
  const [pageIdx, setPage] = React.useState(0)
  // Today's follow-up strip: which ends it can still scroll towards.
  const stripRef = React.useRef<HTMLDivElement>(null)
  const [stripEdge, setStripEdge] = React.useState({ start: true, end: true })
  const [od, setOd] = React.useState(0)
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
  const [reports, setReports] = React.useState<
    Partial<Record<Period, ReportsStats>>
  >({})
  const [today, setToday] = React.useState<Lead[]>([])
  const [overdue, setOverdue] = React.useState<Lead[]>([])
  const [upcoming, setUpcoming] = React.useState<Lead[]>([])
  // Each lead's discussions, newest first, fetched when its sheet opens.
  const [talk, setTalk] = React.useState<Record<number, Discussion[]>>({})
  const [saving, setSaving] = React.useState(false)
  // Export: the button shows a check for a moment after a download.
  const [exported, setExported] = React.useState(false)
  const exportTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const bellCount = React.useRef<number | null>(null)
  // Command palette (search button, ⌘K / Ctrl+K).
  const [palette, setPalette] = React.useState(false)
  // The lead dialog edits this lead; null means it adds a new one.
  const [editLead, setEditLead] = React.useState<Lead | null>(null)
  const [period, setPeriod] = React.useState<Period>("Month")
  const [mode, setMode] = React.useState<"Count" | "Value">("Count")

  // View change. Whatever both views share morphs instead of fading:
  //  - data-flip-id: an element present in both views moves/resizes into its
  //    new place (GSAP Flip). The dark hero and its corner notches always do,
  //    so the black shape stays on screen and shapeshifts.
  //  - data-roll: text that changes rolls (old slides up and out, new comes
  //    up from below), via a fixed-position ghost of the old text.
  //  - Only what one view has and the other doesn't fades or slides: panels
  //    slide toward their nearest edge, hero/notch details fade.
  // Out (0.25s) runs before React swaps the view; In runs after.
  const flipState = React.useRef<Flip.FlipState | null>(null)
  // Filter change: the chip highlight's old box, and whether the list's
  // label and count should roll once the new page arrives.
  const chipFrom = React.useRef<DOMRect | null>(null)
  const rollOnList = React.useRef(false)
  // Overdue card: direction of the step in progress (-1 back, 1 forward).
  const odDir = React.useRef(0)
  const odRef = React.useRef<HTMLDivElement>(null)
  // Lead rows before a list change (see captureRows).
  const rowsState = React.useRef<Flip.FlipState | null>(null)
  const prevIds = React.useRef<Set<string>>(new Set())
  // Corner the bottom notch sat in before the switch.
  const attFrom = React.useRef<string | undefined>(undefined)
  const ghosts = React.useRef<Map<string, { node: HTMLElement; text: string }>>(
    new Map()
  )
  const switching = React.useRef(false)
  // Text copies live on <body>; never leave them behind if the page unmounts.
  React.useEffect(() => {
    const g = ghosts.current
    return () => g.forEach((x) => x.node.remove())
  }, [])

  const flipEls = () => [
    ...(contentRef.current?.querySelectorAll<HTMLElement>("[data-flip-id]") ??
      []),
  ]
  const idOf = (el: Element) => (el as HTMLElement).dataset.flipId ?? ""

  /** The hero plus its corner notches, with Flip ids. Top notches are always
   *  there; the bottom "attention" notch moves corner between views. */
  const shape = () => {
    const hero = contentRef.current?.querySelector<HTMLElement>("[data-hero]")
    if (!hero) return []
    // data-swap notches belong to one view: they fade, they don't morph.
    const notches = [...(hero.parentElement?.children ?? [])].filter(
      (c) => c.hasAttribute("data-notch") && !c.hasAttribute("data-swap")
    ) as HTMLElement[]
    notches.forEach((n) => {
      const c = n.dataset.notch
      n.dataset.flipId = c === "tl" || c === "tr" ? "notch-" + c : "notch-att"
    })
    return [hero, ...notches]
  }

  /** Details inside the shape that belong to one view only: every leaf that
   *  is neither morphing nor rolling (and isn't a notch fillet). */
  const shapeDetails = (shapeEls: HTMLElement[]) => {
    const out: Element[] = []
    const walk = (el: Element) => {
      for (const c of el.children) {
        if (c.getAttribute("aria-hidden") === "true") continue
        if (c.hasAttribute("data-flip-id") || c.hasAttribute("data-roll"))
          continue
        if (c.querySelector("[data-flip-id],[data-roll]")) walk(c)
        else out.push(c)
      }
    }
    shapeEls.forEach(walk)
    return out
  }

  /** Top-level panels (not the hero's wrapper, whose parts are handled above). */
  const panels = () => {
    const grid = contentRef.current
    if (!grid) return []
    const top = [
      ...(grid.children.length === 1
        ? grid.children[0].children
        : grid.children),
    ]
    return top.filter((el) => !el.querySelector(":scope > [data-hero]"))
  }

  /** Offset toward the edge nearest to the element's position in the content
   *  area: left/right panels travel sideways, top/bottom ones vertically. */
  const awayFrom = (el: Element, dist = 32) => {
    const box = contentRef.current!.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const dx = (r.left + r.width / 2 - (box.left + box.width / 2)) / box.width
    const dy = (r.top + r.height / 2 - (box.top + box.height / 2)) / box.height
    return Math.abs(dx) > Math.abs(dy)
      ? { x: Math.sign(dx) * dist, y: 0 }
      : { x: 0, y: (Math.sign(dy) || 1) * dist }
  }

  /** Freeze each rolling text as a fixed-position copy so it can roll out
   *  after React has replaced the real one. */
  const freezeRolls = () => {
    ghosts.current.forEach((g) => g.node.remove())
    ghosts.current.clear()
    contentRef.current
      ?.querySelectorAll<HTMLElement>("[data-roll]")
      .forEach((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) return
        const cs = getComputedStyle(el)
        const node = document.createElement("div")
        // Keep theme tokens resolving as they did in place (the hero is .dark).
        if (el.closest(".dark")) node.className = "dark"
        Object.assign(node.style, {
          position: "fixed",
          left: r.left + "px",
          top: r.top + "px",
          width: r.width + "px",
          height: r.height + "px",
          margin: "0",
          pointerEvents: "none",
          zIndex: "40",
          overflow: "hidden", // the mask the old text rolls out of
          // One-line text must not wrap in its copy; wrapped text keeps wrapping.
          whiteSpace:
            r.height > parseFloat(cs.lineHeight) * 1.5 ? "normal" : "nowrap",
          color: cs.color,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
        })
        const copy = el.cloneNode(true) as HTMLElement
        copy.style.margin = "0"
        copy.style.display = "block" // transforms don't apply to inline boxes
        node.append(copy)
        document.body.append(node)
        el.style.opacity = "0"
        ghosts.current.set(el.dataset.roll!, {
          node,
          text: el.textContent ?? "",
        })
      })
  }

  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  /** After freezeRolls() and a re-render: unchanged text needs nothing;
   *  changed or new text rises in while the old copy rises out. Call inside
   *  a GSAP context. */
  const rollTexts = () => {
    const dropGhost = (key: string) => {
      const g = ghosts.current.get(key)
      if (!g) return
      ghosts.current.delete(key)
      gsap.to(g.node.firstElementChild, {
        yPercent: -100,
        duration: 0.45,
        ease: "power3.inOut",
        onComplete: () => g.node.remove(),
      })
    }
    contentRef.current
      ?.querySelectorAll<HTMLElement>("[data-roll]")
      .forEach((el) => {
        el.style.opacity = "" // hidden by freezeRolls if the node survived
        const key = el.dataset.roll!
        const g = ghosts.current.get(key)
        if (g && g.text === el.textContent) {
          ghosts.current.delete(key)
          g.node.remove()
          return
        }
        dropGhost(key)
        // Rise from below, clipped to its own box: shifting down by (1-p)
        // while revealing the top p of it keeps the visible part inside the
        // final box, like text rolling up behind a mask.
        gsap.fromTo(
          el,
          { yPercent: 100, clipPath: "inset(0% 0% 100% 0%)" },
          {
            yPercent: 0,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.45,
            ease: "power3.inOut",
            clearProps: "transform,clipPath",
          }
        )
      })
    // Text with no counterpart in the new state just rolls out.
    ;[...ghosts.current.keys()].forEach(dropGhost)
  }

  // Ids each view renders, so the exit knows what will survive the swap.
  // Lead rows are added from the data (see rowIds).
  const rowIds = (v: number) =>
    (v === 0 || v === 1 ? list.results : []).map((l) => "lead-" + l.id)

  useGSAP(
    () => {
      const grid = contentRef.current
      if (!grid || !ready) return
      const shapeEls = shape()
      const bars = grid.querySelectorAll("[data-bar]")
      const from = flipState.current
      flipState.current = null

      // Entrances end at explicit values (fromTo, not from): a from() tween
      // ends wherever the element is when it starts, and an element with a
      // CSS transition (Button) can still be mid-fade. CSS transitions are off
      // while GSAP drives an element.
      const fadeIn = (targets: gsap.TweenTarget, vars: gsap.TweenVars) =>
        gsap.fromTo(
          targets,
          { opacity: 0, transition: "none" },
          { opacity: 1, clearProps: "opacity,transition", ...vars }
        )
      const slideIn = (els: Element[], delay: number) =>
        els.forEach((el, i) => {
          // Arriving panels pass over the morphing hero, never under it.
          const pos = getComputedStyle(el).position
          const moved = pos === "static" ? "relative" : pos
          gsap.set(el, { zIndex: 2, position: moved })
          gsap.fromTo(
            el,
            { ...awayFrom(el), opacity: 0, transition: "none" },
            {
              x: 0,
              y: 0,
              opacity: 1,
              duration: 0.5,
              delay: delay + i * 0.04,
              ease: "power3.out",
              clearProps:
                "transform,opacity,transition,zIndex" +
                (pos === "static" ? ",position" : ""),
            }
          )
        })
      if (reduceMotion()) {
        fadeIn(panels(), { duration: 0.3, ease: "none" })
        return
      }

      // Sliding panels poke past the content area; hide overflow until they
      // land so no scrollbar flashes.
      gsap.set(grid, { overflow: "hidden" })
      gsap.delayedCall(1, () => gsap.set(grid, { clearProps: "overflow" }))

      if (!from) {
        // First load: nothing to morph from.
        fadeIn(shapeEls, { duration: 0.4 })
        fadeIn(
          shapeEls.flatMap((el) =>
            [...el.children].filter(
              (c) => c.getAttribute("aria-hidden") !== "true"
            )
          ),
          { duration: 0.35, delay: 0.1, ease: "power2.out" }
        )
        slideIn(panels(), 0.05)
      } else {
        const flips = flipEls()
        const kept = flips.filter((el) => prevIds.current.has(idOf(el)))
        const keptSet = new Set(kept)
        // While the hero is out of the flow, hold its slot at the new
        // hero's real height; otherwise the slot falls back to its min-height
        // and the panels below jump up under the hero, then drop back.
        const slot = shapeEls[0]?.parentElement
        if (slot) gsap.set(slot, { height: shapeEls[0].offsetHeight })
        Flip.from(from, {
          targets: kept,
          nested: true,
          onComplete: () => {
            if (slot) gsap.set(slot, { clearProps: "height" })
          },
          // The hero (and blocks inside it) leave the flow while morphing, so
          // their in-between size doesn't push the panels below. Rows and the
          // leads card stay in flow: new rows must keep their slots.
          absolute: kept.filter(
            (el) =>
              shapeEls.includes(el) || ["big", "callouts"].includes(idOf(el))
          ),
          duration: 0.55,
          ease: "power3.inOut",
        })
        // A notch moving to a side corner flies with both top corners
        // rounded, then squares off and grows its edge fillet on arrival.
        const att = shapeEls.find((el) => idOf(el) === "notch-att")
        const corner = att?.dataset.notch
        if (att && attFrom.current && corner !== attFrom.current) {
          const side =
            corner === "bl"
              ? "borderTopLeftRadius"
              : corner === "br"
                ? "borderTopRightRadius"
                : null
          if (side) {
            const land = { duration: 0.15, delay: 0.42, ease: "power2.out" }
            gsap.fromTo(
              att,
              { [side]: NOTCH_R },
              { [side]: 0, clearProps: side, ...land }
            )
            gsap.fromTo(
              att.querySelectorAll("[data-fillet=edge]"),
              { opacity: 0 },
              { opacity: 1, clearProps: "opacity", ...land }
            )
            gsap.fromTo(
              att.querySelectorAll("[data-fillet=fly]"),
              { opacity: 1, display: "block" },
              { opacity: 0, clearProps: "opacity,display", ...land }
            )
          }
        }
        const newPanels = panels().filter(
          (el) => !keptSet.has(el as HTMLElement)
        )
        const newPanelSet = new Set(newPanels)
        // New controls/blocks inside surviving containers fade in.
        fadeIn(
          [
            ...flips.filter(
              (el) =>
                !keptSet.has(el) &&
                !newPanelSet.has(el) &&
                ![...newPanelSet].some((p) => p.contains(el))
            ),
            ...shapeDetails(shapeEls),
            ...grid.querySelectorAll("[data-swap]"),
          ],
          { duration: 0.35, delay: 0.3, ease: "power2.out" }
        )
        slideIn(newPanels, 0.15)
        rollTexts()
      }
      if (bars.length)
        gsap.fromTo(
          bars,
          { clipPath: "inset(100% 0 0 0)" },
          {
            clipPath: "inset(0% 0 0 0)",
            duration: 0.6,
            stagger: 0.04,
            delay: from ? 0.45 : 0.15,
            ease: "power3.out",
            clearProps: "clipPath",
          }
        )
    },
    { scope: contentRef, dependencies: [view, ready], revertOnUpdate: true }
  )

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
  const refresh = () => void load(view)

  // First data, then the entrance plays (the view effect waits for `ready`).
  // Deferred a tick: React's dev double-mount cancels the first timer, so
  // the data loads once.
  React.useEffect(() => {
    const t = setTimeout(() => void load(0).then(() => setReady(true)))
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, [])

  const { contextSafe } = useGSAP({ scope: contentRef })
  // contextSafe at click time, so the exit tweens join the GSAP context.
  const go = (next: number) =>
    contextSafe(() => {
      if (next === view || switching.current) return
      setNav(next)
      // Fetch while the old tab exits, so the morph lands on real figures.
      const loaded = load(next)
      const grid = contentRef.current
      if (reduceMotion() || !grid) return void loaded.then(() => setView(next))
      switching.current = true
      gsap.set(grid, { overflow: "hidden" })

      const shapeEls = shape()
      const nextIds = new Set([...VIEW_FLIP[next], ...rowIds(next)])
      const flips = flipEls()
      const kept = flips.filter((el) => nextIds.has(idOf(el)))
      const leavingPanels = panels().filter(
        (el) => !nextIds.has(idOf(el))
      ) as HTMLElement[]
      const leaving = [
        ...flips.filter(
          (el) =>
            !nextIds.has(idOf(el)) &&
            !leavingPanels.some((p) => p === el || p.contains(el))
        ),
        ...shapeDetails(shapeEls),
        ...grid.querySelectorAll("[data-swap]"),
      ]
      freezeRolls()

      const tl = gsap.timeline({
        onComplete: () => {
          flipState.current = Flip.getState(kept)
          prevIds.current = new Set(kept.map(idOf))
          attFrom.current = shapeEls.find((el) => idOf(el) === "notch-att")
            ?.dataset.notch
          loaded.then(() => {
            switching.current = false
            setView(next)
          })
        },
      })
      tl.to(leaving, { opacity: 0, duration: 0.2, transition: "none" }, 0)
      leavingPanels.forEach((el) =>
        tl.to(
          el,
          { ...awayFrom(el), opacity: 0, duration: 0.25, ease: "power2.in" },
          0
        )
      )
    })()

  // Period change (Reports): changed figures roll like a view change and the
  // new bars grow from the baseline. The first run is the view's own entrance.
  const periodShown = React.useRef(period)
  useGSAP(
    () => {
      if (periodShown.current === period) return
      periodShown.current = period
      rollTexts()
      const bars = contentRef.current?.querySelectorAll("[data-bar]")
      if (!bars?.length || reduceMotion()) return
      gsap.fromTo(
        bars,
        { clipPath: "inset(100% 0 0 0)" },
        {
          clipPath: "inset(0% 0 0 0)",
          duration: 0.5,
          stagger: 0.03,
          delay: 0.1,
          ease: "power3.out",
          clearProps: "clipPath",
        }
      )
    },
    { scope: contentRef, dependencies: [period] }
  )

  useGSAP(
    () => {
      if (rollOnList.current) {
        rollOnList.current = false
        rollTexts()
      }
      const from = rowsState.current
      rowsState.current = null
      if (!from) return
      Flip.from(from, {
        targets: contentRef.current?.querySelectorAll(
          '[data-flip-id^="lead-"]'
        ),
        duration: 0.3,
        ease: "power3.inOut",
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { opacity: 0 },
            { opacity: 1, duration: 0.2, delay: 0.1, clearProps: "opacity" }
          ),
      })
    },
    { scope: contentRef, dependencies: [list] }
  )

  // Filter chips: the dark highlight slides from the old chip to the new one,
  // across rows if it has to.
  useGSAP(
    () => {
      const old = chipFrom.current
      chipFrom.current = null
      const pill =
        contentRef.current?.querySelector<HTMLElement>("[data-chip-pill]")
      if (!old || !pill) return
      const now = pill.getBoundingClientRect()
      gsap.fromTo(
        pill,
        {
          x: old.left - now.left,
          y: old.top - now.top,
          width: old.width,
          height: old.height,
        },
        {
          x: 0,
          y: 0,
          width: now.width,
          height: now.height,
          duration: 0.3,
          ease: "power3.inOut",
          clearProps: "transform,width,height",
        }
      )
    },
    { scope: contentRef, dependencies: [filter] }
  )

  // Overdue card: the next lead slides in from the side you stepped towards.
  useGSAP(
    () => {
      const dir = odDir.current
      odDir.current = 0
      if (!dir || !odRef.current) return
      gsap.fromTo(
        odRef.current.querySelectorAll("[data-od-slide]"),
        { x: dir * 24, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.25,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      )
      gsap.fromTo(
        odRef.current.querySelector("[data-od-num]"),
        { yPercent: dir * 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.25,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      )
    },
    { scope: odRef, dependencies: [od] }
  )

  // Bell badge: a small pop when the count changes (not on first show).
  const pending = [...overdue, ...today.filter((l) => !l.follow_up_done_at)]
  useGSAP(
    () => {
      const was = bellCount.current
      bellCount.current = pending.length
      if (was === null || was === pending.length || reduceMotion()) return
      gsap.fromTo(
        "[data-bell-badge]",
        { scale: 0.6 },
        { scale: 1, duration: 0.25, ease: "power3.out", clearProps: "scale" }
      )
    },
    { scope: contentRef, dependencies: [pending.length] }
  )

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

  // Rail highlight: one pill slides to the active row instead of each row
  // swapping its own background. Placed without motion on first render.
  const pillPlaced = React.useRef(false)
  useGSAP(
    () => {
      const row = railRef.current?.querySelector<HTMLElement>(
        `[data-nav-row="${nav}"]`
      )
      if (!row) return
      const y = row.offsetTop
      if (!pillPlaced.current || reduceMotion()) {
        pillPlaced.current = true
        gsap.set(pillRef.current, { y })
        return
      }
      gsap.to(pillRef.current, { y, duration: 0.4, ease: "power3.inOut" })
    },
    { scope: railRef, dependencies: [nav] }
  )

  // Rail open/close: the width glides between 76 and 220px while the labels
  // fade (in after it starts opening, out before it finishes closing). Icons
  // never move: rows keep the same left padding in both states.
  useGSAP(
    () => {
      const labels = "[data-rail-label]"
      const to = { width: rail ? 220 : 76 }
      if (!railMounted.current) {
        railMounted.current = true
        gsap.set(railRef.current, to)
        gsap.set(labels, { autoAlpha: rail ? 1 : 0 })
        return
      }
      const mm = gsap.matchMedia()
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        ({ conditions }) => {
          const d = conditions?.reduce ? 0 : 1
          gsap.to(railRef.current, {
            ...to,
            duration: 0.45 * d,
            ease: "power3.inOut",
          })
          gsap.to(labels, {
            autoAlpha: rail ? 1 : 0,
            duration: (rail ? 0.25 : 0.15) * d,
            delay: rail ? 0.15 * d : 0,
            ease: rail ? "power2.out" : "power2.in",
          })
        }
      )
    },
    { scope: railRef, dependencies: [rail] }
  )

  React.useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Layout breakpoints follow the content width (frame minus rail), as in the design.
  const cw = w - (rail ? 230 : 86)
  const narrow = cw < 820
  const compact = cw < 1154
  const odW = cw < 914 ? 290 : 330
  const bigSize = cw < 914 ? 60 : cw < 1254 ? 72 : 84
  const heroH = narrow ? 780 : compact ? 600 : 540
  // Stacked layouts scroll the content column, so their rows take their
  // content's full height (max-content); `auto` rows in this fixed-height
  // grid would shrink and let panels overlap.
  const stackedRows = (n: number) => Array(n).fill("max-content").join(" ")
  const subVisible = cw >= 1000
  const pageStyle: React.CSSProperties = { gridColumn: "1 / -1" }

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
          date: stamp(d.created_at),
          note: d.note,
          follow: d.follow_up_at ? stamp(d.follow_up_at) : undefined,
        })),
        { date: stamp(selLead.created_at), note: "Lead created", system: true },
      ]
    : []
  const fuLeft = today.filter((l) => !l.follow_up_done_at).length
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
  const odLead = overdue[Math.min(od, overdue.length - 1)]
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

  const readStrip = () => {
    const el = stripRef.current
    if (!el) return
    setStripEdge({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    })
  }
  // One page of tiles per press; snapping lines the result up on a tile.
  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({
      left: dir * (el.clientWidth + 8),
      behavior: reduceMotion() ? "auto" : "smooth",
    })
  }
  const stripArrow = (dir: 1 | -1) => (
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

  // Opening Follow-ups: start the strip at the first tile still to do.
  React.useEffect(() => {
    const el = stripRef.current
    if (view !== 2 || !el) return
    const next = [...el.children].find(
      (c) => c instanceof HTMLElement && !c.dataset.fuDone
    ) as HTMLElement | undefined
    el.scrollLeft = next ? next.offsetLeft - el.offsetLeft : 0
    readStrip()
  }, [view])

  // Overdue card: the current lead slides out, then the swap (the effect
  // slides the next one in). contextSafe so the tweens join the GSAP context.
  const stepOd = (dir: 1 | -1) =>
    contextSafe(() => {
      const n = overdue.length
      if (n < 2) return
      const next = (Math.min(od, n - 1) + dir + n) % n
      const el = odRef.current
      if (reduceMotion() || !el) return setOd(next)
      const out = {
        opacity: 0,
        duration: 0.12,
        ease: "power2.out",
        overwrite: true,
      }
      gsap.to(el.querySelector("[data-od-num]"), {
        ...out,
        yPercent: -dir * 100,
      })
      gsap.to(el.querySelector("[data-od-slide]"), {
        ...out,
        x: -dir * 24,
        onComplete: () => {
          odDir.current = dir
          setOd(next)
        },
      })
    })()

  /** Download the selected period's report as CSV: summary, chart bars,
   *  funnel and sources, from the report already loaded for this tab. */
  const exportReport = () => {
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
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
    // BOM so spreadsheet apps read ₹ and other UTF-8 correctly.
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
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

  const railNotch = (title: string, sub?: string) => (
    <Notch corner="tl" className="flex items-center gap-2">
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
  const themeButton = (
    <RoundButton onClick={toggleTheme} title="Toggle theme">
      <Sun {...ic} className="hidden dark:block" />
      <Moon {...ic} className="dark:hidden" />
    </RoundButton>
  )
  // Bell: how many follow-ups need you (overdue + still to do today); the
  // menu lists them, and an item opens that lead.
  const bellButton = (
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
            className="relative transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100"
          />
        }
      >
        <Bell {...ic} />
        {pending.length > 0 && (
          <span
            data-bell-badge
            className="absolute top-3 right-3 grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1 text-[11px] leading-none font-medium text-white tabular-nums shadow-[0_0_0_2px_var(--background)]"
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
  const addButton = (
    <Button
      size="icon-lg"
      className="size-16 min-w-16 rounded-full p-0"
      aria-label="Add lead"
      title="Add lead"
      onClick={openAdd}
    >
      <Plus {...ic} className="size-5" />
    </Button>
  )
  // Theme + the orange action (Add lead; Export on Reports) are one unit:
  // every view has it, so it always morphs and never fades.
  const actions = (orange: React.ReactNode) => (
    <div data-flip-id="actions" className="flex items-center gap-2">
      {themeButton}
      {orange}
    </div>
  )
  /** Figures with a leader line. `row` lays them out side by side
   *  (left-aligned) instead of stacked on the hero's right; `cols` puts
   *  them in that many columns, wrapping onto further rows. */
  const callouts = (
    items: { value: string; label: string }[],
    row = compact,
    cols?: number
  ) => (
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
  const bigNumber = (v: string) => (
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

  const counts = dash?.by_status ?? ZERO_COUNTS
  const max = Math.max(1, ...Object.values(counts))
  const bmax = Math.max(1, ...rep.bars.map((b) => b.value))
  const funnel = Object.fromEntries(
    rep.funnel.map((f) => [f.status, mode === "Count" ? f.count : f.value])
  ) as Record<Status, number>
  const fmax = Math.max(1, ...Object.values(funnel))

  return (
    // Black bezel + a screen-sized rounded frame. The page never scrolls:
    // panels fill the frame and their lists scroll inside them. Only when the
    // dashboard/reports layout stacks (compact) does the content column scroll.
    <div className="box-border h-dvh overflow-hidden bg-black p-2 text-foreground">
      <div
        ref={frameRef}
        className="box-border flex h-full gap-2.5 overflow-hidden rounded-[44px] bg-card p-2.5"
      >
        {/* Rail */}
        <nav
          ref={railRef}
          className="dark relative z-5 box-border flex w-[76px] min-w-0 flex-none flex-col items-stretch gap-2 overflow-hidden rounded-[38px] bg-background p-3 text-foreground"
        >
          <span
            ref={pillRef}
            aria-hidden
            className="pointer-events-none absolute top-0 right-3 left-3 h-13 rounded-full bg-foreground"
          />
          <div className="mb-1 flex h-13 items-center gap-3">
            <div className="grid size-13 flex-none place-items-center rounded-full bg-card">
              <span className="flex items-end gap-[3px]">
                <span className="h-2.5 w-1.5 rounded-[3px] bg-foreground" />
                <span className="h-4 w-1.5 rounded-[3px] bg-foreground" />
                <span className="h-[22px] w-1.5 rounded-[3px] bg-highlight" />
              </span>
            </div>
            <span
              data-rail-label
              className="invisible text-lg font-medium whitespace-nowrap opacity-0"
            >
              LeadFlow
            </span>
          </div>
          {NAV.map(([label, Icon], i) => (
            <RailRow
              key={label}
              label={label}
              index={i}
              active={nav === i}
              onClick={() => go(i)}
            >
              <Icon {...ic} />
            </RailRow>
          ))}
          <div className="flex-1" />
          <RailRow label="Log out" active={false} onClick={logOut}>
            <LogOut {...ic} />
          </RailRow>
          <div className="flex items-center gap-3">
            <div className="grid size-13 flex-none place-items-center rounded-full bg-attention text-[15px] font-medium text-attention-foreground">
              {initials(user.name || user.email)}
            </div>
            <span
              data-rail-label
              className="invisible flex min-w-0 flex-col gap-px whitespace-nowrap opacity-0"
            >
              <span className="truncate text-sm font-medium">
                {user.name || user.email}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
          </div>
        </nav>

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
                : view === 3 && compact
                  ? stackedRows(1)
                  : "1fr",
          }}
        >
          {view === 0 && (
            <>
              {/* Hero */}
              <div className="relative min-w-0" style={{ minHeight: heroH }}>
                <Hero padding="104px 36px 30px">
                  <div className="flex flex-wrap justify-between gap-6">
                    <div className="flex flex-col gap-3.5">
                      <h1
                        data-roll="h1"
                        className="m-0 text-[30px] leading-[1.15] font-light"
                      >
                        Pipeline
                        <span className="block text-muted-foreground">
                          Open deals
                        </span>
                      </h1>
                      <div className="flex items-baseline gap-3">
                        {bigNumber(money(dash?.open_value ?? 0))}
                        <span className="text-[15px] font-medium text-muted-foreground">
                          open value
                        </span>
                      </div>
                    </div>
                    {callouts([
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
                    ])}
                  </div>
                  <div className="min-h-10 flex-1" />
                  <div
                    className="box-content flex h-[220px] flex-none items-end gap-2"
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
                          className="flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end gap-2.5 border-0 bg-transparent p-0 text-left text-foreground"
                        >
                          <div
                            data-bar
                            className={cn(
                              "box-border flex min-h-14 items-start rounded-[20px] px-3.5 py-3 transition-[opacity,background] duration-200",
                              on ? "bg-foreground" : "bg-card",
                              dim && "opacity-45"
                            )}
                            style={{
                              height:
                                Math.max(22, (counts[name] / max) * 100) + "%",
                            }}
                          >
                            <span
                              className={cn(
                                "text-[28px] font-light tabular-nums",
                                on ? "text-background" : "text-foreground"
                              )}
                            >
                              {counts[name]}
                            </span>
                          </div>
                          <span className="flex items-center gap-1.5 overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap">
                            <Dot color={dot} />
                            {name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </Hero>

                {railNotch("LeadFlow", todayShort)}

                <Notch corner="tr" className="flex items-center gap-2">
                  {!narrow && (
                    <RoundButton
                      data-flip-id="btn-search"
                      title="Search (⌘K)"
                      onClick={() => setPalette(true)}
                    >
                      <Search {...ic} />
                    </RoundButton>
                  )}
                  {bellButton}
                  {actions(addButton)}
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
                    ? { gridColumn: 1, gridRow: 3, flexWrap: "wrap" }
                    : {
                        gridRow: "span 2",
                        flexDirection: "column",
                        minHeight: 0,
                      }
                }
              >
                <section
                  className="flex min-h-0 flex-[1_1_300px] flex-col gap-[18px] rounded-xl bg-background p-6"
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
                            <span
                              className={cn(
                                "truncate text-sm font-medium",
                                done && "line-through"
                              )}
                            >
                              {l.name}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {hhmm(l.next_follow_up_at)} ·{" "}
                              {l.last_note?.note ?? "Follow up"}
                            </span>
                          </button>
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

                <section className="flex min-h-0 flex-[1_1_300px] flex-col gap-[18px] overflow-y-auto rounded-xl bg-brand-surface p-6 text-brand-ink">
                  <div className="flex items-start justify-between">
                    <Title
                      title="Filter"
                      sub="By status"
                      subClass="opacity-70"
                    />
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
                      <span className="text-[13px] font-medium">
                        Won this month
                      </span>
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
              >
                <div className="flex min-h-[58px] items-start justify-between pr-[200px]">
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
                <LeadTable rows={list.results} onOpen={openLead} />
              </section>
            </>
          )}

          {view === 1 && (
            <div
              className="flex min-h-0 min-w-0 flex-col gap-2.5"
              style={{ ...pageStyle, minHeight: (cw < 1114 ? 500 : 380) + 230 }}
            >
              <div
                className="relative min-w-0"
                style={{ minHeight: cw < 1114 ? 500 : 380 }}
              >
                <Hero padding="104px 36px 30px">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-muted-foreground">
                        Open value
                      </span>
                      {bigNumber(money(leadStats?.open_value ?? 0))}
                    </div>
                    {callouts(
                      [
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
                      ],
                      true
                    )}
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
                            {name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </Hero>
                {railNotch(
                  "Leads",
                  `${countOf("All", leadStats?.by_status)} total`
                )}
                <Notch corner="tr" className="flex items-center gap-2">
                  {actions(addButton)}
                </Notch>
              </div>

              <section
                data-flip-id="leads-card"
                className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 rounded-xl bg-background p-6"
              >
                <div className="flex min-h-[58px] items-start justify-between pr-[720px]">
                  <Title title="Leads" sub={filterLabel} subRoll="list-sub" />
                </div>
                <Notch
                  corner="tr"
                  data-swap
                  className="flex items-center gap-2"
                >
                  <Segmented
                    aria-label="Sort leads"
                    className="h-13 p-[5px]"
                    itemClass="h-[42px] px-[18px]"
                    options={["Recent", "Value", "Name"] as const}
                    value={sort}
                    onChange={(v) => {
                      captureRows()
                      setSort(v)
                      setPage(0)
                    }}
                  />
                  <div className="box-border flex h-13 w-[240px] items-center gap-2.5 rounded-full bg-background px-[18px]">
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
                  <div className="box-border flex h-13 items-center rounded-full bg-background px-1">
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
                        <span className="text-muted-foreground">
                          of {pageCount}
                        </span>
                      </span>
                      <Button
                        size="icon-lg"
                        className="size-11 min-w-11 rounded-full p-0"
                        aria-label="Next page"
                        title="Next page"
                        disabled={page >= pageCount - 1}
                        onClick={() =>
                          setPage(Math.min(pageCount - 1, page + 1))
                        }
                      >
                        <ArrowRight {...sm} />
                      </Button>
                    </div>
                  </div>
                </Notch>
                <LeadTable
                  rows={list.results}
                  onOpen={openLead}
                  onEdit={openEdit}
                />
              </section>
            </div>
          )}

          {view === 2 && (
            <div
              className="flex min-h-0 min-w-0 flex-col gap-2.5"
              style={{ ...pageStyle, minHeight: 480 + 230 }}
            >
              <div className="relative min-w-0" style={{ minHeight: 480 }}>
                <Hero padding="104px 36px 118px">
                  <h1
                    data-roll="h1"
                    className="m-0 text-[30px] leading-[1.15] font-light"
                  >
                    Today
                    <span className="block text-muted-foreground">
                      {todayShort}
                    </span>
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
                          l.follow_up_done_at
                            ? "Mark as not done"
                            : "Mark as done"
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
                          <span className="truncate text-sm font-medium">
                            {l.name}
                          </span>
                          <span className="truncate text-xs opacity-70">
                            {l.last_note?.note ?? "Follow up"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Hero>
                {railNotch("Follow-ups", `${fuLeft} left today`)}
                {stripArrow(-1)}
                {stripArrow(1)}
                <Notch corner="b">
                  <div className="box-border flex w-[280px] items-center justify-between gap-3 rounded-[28px] bg-attention px-[22px] py-4 text-attention-foreground">
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium">
                        Done today
                      </span>
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
                  {bellButton}
                  {actions(addButton)}
                </Notch>
              </div>

              <div
                className="grid min-h-0 flex-1 gap-2.5"
                style={{
                  gridTemplateColumns:
                    cw < 1014
                      ? "minmax(0,1fr)"
                      : "minmax(0,1.4fr) minmax(0,1fr)",
                  gridTemplateRows:
                    cw < 1014 ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
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
                    <Title
                      title="Overdue"
                      sub="Needs a reply"
                      subClass="opacity-70"
                    />
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
                      <span className="text-sm opacity-70">
                        {overdueNote(o)}
                      </span>
                    </button>
                  ))}
                </section>
              </div>
            </div>
          )}

          {view === 3 && (
            <div
              className="grid min-h-0 min-w-0 gap-2.5"
              style={{
                ...pageStyle,
                minHeight: compact ? undefined : heroH + 230,
                gridTemplateColumns: compact
                  ? "minmax(0,1fr)"
                  : "minmax(0,1.4fr) minmax(0,1fr)",
                gridTemplateRows: compact
                  ? stackedRows(3)
                  : "auto minmax(220px,1fr)",
              }}
            >
              <div
                className="relative col-span-full min-w-0"
                // Room for two rows of figures above the win-rate notch.
                style={{ minHeight: heroH + 40 }}
              >
                <Hero padding="104px 36px 30px">
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
                        {bigNumber(money(rep.revenue))}
                      </div>
                      {callouts(
                        [
                          { value: String(rep.deals_won), label: "Deals won" },
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
                        ],
                        true,
                        2
                      )}
                    </div>
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
                                "box-border flex min-h-11 items-start overflow-hidden rounded-[18px] px-2.5 py-3 transition-[height] duration-300",
                                last ? "bg-foreground" : "bg-card",
                                v === 0 && "opacity-45"
                              )}
                              style={{ height: (v / bmax) * 100 + "%" }}
                            >
                              <span
                                className={cn(
                                  "text-sm font-normal whitespace-nowrap tabular-nums",
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
                {railNotch("Reports", "Updated " + todayShort.split(", ")[1])}
                <Notch corner="tr" className="flex items-center gap-2">
                  <Segmented
                    data-flip-id="periods"
                    className="h-16 p-1.5"
                    itemClass={cn("h-13", cw < 1014 ? "px-3" : "px-[18px]")}
                    options={PERIODS}
                    value={period}
                    onChange={pickPeriod}
                  />
                  {actions(
                    <Button
                      size="icon-lg"
                      className="size-16 min-w-16 rounded-full p-0"
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
                  )}
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
                <div className="min-h-[58px] pr-[200px]">
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
                      className="grid grid-cols-[130px_minmax(0,1fr)_84px] items-center gap-3.5 px-1"
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
                  <span
                    data-roll="src-leads"
                    className="text-[13px] font-medium"
                  >
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
          )}
        </div>
      </div>

      {/* Lead timeline */}
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="right" showCloseButton={false} style={SHEET_STYLE}>
          <NotchedSurface />
          <CloseButton onClick={() => setSheet(false)} />
          <SheetHeader>
            <SheetTitle>{selLead?.name}</SheetTitle>
            <SheetDescription>
              {[
                selLead?.company,
                selLead?.phone,
                selLead?.source,
                money(selLead?.value ?? 0),
              ]
                .filter(Boolean)
                .join(" · ")}
            </SheetDescription>
          </SheetHeader>
          <div
            role="group"
            aria-label="Status"
            className="flex flex-wrap gap-1.5 px-4 pb-2"
          >
            {STAGES.map(([name, dot]) => {
              const on = selLead?.status === name
              return (
                <button
                  key={name}
                  aria-pressed={on}
                  onClick={() => setStatus(name)}
                  className={cn(
                    "flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-0 px-3 text-xs font-medium transition-colors duration-200",
                    on
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-secondary"
                  )}
                >
                  <Dot color={dot} />
                  {name}
                </button>
              )
            })}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-4">
            {timeline.map((t, i) =>
              t.system ? (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                  {t.note} · {t.date}
                </div>
              ) : (
                <div
                  key={i}
                  className="flex flex-col gap-1 rounded-[18px] bg-muted px-4 py-3 text-sm"
                >
                  <span className="text-xs text-muted-foreground">
                    {t.date}
                  </span>
                  {t.note}
                  {t.follow && (
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                      <Calendar size={12} strokeWidth={1.75} />
                      Follow-up {t.follow}
                    </span>
                  )}
                </div>
              )
            )}
          </div>
          <SheetFooter>
            <form onSubmit={addNote} className="flex flex-col gap-2.5">
              <Label htmlFor="note" className="sr-only">
                Note
              </Label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was discussed?"
                className="w-full resize-none rounded-[18px] border border-transparent bg-input/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={fuOn}
                  onChange={(e) => setFuOn(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Set follow-up
              </label>
              <DateTimePicker
                id="follow-up-at"
                value={fuAt}
                onChange={setFuAt}
                disabled={!fuOn}
                placeholder="Pick the follow-up date and time"
              />
              <Button type="submit" disabled={!note.trim() || saving}>
                Save note
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
      <Dialog open={add} onOpenChange={setAdd}>
        <DialogContent showCloseButton={false} style={POPUP_STYLE}>
          <NotchedSurface />
          <CloseButton onClick={() => setAdd(false)} />
          <form onSubmit={saveLead} className="contents">
            <DialogHeader>
              <DialogTitle>
                {editLead ? "Edit lead" : "Add new lead"}
              </DialogTitle>
              <DialogDescription>
                {editLead
                  ? "Only the fields you change are saved."
                  : "Only the name is required."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3.5">
              {(
                [
                  ["name", "Full name", "text"],
                  ["company", "Company", "text"],
                  ["phone", "Phone", "tel"],
                  ["value", "Estimated value (₹)", "number"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key} className="flex flex-col gap-2">
                  <Label htmlFor={"lead-" + key}>{label}</Label>
                  <Input
                    id={"lead-" + key}
                    type={type}
                    required={key === "name"}
                    {...(key === "value" && {
                      min: 0,
                      step: 1,
                      inputMode: "numeric" as const,
                      placeholder: "0",
                    })}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <Label htmlFor="lead-source">Source</Label>
                <Select
                  items={SOURCE_ITEMS}
                  value={form.source || NO_SOURCE}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      source: v === NO_SOURCE ? "" : (v as SourceEnum),
                    })
                  }
                >
                  <SelectTrigger id="lead-source" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_ITEMS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!form.name.trim() || saving}>
                {saving ? "Saving…" : editLead ? "Save changes" : "Save lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Hero({
  padding,
  children,
}: {
  padding: string
  children: React.ReactNode
}) {
  return (
    <div
      data-hero
      data-flip-id="hero"
      className="dark relative box-border flex h-full min-h-[inherit] flex-col overflow-hidden rounded-xl bg-background text-foreground"
      style={{ padding }}
    >
      {children}
    </div>
  )
}

function Title({
  title,
  sub,
  subClass = "text-muted-foreground",
  subRoll,
}: {
  title: string
  sub: string
  subClass?: string
  /** data-roll key, when the subtitle changes in place. */
  subRoll?: string
}) {
  return (
    <h2 className="m-0 text-2xl leading-[1.2] font-light">
      {title}
      <span data-roll={subRoll} className={cn("block", subClass)}>
        {sub}
      </span>
    </h2>
  )
}

function RoundButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      aria-label={props.title}
      className={cn(
        "grid size-16 flex-none cursor-pointer place-items-center rounded-full border-0 bg-background text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AttentionButton(props: React.ComponentProps<"button">) {
  return (
    <button
      aria-label={props.title}
      className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-attention-foreground text-attention"
      {...props}
    />
  )
}

function RailRow({
  label,
  index,
  active,
  onClick,
  children,
}: {
  label: string
  index?: number
  active: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      data-nav-row={index}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative box-border flex h-13 w-full min-w-13 cursor-pointer items-center gap-3 overflow-hidden rounded-full border-0 bg-transparent px-4 transition-colors duration-200 [&>svg]:shrink-0",
        // Hover tints only rows the sliding pill isn't on (Tailwind's hover:
        // already skips touch screens).
        active
          ? "text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
      <span
        data-rail-label
        className="invisible text-sm font-medium whitespace-nowrap opacity-0"
      >
        {label}
      </span>
    </button>
  )
}

/** Pill toggle whose dark highlight slides to the chosen option (FLIP: the
 *  highlight renders inside the active button, then tweens from where the
 *  old one was). */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  itemClass,
  ...props
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  itemClass?: string
} & Omit<React.ComponentProps<"div">, "onChange">) {
  const ref = React.useRef<HTMLDivElement>(null)
  const from = React.useRef<DOMRect | null>(null)
  const pill = () => ref.current?.querySelector<HTMLElement>("[data-seg-pill]")
  useGSAP(
    () => {
      const old = from.current
      from.current = null
      const el = pill()
      if (!old || !el) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const now = el.getBoundingClientRect()
      gsap.fromTo(
        el,
        { x: old.left - now.left, width: old.width },
        {
          x: 0,
          width: now.width,
          duration: 0.4,
          ease: "power3.inOut",
          clearProps: "transform,width",
        }
      )
    },
    { scope: ref, dependencies: [value] }
  )
  return (
    <div
      ref={ref}
      className={cn(
        "box-border flex gap-1 rounded-full bg-background",
        className
      )}
      {...props}
    >
      {options.map((name) => {
        const on = name === value
        return (
          <button
            key={name}
            aria-pressed={on}
            onClick={() => {
              if (on) return
              from.current = pill()?.getBoundingClientRect() ?? null
              onChange(name)
            }}
            className={cn(
              "relative cursor-pointer rounded-full border-0 bg-transparent text-[13px] font-medium transition-colors duration-400",
              on ? "text-background" : "text-muted-foreground",
              itemClass
            )}
          >
            {on && (
              <span
                data-seg-pill
                aria-hidden
                className="absolute inset-y-0 left-0 w-full rounded-full bg-foreground"
              />
            )}
            <span className="relative z-10">{name}</span>
          </button>
        )
      })}
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="size-2 flex-none rounded-full"
      style={{ background: color }}
    />
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-10 flex-none place-items-center rounded-full bg-secondary text-[13px] font-medium">
      {initials(name)}
    </span>
  )
}

function LeadTable({
  rows,
  onOpen,
  onEdit,
}: {
  rows: Lead[]
  onOpen: (id: number) => void
  /** Leads tab only: adds a pencil to each row. */
  onEdit?: (lead: Lead) => void
}) {
  // The pencil gets its own column only where editing is offered.
  const cols = onEdit ? LEAD_COLS + " 36px" : LEAD_COLS
  return (
    <>
      <div
        className="grid gap-3 px-4 text-xs font-medium text-muted-foreground"
        style={{ gridTemplateColumns: cols }}
      >
        <span>Name</span>
        <span>Status</span>
        <span>Last note</span>
        <span className="text-right">Value</span>
        {onEdit && <span />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {rows.map((l) => (
          // The row is a plain container: a full-size button underneath opens
          // the lead, and the pencil sits above it (no nested buttons).
          <div
            key={l.id}
            data-flip-id={"lead-" + l.id}
            className={cn(
              "group relative grid items-center gap-3 rounded-[18px] bg-card py-3 pl-4 text-left text-foreground transition-colors duration-150 hover:bg-secondary",
              onEdit ? "pr-2.5" : "pr-4"
            )}
            style={{ gridTemplateColumns: cols }}
          >
            <button
              type="button"
              aria-label={`Open ${l.name}`}
              onClick={() => onOpen(l.id)}
              className="absolute inset-0 cursor-pointer rounded-[inherit] border-0 bg-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            />
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-sm font-medium">{l.name}</span>
              <span className="text-xs text-muted-foreground">
                {l.company || "—"}
              </span>
            </span>
            <span className="flex min-w-0 flex-col items-start gap-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-[3px] text-xs font-medium">
                <Dot color={DOT[l.status]} />
                {l.status}
              </span>
              {nextOf(l) && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar size={12} strokeWidth={1.75} />
                  {nextOf(l)}
                </span>
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[13px]">
                {l.last_note?.note ?? "No notes yet"}
              </span>
              <span className="text-xs text-muted-foreground">
                {ago(lastAt(l))}
              </span>
            </span>
            <span className="text-right text-[15px] font-light tabular-nums">
              {money(l.value ?? 0)}
            </span>
            {onEdit && (
              <button
                type="button"
                title="Edit lead"
                aria-label={`Edit ${l.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(l)
                }}
                className="relative grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 bg-secondary text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out group-hover:bg-card hover:bg-foreground! hover:text-card active:scale-[0.94] motion-reduce:active:scale-100"
              >
                <Pencil size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-7 text-sm text-muted-foreground">
            No leads match this filter.
          </div>
        )}
      </div>
    </>
  )
}

/** The lead's next follow-up, if one is open: "Today, 15:15" or a date. */
const nextOf = (l: Lead) => {
  if (!l.next_follow_up_at || l.follow_up_done_at) return ""
  const d = new Date(l.next_follow_up_at)
  return d.toDateString() === new Date().toDateString()
    ? "Today, " + hhmm(l.next_follow_up_at)
    : stamp(d)
}

/** The popup's surface with its top-right corner cut out for the close button. */
function NotchedSurface() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-1 rounded-[inherit]"
      style={{
        filter:
          "drop-shadow(0 1px 2px rgb(0 0 0 / 0.06)) drop-shadow(0 12px 32px rgb(0 0 0 / 0.14))",
      }}
    >
      <div style={NOTCH_MASK} />
    </div>
  )
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon-lg"
      aria-label="Close"
      title="Close"
      onClick={onClick}
      className="absolute top-0 right-0 z-1 size-12 min-w-12 rounded-full p-0"
    >
      <X {...ic} className="size-5" />
    </Button>
  )
}

const initials = (name: string) =>
  name
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})
const money = (v: number) => inr.format(v)
/** "15 Oct, 2:00 pm" */
const stamp = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
/** "15:15" in local time. */
const hhmm = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""
/** When the lead was last touched: its newest note, else its creation. */
const lastAt = (l: Lead) => l.last_note?.created_at ?? l.created_at
/** "Just now", "5 min ago", "2 hours ago", "Yesterday", "3 days ago", "12 Oct". */
const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  if (mins < 24 * 60) {
    const h = Math.round(mins / 60)
    return `${h} hour${h === 1 ? "" : "s"} ago`
  }
  const days = Math.round(mins / 1440)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}
const pct = (v?: number | null) => (v == null ? "—" : v + "%")
const points = (n: number) => `${n} point${n === 1 ? "" : "s"}`
/** "Kite Labs · was due 2 days ago" */
const overdueNote = (l: Lead) =>
  [l.company, "was due " + ago(l.next_follow_up_at ?? l.created_at)]
    .filter(Boolean)
    .join(" · ")
/** Upcoming follow-ups grouped by day: [["Thu, 16 Oct", leads], …]. */
const byDay = (list: Lead[]) => {
  const groups = new Map<string, Lead[]>()
  for (const l of list) {
    const day = new Date(
      l.next_follow_up_at ?? l.created_at
    ).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    groups.set(day, [...(groups.get(day) ?? []), l])
  }
  return [...groups]
}
/** One CSV cell: quoted when it holds a comma, quote or line break. */
const csvCell = (v: string | number | null) => {
  const t = v == null ? "" : String(v)
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}
/** Unwrap an SDK result: hand the data to `apply`, or throw the API error. */
async function got<T>(
  call: Promise<{ data?: T; error?: unknown; response?: Response }>,
  apply: (data: T) => void
) {
  const { data, error, response } = await call
  if (error !== undefined || data === undefined)
    throw new ApiFailure(error, response?.status)
  apply(data)
}
// Short bar labels: ₹42.6k, ₹1.2L.
const kfmt = (v: number) =>
  v === 0
    ? "—"
    : v >= 100000
      ? "₹" + (v / 100000).toFixed(1).replace(".0", "") + "L"
      : v >= 1000
        ? "₹" + (v / 1000).toFixed(1).replace(".0", "") + "k"
        : "₹" + v

const NOTCH_SVG =
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="78" height="78"><path d="M0 0H78V78A20 20 0 0 0 58 58H54A34 34 0 0 1 20 24V20A20 20 0 0 0 0 0Z"/></svg>'
  ) +
  '")'
const NOTCH_MASK: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "var(--popover)",
  borderRadius: "inherit",
  maskImage: "linear-gradient(#000,#000), " + NOTCH_SVG,
  WebkitMaskImage: "linear-gradient(#000,#000), " + NOTCH_SVG,
  maskPosition: "0 0, top right",
  WebkitMaskPosition: "0 0, top right",
  maskSize: "100% 100%, 78px 78px",
  WebkitMaskSize: "100% 100%, 78px 78px",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskComposite: "exclude",
  WebkitMaskComposite: "xor",
}
// The popup itself is transparent; NotchedSurface paints it.
const POPUP_STYLE: React.CSSProperties = {
  background: "transparent",
  boxShadow: "none",
  border: 0,
  isolation: "isolate",
}
const SHEET_STYLE: React.CSSProperties = {
  ...POPUP_STYLE,
  top: 6,
  right: 6,
  bottom: 6,
  height: "auto",
  borderRadius: 32,
}

// Morphing ids each view renders (besides lead rows): what both sides of a
// switch share morphs, the rest fades. Keep in sync with the markup.
const SHAPE_IDS = [
  "hero",
  "notch-tl",
  "notch-tr",
  "btn-rail",
  "title-pill",
  "actions",
]
const VIEW_FLIP: Record<number, string[]> = {
  0: [
    ...SHAPE_IDS,
    "notch-att",
    "btn-search",
    "btn-bell",
    "big",
    "callouts",
    "leads-card",
  ],
  1: [...SHAPE_IDS, "big", "callouts", "leads-card"],
  2: [...SHAPE_IDS, "notch-att", "btn-bell"],
  3: [...SHAPE_IDS, "notch-att", "periods", "big", "callouts"],
}

const STAGES = [
  ["New", "var(--status-new)"],
  ["Contacted", "var(--status-contacted)"],
  ["Qualified", "var(--status-qualified)"],
  ["Proposal Sent", "var(--status-proposal)"],
  ["Won", "var(--status-won)"],
  ["Lost", "var(--status-lost)"],
] as const
const CHIPS: (readonly ["All" | Status, string | null])[] = [
  ["All", null],
  ...STAGES,
]
const DOT = Object.fromEntries(STAGES) as Record<Status, string>
const NAV = [
  ["Dashboard", House],
  ["Leads", Users],
  ["Follow-ups", Calendar],
  ["Reports", ChartColumn],
] as const

const SORT_KEY = { Recent: "recent", Value: "value", Name: "name" } as const
const EMPTY_PAGE: PaginatedLead = {
  count: 0,
  next: null,
  previous: null,
  results: [],
}
const PERIODS = ["Week", "Month", "Quarter"] as const
const PERIOD_KEY = { Week: "week", Month: "month", Quarter: "quarter" } as const
const PERIOD_LABEL = {
  Week: "This week",
  Month: "This month",
  Quarter: "This quarter",
} as const
const ZERO_COUNTS = Object.fromEntries(STAGES.map(([s]) => [s, 0])) as Record<
  Status,
  number
>
// Shown until a period's report arrives.
const EMPTY_REPORT: ReportsStats = {
  period: "month",
  revenue: 0,
  deals_won: 0,
  avg_deal: 0,
  avg_days_to_close: null,
  win_rate: null,
  prev_win_rate: null,
  bars: [],
  funnel: STAGES.map(([status]) => ({ status, count: 0, value: 0 })),
  leads: 0,
  sources: [],
}
const BLANK_FORM = {
  name: "",
  company: "",
  phone: "",
  value: "",
  source: "" as SourceEnum | "",
}
const SOURCE_OPTIONS: SourceEnum[] = [
  "Website form",
  "Referral",
  "LinkedIn",
  "Cold email",
  "Events",
  "Other",
]
// Source picker: "Not recorded" is the empty source.
const NO_SOURCE = "none"
const SOURCE_ITEMS = [
  { value: NO_SOURCE, label: "Not recorded" },
  ...SOURCE_OPTIONS.map((o) => ({ value: o, label: o })),
]
// Segment opacity by source rank (the API sorts sources largest first).
const ink = (rank: number) => [1, 0.78, 0.58, 0.42, 0.28][rank] ?? 0.2
