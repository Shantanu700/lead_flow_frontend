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

import { refreshCsrf } from "@/lib/api"
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
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { deleteCoreLogin } from "@/src/client/sdk.gen"
import { cn } from "@/lib/utils"

// ponytail: sample data until /api/leads/ exists; swap state seeds for SDK calls.

type Status = (typeof STAGES)[number][0]
type Lead = {
  id: number
  name: string
  company: string
  phone: string
  status: Status
  last: string
  value: number
  /** Latest discussion note, previewed in the list. */
  note: string
  /** Next follow-up set from a note ("" when none). */
  next: string
  created: string
}
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
  const [fu, setFu] = React.useState(FU.map((f) => f.done))
  // Today's follow-up strip: which ends it can still scroll towards.
  const stripRef = React.useRef<HTMLDivElement>(null)
  const [stripEdge, setStripEdge] = React.useState({ start: true, end: true })
  const [od, setOd] = React.useState(0)
  const [sheet, setSheet] = React.useState(false)
  const [sel, setSel] = React.useState(1)
  const [add, setAdd] = React.useState(false)
  const [form, setForm] = React.useState({
    name: "",
    company: "",
    phone: "",
    value: "",
  })
  const [note, setNote] = React.useState("")
  const [fuOn, setFuOn] = React.useState(false)
  const [fuDate, setFuDate] = React.useState("")
  const [fuTime, setFuTime] = React.useState("")
  const [sort, setSort] = React.useState<Sort>("Recent")
  const [leads, setLeads] = React.useState(LEADS)
  // Each lead's discussions, newest first; seeded with its latest note.
  const [notes, setNotes] = React.useState<Record<number, Note[]>>(() =>
    Object.fromEntries(
      LEADS.map((l) => [l.id, [{ date: l.last, note: l.note }]])
    )
  )
  const [period, setPeriod] = React.useState<keyof typeof SERIES>("Month")
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
    (v === 0
      ? shown.slice(0, 5)
      : v === 1
        ? shown.slice(page * 10, page * 10 + 10)
        : []
    ).map((l) => "lead-" + l.id)

  useGSAP(
    () => {
      const grid = contentRef.current
      if (!grid) return
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
              { opacity: 1 },
              { opacity: 0, clearProps: "opacity", ...land }
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
    { scope: contentRef, dependencies: [view], revertOnUpdate: true }
  )

  const { contextSafe } = useGSAP({ scope: contentRef })
  // contextSafe at click time, so the exit tweens join the GSAP context.
  const go = (next: number) =>
    contextSafe(() => {
      if (next === view || switching.current) return
      setNav(next)
      if (reduceMotion()) return setView(next)
      const grid = contentRef.current
      if (!grid) return setView(next)
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
          switching.current = false
          setView(next)
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
    { scope: contentRef, dependencies: [sort, filter, q, leads] }
  )

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
  const heroH = narrow ? 740 : compact ? 600 : 540
  const subVisible = cw >= 1000
  const pageStyle: React.CSSProperties = { gridColumn: "1 / -1" }

  const today = new Date()
  const todayShort = today.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })

  const shown = leads
    .filter(
      (l) =>
        (filter === "All" || l.status === filter) &&
        (l.name + l.company + l.note).toLowerCase().includes(q.toLowerCase())
    )
    .sort((a, b) =>
      sort === "Value"
        ? b.value - a.value
        : sort === "Name"
          ? a.name.localeCompare(b.name)
          : agoRank(a.last) - agoRank(b.last)
    )
  const pageCount = Math.max(1, Math.ceil(shown.length / 10))
  const page = Math.min(pageIdx, pageCount - 1)
  const selLead = leads.find((l) => l.id === sel) ?? leads[0]
  const timeline: Note[] = [
    ...(notes[selLead.id] ?? []),
    { date: selLead.created, note: "Lead created", system: true },
  ]
  const open = leads.filter((l) => l.status !== "Won" && l.status !== "Lost")
  const closed = leads.length - open.length
  const fuLeft = fu.filter((d) => !d).length
  const filterLabel = filter === "All" ? "All statuses" : filter
  const countOf = (name: string) =>
    name === "All"
      ? leads.length
      : leads.filter((l) => l.status === name).length

  // Lead rows glide to their new order when the list changes (sort, filter,
  // search, status); rows that newly appear fade in. Call before the change.
  const captureRows = () => {
    const rows = contentRef.current?.querySelectorAll('[data-flip-id^="lead-"]')
    if (rows?.length && !reduceMotion()) rowsState.current = Flip.getState(rows)
  }
  const pickFilter = (name: "All" | Status) => {
    captureRows()
    setFilter(name)
    setPage(0)
  }
  const openLead = (id: number) => {
    setSel(id)
    setSheet(true)
  }
  const openByName = (name: string) => {
    const l = leads.find((x) => x.name === name)
    if (l) openLead(l.id)
  }
  const toggleFu = (i: number) => {
    const next = [...fu]
    next[i] = !fu[i]
    setFu(next)
    if (next[i]) toast.success("Follow-up done.")
  }
  const saveLead = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const lead: Lead = {
      id: Math.max(...leads.map((l) => l.id)) + 1,
      name: form.name.trim(),
      company: form.company.trim() || "—",
      phone: form.phone.trim(),
      status: "New",
      last: "Just now",
      value: Math.max(0, Math.round(Number(form.value) || 0)),
      note: "",
      next: "",
      created: stamp(new Date()),
    }
    setLeads([lead, ...leads])
    setForm({ name: "", company: "", phone: "", value: "" })
    setAdd(false)
    pickFilter("All")
    toast.success("Lead saved.")
  }
  const addNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    // Keep everything typed when the follow-up is incomplete.
    if (fuOn && (!fuDate || !fuTime)) {
      toast.error("Pick both a date and a time for the follow-up.")
      return
    }
    const follow = fuOn ? stamp(new Date(`${fuDate}T${fuTime}`)) : undefined
    const entry: Note = { date: stamp(new Date()), note: note.trim(), follow }
    setNotes({ ...notes, [selLead.id]: [entry, ...(notes[selLead.id] ?? [])] })
    setLeads(
      leads.map((l) =>
        l.id === selLead.id
          ? { ...l, last: "Just now", note: entry.note, next: follow ?? l.next }
          : l
      )
    )
    setNote("")
    setFuOn(false)
    setFuDate("")
    setFuTime("")
    toast.success(follow ? "Note and follow-up saved." : "Note added.")
  }
  const setStatus = (status: Status) => {
    if (status === selLead.status) return
    captureRows()
    setLeads(leads.map((l) => (l.id === selLead.id ? { ...l, status } : l)))
    toast.success(`Moved to ${status}.`)
  }

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
  const bellButton = (
    <RoundButton
      data-flip-id="btn-bell"
      title="Notifications"
      onClick={() => go(2)}
      className="relative"
    >
      <Bell {...ic} />
      <span className="absolute top-[19px] right-[21px] size-2 rounded-full bg-highlight shadow-[0_0_0_2px_var(--background)]" />
    </RoundButton>
  )
  const addButton = (
    <Button
      size="icon-lg"
      className="size-16 min-w-16 rounded-full p-0"
      aria-label="Add lead"
      title="Add lead"
      onClick={() => setAdd(true)}
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

  const max = Math.max(...Object.values(COUNTS))
  const series = SERIES[period]
  const bmax = Math.max(...series.bars.map((b) => b[1]))
  const funnel = mode === "Count" ? COUNTS : FUNNEL_VAL
  const fmax = Math.max(...Object.values(funnel))

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
                  ? "auto auto auto"
                  : "auto minmax(220px,1fr)"
                : view === 3 && compact
                  ? "auto"
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
                          This quarter
                        </span>
                      </h1>
                      <div className="flex items-baseline gap-3">
                        {bigNumber(money(PIPELINE))}
                        <span className="text-[15px] font-medium text-muted-foreground">
                          open value
                        </span>
                      </div>
                    </div>
                    {callouts([
                      { value: "21%", label: "Conversion rate" },
                      { value: "2.4h", label: "Avg. first response" },
                      { value: "68", label: "Active leads" },
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
                                Math.max(22, (COUNTS[name] / max) * 100) + "%",
                            }}
                          >
                            <span
                              className={cn(
                                "text-[28px] font-light tabular-nums",
                                on ? "text-background" : "text-foreground"
                              )}
                            >
                              {COUNTS[name]}
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
                      title="Search"
                      onClick={() => go(1)}
                    >
                      <Search {...ic} />
                    </RoundButton>
                  )}
                  {bellButton}
                  {actions(addButton)}
                </Notch>

                <Notch corner="br" style={{ width: odW }}>
                  <div className="flex flex-col gap-3.5 rounded-[28px] bg-attention px-[22px] py-5 text-attention-foreground">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">
                        Overdue · {od + 1} of {OVERDUE.length}
                      </span>
                      <div className="flex gap-1.5">
                        <AttentionButton
                          title="Previous"
                          onClick={() =>
                            setOd((od + OVERDUE.length - 1) % OVERDUE.length)
                          }
                        >
                          <ArrowLeft {...sm} />
                        </AttentionButton>
                        <AttentionButton
                          title="Next"
                          onClick={() => setOd((od + 1) % OVERDUE.length)}
                        >
                          <ArrowRight {...sm} />
                        </AttentionButton>
                      </div>
                    </div>
                    <button
                      onClick={() => openByName(OVERDUE[od].name)}
                      className="cursor-pointer border-0 bg-transparent p-0 text-left text-[22px] leading-[1.2] font-light text-attention-foreground"
                    >
                      {OVERDUE[od].name}
                      <span className="block text-sm leading-[1.4] font-normal text-attention-foreground/70">
                        {OVERDUE[od].note}
                      </span>
                    </button>
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
                <section className="flex min-h-0 flex-[1_1_300px] flex-col gap-[18px] rounded-xl bg-background p-6">
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
                    {FU.map((f, i) => (
                      <div
                        key={f.name}
                        className={cn(
                          "flex items-center gap-3 rounded-[18px] bg-card py-3 pr-3 pl-3.5",
                          fu[i] && "opacity-55"
                        )}
                      >
                        <Avatar name={f.name} />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className={cn(
                              "truncate text-sm font-medium",
                              fu[i] && "line-through"
                            )}
                          >
                            {f.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {f.time} · {f.task}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleFu(i)}
                          title={fu[i] ? "Mark as not done" : "Mark as done"}
                          className={cn(
                            "grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 transition-colors duration-200",
                            fu[i]
                              ? "bg-foreground text-card"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          <Check {...sm} />
                        </button>
                      </div>
                    ))}
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
                      {shown.length} shown
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
                            "inline-flex h-9 cursor-pointer items-center gap-[7px] rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-200",
                            on
                              ? "border-brand-ink bg-brand-ink text-brand-surface"
                              : "border-brand-ink/35 bg-transparent text-brand-ink"
                          )}
                        >
                          {dot && <Dot color={dot} />}
                          {name}
                          <span className="tabular-nums opacity-70">
                            {countOf(name)}
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
                        {money(42600)}
                      </span>
                    </div>
                    <span className="text-[13px] font-medium">5 deals</span>
                  </div>
                </section>
              </div>

              {/* Leads */}
              <section
                data-flip-id="leads-card"
                className="relative flex min-h-0 min-w-0 flex-col gap-3.5 rounded-xl bg-background p-6"
              >
                <div className="flex min-h-[58px] items-start justify-between pr-[200px]">
                  <Title title="Leads" sub={filterLabel} />
                </div>
                <Notch corner="tr" data-swap>
                  <button
                    onClick={() => go(1)}
                    className="flex h-13 cursor-pointer items-center gap-2 rounded-full border-0 bg-background px-[22px] text-sm font-medium text-foreground"
                  >
                    View all leads <ArrowRight {...sm} />
                  </button>
                </Notch>
                <LeadTable rows={shown.slice(0, 5)} onOpen={openLead} />
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
                      {bigNumber(money(open.reduce((a, l) => a + l.value, 0)))}
                    </div>
                    {callouts(
                      [
                        { value: String(open.length), label: "Open leads" },
                        {
                          value: money(
                            Math.round(
                              leads.reduce((a, l) => a + l.value, 0) /
                                Math.max(1, leads.length)
                            )
                          ),
                          label: "Avg. lead value",
                        },
                        {
                          value: closed
                            ? Math.round((countOf("Won") / closed) * 100) + "%"
                            : "—",
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
                            {countOf(name)}
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
                {railNotch("Leads", `${leads.length} total`)}
                <Notch corner="tr" className="flex items-center gap-2">
                  {actions(addButton)}
                </Notch>
              </div>

              <section
                data-flip-id="leads-card"
                className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 rounded-xl bg-background p-6"
              >
                <div className="flex min-h-[58px] items-start justify-between pr-[720px]">
                  <Title title="Leads" sub={filterLabel} />
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
                  rows={shown.slice(page * 10, page * 10 + 10)}
                  onOpen={openLead}
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
                    {FU.length === 0 && (
                      <div className="flex h-[150px] w-full items-center rounded-[20px] bg-card px-5 text-sm text-muted-foreground">
                        No follow-ups today.
                      </div>
                    )}
                    {FU.map((f, i) => (
                      <button
                        key={f.name}
                        data-fu-done={fu[i] || undefined}
                        onClick={() => toggleFu(i)}
                        title={fu[i] ? "Mark as not done" : "Mark as done"}
                        className={cn(
                          "box-border flex h-[150px] min-w-0 flex-none cursor-pointer snap-start flex-col justify-between gap-[22px] rounded-[20px] border-0 p-4 text-left transition-colors duration-200",
                          fu[i]
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
                            {f.time}
                          </span>
                          <span
                            className={cn(
                              "grid size-[30px] flex-none place-items-center rounded-full",
                              fu[i]
                                ? "bg-background text-foreground"
                                : "bg-secondary text-muted-foreground"
                            )}
                          >
                            <Check {...sm} />
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">
                            {f.name}
                          </span>
                          <span className="truncate text-xs opacity-70">
                            {f.task}
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
                      {FU.length - fuLeft}/{FU.length}
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
                  {UPCOMING.map((g) => (
                    <div key={g.day} className="flex flex-col gap-1.5">
                      <span className="px-1 text-xs font-medium text-muted-foreground">
                        {g.day}
                      </span>
                      {g.items.map((u) => (
                        <button
                          key={u.name}
                          onClick={() => openByName(u.name)}
                          className="flex cursor-pointer items-center gap-3 rounded-[18px] border-0 bg-card py-3 pr-4 pl-3.5 text-left text-foreground hover:bg-secondary"
                        >
                          <Avatar name={u.name} />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="truncate text-sm font-medium">
                              {u.name}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {u.task}
                            </span>
                          </span>
                          <span className="text-[15px] font-light tabular-nums">
                            {u.time}
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
                      {OVERDUE.length}
                    </span>
                  </div>
                  {OVERDUE.map((o) => (
                    <button
                      key={o.name}
                      onClick={() => openByName(o.name)}
                      className="flex cursor-pointer flex-col gap-0.5 border-0 border-t border-attention-foreground/20 bg-transparent px-0 pt-3.5 pb-0 text-left text-attention-foreground"
                    >
                      <span className="text-lg font-light">{o.name}</span>
                      <span className="text-sm opacity-70">{o.note}</span>
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
                  ? undefined
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
                    <div className="flex flex-none flex-col gap-6">
                      <div className="flex flex-col gap-3.5">
                        <h1
                          data-roll="h1"
                          className="m-0 text-[30px] leading-[1.15] font-light"
                        >
                          Revenue won
                          <span className="block text-muted-foreground">
                            {series.label}
                          </span>
                        </h1>
                        {bigNumber(money(series.total))}
                      </div>
                      {callouts(
                        [
                          { value: String(series.deals), label: "Deals won" },
                          {
                            value: money(series.size),
                            label: "Avg. deal size",
                          },
                          {
                            value: series.days + " days",
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
                      {series.bars.map(([label, v], i) => {
                        const last = i === series.bars.length - 1
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
                    options={Object.keys(SERIES) as (keyof typeof SERIES)[]}
                    value={period}
                    onChange={(p) => {
                      if (!reduceMotion()) freezeRolls()
                      setPeriod(p)
                    }}
                  />
                  {actions(
                    <Button
                      size="icon-lg"
                      className="size-16 min-w-16 rounded-full p-0"
                      aria-label="Export report"
                      title="Export report"
                      onClick={() => toast.success("Report exported.")}
                    >
                      <Download {...ic} className="size-5" />
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
                        {series.winNote}
                      </span>
                    </div>
                    <span
                      data-roll="win"
                      className="text-5xl leading-none font-light tabular-nums"
                    >
                      {series.win}
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
                    sub={series.label}
                    subClass="opacity-70"
                    subRoll="src-sub"
                  />
                  <span
                    data-roll="src-leads"
                    className="text-[13px] font-medium"
                  >
                    {series.leads} leads
                  </span>
                </div>
                {/* Part-to-whole: one bar split by share, largest first, in
                    steps of the ink (2px surface gaps between segments). */}
                <div className="flex h-14 flex-none gap-0.5 overflow-hidden rounded-[18px]">
                  {SOURCES.map(([name, p], i) => (
                    <span
                      key={name}
                      title={`${name}: ${p}%`}
                      className="rounded-[4px] bg-brand-ink"
                      style={{ flexGrow: p, opacity: SOURCE_INK[i] }}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-2.5">
                  {SOURCES.map(([name, p], i) => (
                    <div
                      key={name}
                      className="flex items-center gap-2.5 text-sm font-medium"
                    >
                      <span
                        className="size-2.5 flex-none rounded-full bg-brand-ink"
                        style={{ opacity: SOURCE_INK[i] }}
                      />
                      <span className="flex-1">{name}</span>
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
            <SheetTitle>{selLead.name}</SheetTitle>
            <SheetDescription>
              {[selLead.company, selLead.phone, money(selLead.value)]
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
              const on = selLead.status === name
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
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  aria-label="Follow-up date"
                  disabled={!fuOn}
                  required={fuOn}
                  value={fuDate}
                  onChange={(e) => setFuDate(e.target.value)}
                />
                <Input
                  type="time"
                  aria-label="Follow-up time"
                  disabled={!fuOn}
                  required={fuOn}
                  value={fuTime}
                  onChange={(e) => setFuTime(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!note.trim()}>
                Save note
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add lead */}
      <Dialog open={add} onOpenChange={setAdd}>
        <DialogContent showCloseButton={false} style={POPUP_STYLE}>
          <NotchedSurface />
          <CloseButton onClick={() => setAdd(false)} />
          <form onSubmit={saveLead} className="contents">
            <DialogHeader>
              <DialogTitle>Add new lead</DialogTitle>
              <DialogDescription>Only the name is required.</DialogDescription>
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
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!form.name.trim()}>
                Save lead
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
}: {
  rows: Lead[]
  onOpen: (id: number) => void
}) {
  return (
    <>
      <div
        className="grid gap-3 px-4 text-xs font-medium text-muted-foreground"
        style={{ gridTemplateColumns: LEAD_COLS }}
      >
        <span>Name</span>
        <span>Status</span>
        <span>Last note</span>
        <span className="text-right">Value</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {rows.map((l) => (
          <button
            key={l.id}
            data-flip-id={"lead-" + l.id}
            onClick={() => onOpen(l.id)}
            className="grid cursor-pointer items-center gap-3 rounded-[18px] border-0 bg-card px-4 py-3 text-left text-foreground transition-colors duration-150 hover:bg-secondary"
            style={{ gridTemplateColumns: LEAD_COLS }}
          >
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-sm font-medium">{l.name}</span>
              <span className="text-xs text-muted-foreground">{l.company}</span>
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
                {l.note || "No notes yet"}
              </span>
              <span className="text-xs text-muted-foreground">{l.last}</span>
            </span>
            <span className="text-right text-[15px] font-light tabular-nums">
              {money(l.value)}
            </span>
          </button>
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

/** Next follow-up: one set from a note, else today's scheduled one. */
const nextOf = (l: Lead) => {
  const f = FU.find((x) => x.name === l.name)
  return l.next || (f ? "Today, " + f.time : "")
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
const stamp = (d: Date) =>
  d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
/** Sort key for "last touch" labels, newest first: Just now, Today hh:mm,
 *  Yesterday, "n days ago", then dated ones ("12 Oct"). */
const agoRank = (s: string) => {
  if (s === "Just now") return 0
  const t = /^Today, (\d+):(\d+)/.exec(s)
  if (t) return 1 - (+t[1] * 60 + +t[2]) / 1440
  if (s === "Yesterday") return 2
  const n = /^(\d+) days ago/.exec(s)
  if (n) return 1 + +n[1]
  return 100 - (parseInt(s) || 0)
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

const PIPELINE = 184200
const COUNTS: Record<Status, number> = {
  New: 24,
  Contacted: 18,
  Qualified: 11,
  "Proposal Sent": 7,
  Won: 5,
  Lost: 3,
}
const FUNNEL_VAL: Record<Status, number> = {
  New: 62400,
  Contacted: 48100,
  Qualified: 39800,
  "Proposal Sent": 34000,
  Won: 42600,
  Lost: 12300,
}
// Sample latest note per status (illustrative).
const SEED_NOTE: Record<Status, string> = {
  New: "Came in through the website form.",
  Contacted: "Left a voicemail, will try again.",
  Qualified: "Budget confirmed, wants a demo.",
  "Proposal Sent": "Proposal sent, waiting on sign-off.",
  Won: "Signed the annual plan.",
  Lost: "Went with a cheaper vendor.",
}
const LEADS: Lead[] = (
  [
    ["Priya Sharma", "Acme Corp", "Qualified", "Today, 10:20", 18400],
    ["Rohan Mehta", "Kite Labs", "Proposal Sent", "2 days ago", 32000],
    ["Elena Ruiz", "Northwind", "New", "Today, 09:05", 6500],
    ["Daniel Okafor", "Bluefin Studio", "Contacted", "Yesterday", 12200],
    ["Mei Tanaka", "Sora Health", "Won", "12 Oct", 24800],
    ["Arjun Nair", "Granite & Co", "Proposal Sent", "3 days ago", 41500],
    ["Sofia Bianchi", "Lumen Retail", "Lost", "8 Oct", 9000],
    ["Kabir Khan", "Fieldstone", "New", "Today, 11:40", 4800],
    ["Liam Carter", "Harbor Freight Co", "Contacted", "Yesterday", 7600],
    ["Ananya Iyer", "Pixel Forge", "Qualified", "2 days ago", 15300],
    ["Noah Fischer", "Brightline", "New", "Today, 08:15", 5200],
    ["Zara Ahmed", "Cedar Finance", "Proposal Sent", "4 days ago", 28700],
    ["Lucas Moreau", "Atelier Nord", "Won", "9 Oct", 19900],
    ["Isha Reddy", "Monsoon Foods", "Contacted", "3 days ago", 8400],
    ["Ethan Brooks", "Quarry Labs", "Qualified", "Yesterday", 21000],
    ["Hana Kim", "Seoul Supply", "New", "Today, 12:10", 3900],
    ["Omar Haddad", "Dune Logistics", "Lost", "6 Oct", 11200],
    ["Chloe Martin", "Petal & Stem", "Contacted", "Today, 09:50", 6100],
    ["Vikram Singh", "Ironleaf", "Proposal Sent", "5 days ago", 36400],
    ["Grace Lee", "Tidewater", "Qualified", "2 days ago", 13800],
    ["Mateo Garcia", "Sol Energy", "New", "Yesterday", 7200],
    ["Aisha Bello", "Lagos Digital", "Contacted", "4 days ago", 9800],
    ["Ravi Patel", "Orbit Systems", "Won", "11 Oct", 27500],
    ["Emma Novak", "Vista Travel", "Qualified", "Today, 10:45", 16600],
    ["Jonas Berg", "Fjord Design", "New", "3 days ago", 4400],
    ["Leila Haddad", "Olive Tree Co", "Lost", "7 Oct", 8100],
  ] as const
).map(([name, company, status, last, value], id) => ({
  id,
  name,
  company,
  phone: "",
  status,
  last,
  value,
  note: SEED_NOTE[status],
  next: "",
  created: "1 Oct 2026",
}))
const FU = [
  {
    name: "Priya Sharma",
    time: "11:30",
    task: "Send revised quote",
    done: true,
  },
  { name: "Hana Kim", time: "12:15", task: "Confirm budget", done: false },
  { name: "Elena Ruiz", time: "13:00", task: "Intro call", done: false },
  {
    name: "Daniel Okafor",
    time: "15:15",
    task: "Share case study",
    done: false,
  },
  {
    name: "Ethan Brooks",
    time: "16:00",
    task: "Review contract terms",
    done: false,
  },
  { name: "Kabir Khan", time: "17:00", task: "Book a demo", done: false },
  { name: "Grace Lee", time: "18:00", task: "Check in on trial", done: false },
]
const OVERDUE = [
  {
    name: "Rohan Mehta",
    note: "Kite Labs · Proposal follow-up was due 2 days ago",
  },
  { name: "Arjun Nair", note: "Granite & Co · Pricing call was due yesterday" },
]
const UPCOMING = [
  {
    day: "Thu, 16 Oct",
    items: [
      { name: "Ananya Iyer", task: "Send proposal draft", time: "10:00" },
      { name: "Zara Ahmed", task: "Pricing review", time: "14:30" },
    ],
  },
  {
    day: "Fri, 17 Oct",
    items: [{ name: "Liam Carter", task: "Second call", time: "11:00" }],
  },
  {
    day: "Mon, 20 Oct",
    items: [
      { name: "Vikram Singh", task: "Contract walkthrough", time: "16:00" },
    ],
  },
]
const SERIES = {
  Week: {
    label: "This week",
    total: 9800,
    bars: [
      ["Mon", 1200],
      ["Tue", 2600],
      ["Wed", 3100],
      ["Thu", 0],
      ["Fri", 2900],
      ["Sat", 0],
      ["Sun", 0],
    ],
    deals: 2,
    size: 4900,
    days: 16,
    win: "24%",
    winNote: "Up 3 points on last week",
    leads: 14,
  },
  Month: {
    label: "This month",
    total: 42600,
    bars: [
      ["May", 28400],
      ["Jun", 33100],
      ["Jul", 25900],
      ["Aug", 38200],
      ["Sep", 36700],
      ["Oct", 42600],
    ],
    deals: 5,
    size: 8520,
    days: 18,
    win: "21%",
    winNote: "Up 3 points on September",
    leads: 68,
  },
  Quarter: {
    label: "This quarter",
    total: 118300,
    bars: [
      ["Q1", 86400],
      ["Q2", 94200],
      ["Q3", 100800],
      ["Q4", 118300],
    ],
    deals: 14,
    size: 8450,
    days: 21,
    win: "19%",
    winNote: "Up 1 point on Q3",
    leads: 182,
  },
} satisfies Record<
  string,
  { bars: [string, number][] } & Record<string, unknown>
>
// Segment opacity per source rank (SOURCES is sorted largest first).
const SOURCE_INK = [1, 0.78, 0.58, 0.42, 0.28]
const SOURCES = [
  ["Website form", 34],
  ["Referral", 22],
  ["LinkedIn", 18],
  ["Cold email", 14],
  ["Events", 12],
] as const
