import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { NOTCH_R } from "@/components/notch"
import { VIEW_FLIP } from "@/lib/leads"
import { reduceMotion } from "@/lib/motion"

/** The dashboard's tab switch. `go(next)` plays the exit, waits for the next
 *  tab's data (`load`), swaps the view, then the entrance morphs whatever both
 *  tabs share. Also exposes the text roll for in-place changes (period, filter).
 */
export function useViewMorph({
  contentRef,
  view,
  setView,
  setNav,
  ready,
  rowIds,
  load,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>
  view: number
  setView: (v: number) => void
  setNav: (v: number) => void
  ready: boolean
  /** Lead-row Flip ids tab `v` will render. */
  rowIds: (v: number) => string[]
  /** Fetch what tab `v` shows; resolves when it's in. */
  load: (v: number) => Promise<void>
}) {
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

  return { go, contextSafe, freezeRolls, rollTexts }
}
