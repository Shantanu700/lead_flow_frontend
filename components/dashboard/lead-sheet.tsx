"use client"

import * as React from "react"
import { Calendar } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { DateTimePicker } from "@/components/date-time-picker"
import { Notch } from "@/components/notch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ago, money, stamp } from "@/lib/format"
import { STAGES } from "@/lib/leads"
import { Dot } from "@/components/dashboard/atoms"
import {
  CloseButton,
  NotchedSurface,
  SHEET_STYLE,
} from "@/components/dashboard/popup"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

import { useDash } from "@/components/dashboard/context"
import { reduceMotion } from "@/lib/motion"

/** The lead drawer: details, status, the discussion timeline and the note form. */
export function LeadSheet() {
  const {
    phone,
    sheet,
    setSheet,
    selLead,
    note,
    setNote,
    fuOn,
    setFuOn,
    fuAt,
    setFuAt,
    talk,
    saving,
    timeline,
    addNote,
    setStatus,
  } = useDash()
  const tlRef = React.useRef<HTMLOListElement>(null)
  const tlSeen = React.useRef<{ lead?: number; keys: Set<string> }>({
    keys: new Set(),
  })

  // Drawer timeline: entries not shown before rise in, staggered when the
  // drawer opens and one at a time as notes are added; their dots pop and
  // follow-up pills slide out of the notch.
  useGSAP(
    () => {
      const el = tlRef.current
      if (!sheet || !selLead || !el) {
        tlSeen.current = { keys: new Set() }
        return
      }
      if (tlSeen.current.lead !== selLead.id)
        tlSeen.current = { lead: selLead.id, keys: new Set() }
      const seen = tlSeen.current.keys
      const fresh = [
        ...el.querySelectorAll<HTMLElement>("[data-tl-item]"),
      ].filter((n) => !seen.has(n.dataset.tlItem!))
      if (!fresh.length) return
      // Nothing shown yet: the drawer has just opened (wait for its slide).
      const opening = seen.size === 0
      fresh.forEach((n) => seen.add(n.dataset.tlItem!))
      if (reduceMotion()) return
      const delay = opening ? 0.12 : 0
      const stagger = 0.05
      gsap.fromTo(
        fresh,
        { opacity: 0, y: opening ? 10 : -8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power3.out",
          delay,
          stagger,
          clearProps: "opacity,transform",
        }
      )
      gsap.fromTo(
        fresh.map((n) => n.querySelector("[data-tl-dot]")),
        { scale: 0.3 },
        {
          scale: 1,
          duration: 0.45,
          ease: "back.out(2.5)",
          delay,
          stagger,
          clearProps: "transform",
        }
      )
      const pills = fresh.flatMap((n) => [
        ...n.querySelectorAll("[data-tl-follow]"),
      ])
      if (pills.length)
        gsap.fromTo(
          pills,
          { opacity: 0, x: 10 },
          {
            opacity: 1,
            x: 0,
            duration: 0.35,
            ease: "power3.out",
            delay: delay + 0.15,
            stagger,
            clearProps: "opacity,transform",
          }
        )
    },
    {
      scope: tlRef,
      dependencies: [sheet, selLead?.id, selLead && talk[selLead.id]?.length],
    }
  )

  return (
    <Sheet open={sheet} onOpenChange={setSheet}>
      <SheetContent
        side="right"
        showCloseButton={false}
        // Phones: the full width, with the same 6px inset all round.
        style={phone ? { ...SHEET_STYLE, left: 6, width: "auto" } : SHEET_STYLE}
      >
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
        {/* Timeline: newest first down a rail. The newest dot is orange;
          a note that scheduled a follow-up carries it in a notch, solid
          orange while it is still the lead's open follow-up. */}
        <ol
          ref={tlRef}
          aria-label="Discussion history"
          className="m-0 flex min-h-0 flex-1 list-none flex-col overflow-y-auto px-4 pt-2"
        >
          {timeline.map((t, i) => {
            const last = i === timeline.length - 1
            const rel = ago(t.at)
            const open =
              !!t.follow &&
              t.follow === selLead?.next_follow_up_at &&
              !selLead?.follow_up_done_at
            return (
              <li
                key={t.key}
                data-tl-item={t.key}
                className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-x-3 pb-5"
              >
                {!last && (
                  <span
                    aria-hidden
                    className="absolute top-5 bottom-0 left-[6.5px] w-px bg-border"
                  />
                )}
                <span
                  aria-hidden
                  data-tl-dot
                  className={cn(
                    "mt-1 size-3.5 rounded-full transition-[background-color,box-shadow] duration-300",
                    i === 0
                      ? "bg-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
                      : t.system
                        ? "border-2 border-muted-foreground/40 bg-popover"
                        : "bg-muted-foreground/30"
                  )}
                />
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-xs font-medium">
                    <time dateTime={t.at}>{stamp(t.at)}</time>
                    {/* After a week ago() gives a date, which the stamp
                      already shows. */}
                    {/ago$|now$|^Yesterday$/.test(rel) && (
                      <span className="font-normal text-muted-foreground">
                        {" · " + rel}
                      </span>
                    )}
                  </span>
                  <div
                    className={cn(
                      "relative rounded-[18px] bg-muted px-4 py-3 text-sm leading-relaxed",
                      t.system && "text-muted-foreground italic",
                      // Room under the text for the follow-up notch.
                      t.follow && "pb-[46px]"
                    )}
                  >
                    {t.note}
                    {t.follow && (
                      <Notch corner="br" r={22} gap={6}>
                        {/* r = the pill's 16px ends + the 6px gap, so
                          the curves run parallel. */}
                        <span
                          data-tl-follow
                          className={cn(
                            "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap",
                            open
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/12 text-primary"
                          )}
                        >
                          <Calendar size={13} strokeWidth={1.75} />
                          Follow-up {stamp(t.follow)}
                        </span>
                      </Notch>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
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
  )
}
