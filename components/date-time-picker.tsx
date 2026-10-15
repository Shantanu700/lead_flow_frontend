"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { CalendarClock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type Step = "date" | "time"
type Unit = "hour" | "minute"

/** "Thu, 16 Oct · 2:30 pm" */
const label = (d: Date) =>
  d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }) +
  " · " +
  d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })

const pad = (n: number) => String(n).padStart(2, "0")
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Date and time in one popover: shadcn's calendar for the day, then a clock
 * dial for the time (tap or drag on the dial, or type in the hour and minute
 * boxes). Past days are disabled, and Set stays off for a time in the past.
 */
export function DateTimePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Pick a date and time",
}: {
  id?: string
  value: Date | null
  onChange: (value: Date) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<Step>("date")
  const [draft, setDraft] = React.useState<Date>(() => defaultDraft(value))
  // Switching steps: the popover glides from the old step's size to the
  // new one's. `sized` holds the body, `from` its size before the switch.
  const sized = React.useRef<HTMLDivElement>(null)
  const from = React.useRef<DOMRect | null>(null)
  const goTo = (next: Step) => {
    if (next === step) return
    from.current = sized.current?.getBoundingClientRect() ?? null
    setStep(next)
  }
  useGSAP(
    () => {
      const was = from.current
      from.current = null
      const el = sized.current
      if (!was || !el) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const now = el.getBoundingClientRect()
      gsap.fromTo(
        el,
        { width: was.width, height: was.height },
        {
          width: now.width,
          height: now.height,
          duration: 0.3,
          ease: "power3.inOut",
          clearProps: "width,height",
        }
      )
    },
    { dependencies: [step] }
  )
  // "Now" as of opening; the server re-checks the time on save anyway.
  const [now, setNow] = React.useState(0)

  const openChange = (next: boolean) => {
    if (next) {
      setDraft(defaultDraft(value))
      setStep("date")
      setNow(Date.now())
    }
    setOpen(next)
  }
  const inPast = draft.getTime() <= now

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-3xl border border-transparent bg-input/50 px-3 text-left text-sm transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CalendarClock className="size-4 flex-none text-muted-foreground" />
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value ? label(value) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        {/* Header: the two halves of the value; each opens its step. */}
        <div className="flex gap-1.5 p-3 pb-0">
          {(["date", "time"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => goTo(s)}
              aria-pressed={step === s}
              className={cn(
                "flex-1 cursor-pointer rounded-control border-0 px-3 py-2 text-left text-sm font-medium transition-colors duration-200",
                step === s
                  ? "bg-primary/12 text-primary"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="block text-[11px] font-normal tracking-wide uppercase opacity-80">
                {s}
              </span>
              {s === "date"
                ? draft.toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : draft.toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
            </button>
          ))}
        </div>

        {/* The step's body slides in from the side it lies on, inside a box
            that resizes smoothly between the two steps. */}
        <div ref={sized} className="overflow-hidden">
          <div
            key={step}
            className={cn(
              "animate-in duration-200 ease-out fade-in-0 motion-reduce:animate-none",
              step === "date" ? "slide-in-from-left-3" : "slide-in-from-right-3"
            )}
          >
            {step === "date" ? (
              <Calendar
                mode="single"
                // Re-picking the selected day must not clear it; it moves on.
                required
                selected={draft}
                defaultMonth={draft}
                disabled={{ before: startOfToday() }}
                onSelect={(day) => {
                  if (!day) return
                  const next = new Date(draft)
                  next.setFullYear(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate()
                  )
                  setDraft(next)
                  goTo("time")
                }}
              />
            ) : (
              <TimeDial value={draft} onChange={setDraft} />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 p-3">
          <span
            className={cn(
              "text-xs text-muted-foreground transition-opacity duration-200",
              inPast ? "opacity-100" : "opacity-0"
            )}
            aria-live="polite"
          >
            {inPast ? "Pick a time in the future" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={inPast}
              onClick={() => {
                onChange(draft)
                setOpen(false)
              }}
            >
              Set
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Opening value: the current one, else the next whole hour. */
function defaultDraft(value: Date | null) {
  if (value) return new Date(value)
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return d
}

const DIAL = 224 // px
const RING = 86 // radius of the numbers
const BUBBLE = 36

/**
 * Clock-face time picker. Hour and minute boxes switch the dial between the
 * two (and take typing); the hand turns to each pick, and picking the hour
 * moves on to the minutes. The dial is a slider for keyboards (arrows,
 * Page Up/Down for 5).
 */
function TimeDial({
  value,
  onChange,
}: {
  value: Date
  onChange: (value: Date) => void
}) {
  const [unit, setUnit] = React.useState<Unit>("hour")
  const [dragging, setDragging] = React.useState(false)
  const dialRef = React.useRef<HTMLDivElement>(null)

  const h24 = value.getHours()
  const pm = h24 >= 12
  const h12 = h24 % 12 || 12
  const minute = value.getMinutes()

  const set = (hour24: number, min: number) => {
    const next = new Date(value)
    next.setHours(((hour24 % 24) + 24) % 24, ((min % 60) + 60) % 60, 0, 0)
    onChange(next)
  }
  const setHour12 = (h: number) => set((h % 12) + (pm ? 12 : 0), minute)
  const setMinute = (m: number) => set(h24, m)

  // Pointer → value: angle from 12 o'clock, clockwise.
  const pick = (e: React.PointerEvent) => {
    const box = dialRef.current?.getBoundingClientRect()
    if (!box) return
    const x = e.clientX - (box.left + box.width / 2)
    const y = e.clientY - (box.top + box.height / 2)
    const deg = (Math.atan2(x, -y) * 180) / Math.PI
    const turn = (deg + 360) % 360
    if (unit === "hour") setHour12(Math.round(turn / 30) % 12 || 12)
    else setMinute(Math.round(turn / 6) % 60)
  }

  const current = unit === "hour" ? h12 : minute
  const angle = unit === "hour" ? (h12 % 12) * 30 : minute * 6
  const marks =
    unit === "hour"
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : Array.from({ length: 12 }, (_, i) => i * 5)

  const box = (u: Unit) =>
    cn(
      "h-16 w-20 rounded-[20px] border-0 text-center text-[40px] leading-none font-light tabular-nums transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
      unit === u ? "bg-primary/12 text-primary" : "bg-muted text-foreground"
    )

  return (
    <div className="flex w-[18.5rem] flex-col items-center gap-4 p-4 pt-3">
      <div className="flex items-center gap-2">
        <TimeBox
          aria-label="Hour"
          className={box("hour")}
          value={h12}
          max={12}
          min={1}
          onFocus={() => setUnit("hour")}
          onCommit={setHour12}
        />
        <span className="text-3xl font-light text-muted-foreground">:</span>
        <TimeBox
          aria-label="Minute"
          className={box("minute")}
          value={minute}
          max={59}
          min={0}
          onFocus={() => setUnit("minute")}
          onCommit={setMinute}
        />
        <div
          role="group"
          aria-label="AM or PM"
          className="ml-1 flex flex-col overflow-hidden rounded-[14px] ring-1 ring-border"
        >
          {(["AM", "PM"] as const).map((p) => {
            const on = (p === "PM") === pm
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  !on && set(h24 + (p === "PM" ? 12 : -12), minute)
                }
                className={cn(
                  "h-8 w-12 cursor-pointer border-0 text-xs font-medium transition-colors duration-200",
                  on
                    ? "bg-primary/12 text-primary"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            )
          })}
        </div>
      </div>

      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-label={unit === "hour" ? "Hour" : "Minute"}
        aria-valuemin={unit === "hour" ? 1 : 0}
        aria-valuemax={unit === "hour" ? 12 : 59}
        aria-valuenow={current}
        aria-valuetext={`${pad(h12)}:${pad(minute)} ${pm ? "PM" : "AM"}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setDragging(true)
          pick(e)
        }}
        onPointerMove={(e) => dragging && pick(e)}
        onPointerUp={() => {
          setDragging(false)
          if (unit === "hour") setUnit("minute")
        }}
        onKeyDown={(e) => {
          const step =
            { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[
              e.key
            ] ?? { PageUp: 5, PageDown: -5 }[e.key]
          if (!step) return
          e.preventDefault()
          if (unit === "hour")
            setHour12(((((h12 - 1 + step) % 12) + 12) % 12) + 1)
          else setMinute(minute + step)
        }}
        className="relative cursor-pointer touch-none rounded-full bg-muted outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/30"
        style={{ width: DIAL, height: DIAL }}
      >
        {/* Hand: centre dot, line, and a bubble on the picked value. It
            turns smoothly, except while dragging. */}
        <div
          aria-hidden
          className={cn(
            "absolute top-1/2 left-1/2 origin-bottom",
            !dragging &&
              "transition-transform duration-200 ease-out motion-reduce:transition-none"
          )}
          style={{
            width: 2,
            height: RING,
            marginLeft: -1,
            marginTop: -RING,
            transform: `rotate(${angle}deg)`,
          }}
        >
          <span className="absolute inset-0 bg-primary" />
          <span
            className="absolute left-1/2 rounded-full bg-primary"
            style={{
              width: BUBBLE,
              height: BUBBLE,
              marginLeft: -BUBBLE / 2,
              top: -BUBBLE / 2,
            }}
          />
        </div>
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-primary"
        />
        {/* Numbers; the set crossfades when the dial switches units. */}
        <div
          key={unit}
          aria-hidden
          className="absolute inset-0 animate-in duration-200 ease-out fade-in-0 zoom-in-95 motion-reduce:animate-none"
        >
          {marks.map((n, i) => {
            const a = (i + (unit === "hour" ? 1 : 0)) * 30
            const rad = (a * Math.PI) / 180
            const on = n === current
            return (
              <span
                key={n}
                className={cn(
                  "absolute grid size-8 -translate-1/2 place-items-center text-sm tabular-nums transition-colors duration-150",
                  on ? "font-medium text-primary-foreground" : "text-foreground"
                )}
                style={{
                  left: DIAL / 2 + RING * Math.sin(rad),
                  top: DIAL / 2 - RING * Math.cos(rad),
                }}
              >
                {unit === "hour" ? n : pad(n)}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** A two-digit box you can type in; commits on blur or Enter. */
function TimeBox({
  value,
  min,
  max,
  onCommit,
  ...props
}: {
  value: number
  min: number
  max: number
  onCommit: (n: number) => void
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  const [text, setText] = React.useState<string | null>(null)
  const commit = () => {
    if (text === null) return
    const n = Number(text)
    if (text !== "" && n >= min && n <= max) onCommit(n)
    setText(null)
  }
  return (
    <input
      {...props}
      inputMode="numeric"
      maxLength={2}
      value={text ?? pad(value)}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
    />
  )
}
