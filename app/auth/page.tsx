"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { EyeClosedIcon, EyeIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ApiFailure, OFFLINE, refreshCsrf, toastFailure } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/mode-toggle"
import teamPhoto from "@/public/auth/team.jpg"
import {
  getCoreLogin,
  postCoreLogin,
  postCoreRegister,
} from "@/src/client/sdk.gen"

type Mode = "login" | "register"

const HOME = "/dashboard"

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to LeadFlow",
    submit: "Log in",
    pending: "Signing you in…",
    switchPrompt: "New to LeadFlow?",
    switchAction: "Create an account",
  },
  register: {
    title: "Create your account",
    subtitle: "Start tracking leads",
    submit: "Create account",
    pending: "Creating your account…",
    switchPrompt: "Already have an account?",
    switchAction: "Log in",
  },
} as const

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 pb-[18px]">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

// Autofill: paint the field colour over Chrome's autofill fill so saved
// emails and passwords don't turn the field yellow or olive.
const FIELD =
  "h-14 rounded-full px-[22px] text-base md:text-base autofill:shadow-[inset_0_0_0_1000px_color-mix(in_oklch,var(--input)_50%,var(--card))] autofill:[-webkit-text-fill-color:var(--foreground)]"

function PasswordInput({
  id,
  autoComplete,
  invalid,
  inputRef,
  minLength,
  disabled,
}: {
  id: string
  autoComplete: string
  invalid?: boolean
  inputRef?: React.Ref<HTMLInputElement>
  minLength?: number
  disabled?: boolean
}) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={`${FIELD} pr-14`}
      />
      {/* Open eye = the password is hidden and can be shown; closed eye =
          it is visible and can be hidden. The icon swaps instantly: no
          transition and no press nudge, unlike other buttons. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 size-10 -translate-y-1/2 rounded-full text-muted-foreground transition-none hover:text-foreground active:not-aria-[haspopup]:translate-y-[-50%]"
      >
        {visible ? <EyeClosedIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}

const MODES = ["login", "register"] as const
const noSubscribe = () => () => {}

/** Both modes' text share one grid cell, so swapping crossfades in place
 *  without the width jumping. The hidden copy is inert. */
function Crossfade({
  mode,
  render,
  className,
}: {
  mode: Mode
  render: (m: Mode) => React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("grid", className)}>
      {MODES.map((m) => (
        <span
          key={m}
          inert={m !== mode}
          className={cn(
            "transition-[opacity,transform] duration-200 ease-out [grid-area:1/1] motion-reduce:transform-none",
            m === mode ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          )}
        >
          {render(m)}
        </span>
      ))}
    </span>
  )
}

/** Register-only fields grow in and out instead of teleporting. Collapsed
 *  content is inert and its inputs are disabled, so it skips validation. */
function Reveal({
  open,
  children,
}: {
  open: boolean
  children: React.ReactNode
}) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-400 ease-drawer motion-reduce:transition-opacity",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      {/* overflow-clip with a margin keeps the 3px focus ring visible. */}
      <div className="min-h-0 overflow-clip [overflow-clip-margin:4px]">
        {children}
      </div>
    </div>
  )
}

const RISE =
  "animate-in duration-500 fill-mode-both fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"

// Photo: AI-generated (Google Gemini), supplied for the project; provenance in
// docs/image-credits.json. No real people are shown.

// Illustrative only: example data showing what LeadFlow looks like inside.
// [day, date, follow-ups that day]
const WEEK = [
  ["Sun", 11, 0],
  ["Mon", 12, 2],
  ["Tue", 13, 1],
  ["Wed", 14, 4],
  ["Thu", 15, 3],
  ["Fri", 16, 2],
  ["Sat", 17, 0],
] as const
const TODAY = 15
const WEEK_TOTAL = WEEK.reduce((sum, [, , n]) => sum + n, 0)
const AGENDA = [
  { time: "11:30 am", name: "Priya Sharma", status: "Proposal Sent" },
  { time: "2:00 pm", name: "Rahul Verma", status: "Qualified" },
] as const
const TODAY_LEADS = [
  { initials: "PS", dot: "bg-status-proposal" },
  { initials: "RV", dot: "bg-status-qualified" },
  { initials: "AI", dot: "bg-status-contacted" },
] as const

/** Floating product cards over the photo, like the reference's calendar
 *  cards but made from LeadFlow's own content. */
function ProductCards() {
  return (
    <div
      data-ui
      role="img"
      aria-label="Example LeadFlow cards: this week's calendar with 12 follow-ups, today's agenda (Priya Sharma at 11:30 am, Rahul Verma at 2:00 pm), and three follow-ups today"
    >
      {/* Cards sit over the windows and the table, never across faces. */}
      {/* This week, in frosted glass: month and total, each day with a dot
          per follow-up, then today's agenda. The smoky 40% tint keeps small
          white text readable over the bright windows behind it. */}
      <div
        className={`absolute top-6 right-24 left-6 flex max-w-[520px] flex-col gap-3.5 rounded-[28px] glass px-5 pt-5 pb-4 ${RISE} delay-300`}
      >
        <div className="flex items-baseline justify-between gap-3 px-1.5">
          <span className="text-[17px] font-medium">October 2026</span>
          <span className="text-[13px] text-white/90">
            {WEEK_TOTAL} follow-ups this week
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEK.map(([day, date, count]) => {
            const today = date === TODAY
            return (
              <div key={date} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-white/90">{day}</span>
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-full text-2xl font-light tabular-nums",
                    today && "bg-primary text-primary-foreground"
                  )}
                >
                  {date}
                </span>
                {/* One dot per follow-up, up to three. */}
                <span className="flex h-1.5 gap-[3px]">
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-[5px] rounded-full",
                        today ? "bg-primary" : "bg-white"
                      )}
                    />
                  ))}
                </span>
              </div>
            )
          })}
        </div>

        {/* Today's agenda: the next follow-up in the brand colour, the rest
            on the glass. */}
        <div className="flex flex-col gap-1.5">
          {AGENDA.map((item, i) => (
            <div
              key={item.name}
              className={cn(
                "flex items-center gap-4 rounded-full px-4 py-2.5 text-sm",
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/14 text-white"
              )}
            >
              <span className="w-16 flex-none tabular-nums">{item.time}</span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {i === 0 ? `Follow up with ${item.name}` : item.name}
              </span>
              <span className="flex flex-none items-center gap-1.5">
                {i > 0 && (
                  <span className="size-2 rounded-full bg-status-qualified" />
                )}
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Today's follow-ups, in the photo's bottom-left notch. Follows the
          page theme like the real app. */}
      <EdgeNotch corner="bl" className="max-w-[calc(100%-60px)]">
        <div
          className={`flex items-center gap-6 rounded-[28px] bg-background py-4 pr-4 pl-[22px] ${RISE} delay-500`}
        >
          <span className="flex min-w-0 flex-col gap-0.5 whitespace-nowrap">
            <span className="text-base font-medium">
              Today&apos;s Follow-ups
            </span>
            <span className="text-[13px] text-muted-foreground">
              3 scheduled · Example data
            </span>
          </span>
          <div className="flex flex-none">
            {TODAY_LEADS.map((lead) => (
              <span
                key={lead.initials}
                className="relative -ml-2 grid size-11 place-items-center rounded-full bg-card text-[13px] font-medium shadow-[0_0_0_3px_var(--background)] first:ml-0"
              >
                {lead.initials}
                <span
                  className={`absolute right-0 bottom-0 size-2.5 rounded-full shadow-[0_0_0_2px_var(--background)] ${lead.dot}`}
                />
              </span>
            ))}
          </div>
        </div>
      </EdgeNotch>
    </div>
  )
}

/** A card-coloured cut-out in the photo's corner (36px inner radius, 10px
 *  padding, as on the dashboard). The photo's orange edge line continues
 *  round it: an offset shadow along the notch's two inner edges, and a 2px
 *  band on each fillet's arc (photo inside, card outside). */
function EdgeNotch({
  corner,
  className,
  children,
}: {
  corner: "tr" | "bl"
  className?: string
  children: React.ReactNode
}) {
  // Written out in full so Tailwind can find both classes.
  const fillet = cn(
    "pointer-events-none absolute size-9",
    corner === "tr"
      ? "bg-[radial-gradient(circle_at_0_100%,transparent_calc(2.25rem-2px),var(--photo-edge)_calc(2.25rem-2px),var(--photo-edge)_2.25rem,var(--card)_calc(2.25rem+0.5px))]"
      : "bg-[radial-gradient(circle_at_100%_0,transparent_calc(2.25rem-2px),var(--photo-edge)_calc(2.25rem-2px),var(--photo-edge)_2.25rem,var(--card)_calc(2.25rem+0.5px))]"
  )
  return corner === "tr" ? (
    <div
      className={cn(
        "absolute top-0 right-0 z-10 rounded-bl-[2.25rem] bg-card pb-2.5 pl-2.5 shadow-[-2px_2px_0_0_var(--photo-edge)]",
        className
      )}
    >
      <span aria-hidden className={`${fillet} top-0 right-full`} />
      <span aria-hidden className={`${fillet} top-full right-0`} />
      {children}
    </div>
  ) : (
    <div
      className={cn(
        "absolute bottom-0 left-0 z-10 rounded-tr-[2.25rem] bg-card pt-2.5 pr-2.5 shadow-[2px_-2px_0_0_var(--photo-edge)]",
        className
      )}
    >
      <span aria-hidden className={`${fillet} bottom-full left-0`} />
      <span aria-hidden className={`${fillet} bottom-0 left-full`} />
      {children}
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  // The home page's "Create free account" links here with ?mode=register.
  // Read after hydration (the server always renders Log in).
  const linked = React.useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(location.search).get("mode") === "register",
    () => false
  )
  const [picked, setMode] = React.useState<Mode | null>(null)
  const mode: Mode = picked ?? (linked ? "register" : "login")
  const [pending, setPending] = React.useState(false)
  const [mismatch, setMismatch] = React.useState(false)
  const confirmRef = React.useRef<HTMLInputElement>(null)
  const copy = COPY[mode]
  const isRegister = mode === "register"

  // Already signed in: skip the form.
  React.useEffect(() => {
    let active = true
    getCoreLogin()
      .then(({ data }) => {
        if (active && data) router.replace(HOME)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [router])

  function switchMode(next: Mode) {
    toast.dismiss()
    setMismatch(false)
    setMode(next)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")

    if (isRegister && password !== String(form.get("confirm") ?? "")) {
      setMismatch(true)
      toast.warning(
        "Those two passwords do not match. Retype them and try again."
      )
      confirmRef.current?.focus()
      return
    }
    setMismatch(false)
    setPending(true)
    const id = toast.loading(copy.pending)

    try {
      const { error, response } = isRegister
        ? await postCoreRegister({
            body: {
              name: String(form.get("name") ?? "").trim(),
              email,
              password,
            },
          })
        : await postCoreLogin({ body: { email, password } })

      if (error) {
        toastFailure(new ApiFailure(error, response?.status), { id })
        return
      }
      refreshCsrf()
      toast.success(isRegister ? "Your account is ready." : "Signed in.", {
        id,
      })
      router.replace(HOME)
    } catch {
      toast.error(OFFLINE, { id })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-7">
      <div className="grid w-full max-w-[1200px] grid-cols-1 gap-2.5 rounded-[44px] bg-card p-2.5 shadow-card lg:grid-cols-2">
        <section className="flex min-w-0 flex-col justify-center gap-8 px-6 py-8 sm:px-12 sm:py-11">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Logo left. On desktop the theme toggle lives in the photo's
                corner notch; below lg (no photo) it sits here. */}
            <div className="flex basis-full items-center justify-between">
              <Logo />
              <div className="lg:hidden">
                <ModeToggle />
              </div>
            </div>
            <div
              role="group"
              aria-label="Choose log in or register"
              className="relative grid w-fit grid-cols-2 rounded-full bg-background p-[5px] ring-ring/50 has-focus-visible:ring-3"
            >
              {MODES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => switchMode(value)}
                  className="h-11 rounded-control px-[22px] text-[15px] font-medium outline-none"
                >
                  {value === "login" ? "Log in" : "Register"}
                </button>
              ))}
              {/* The active state is a styled copy of the labels, clipped to
                  the active half; the clip slides, so fill and text change in
                  one motion. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-[5px] grid grid-cols-2 rounded-control bg-primary text-[15px] font-medium text-primary-foreground transition-[clip-path] duration-250 ease-in-out motion-reduce:transition-none"
                style={{
                  clipPath: isRegister
                    ? "inset(0 0 0 50% round 9999px)"
                    : "inset(0 50% 0 0 round 9999px)",
                }}
              >
                <span className="flex items-center justify-center px-[22px]">
                  Log in
                </span>
                <span className="flex items-center justify-center px-[22px]">
                  Register
                </span>
              </div>
            </div>
          </div>

          <h1
            className={`text-[34px] leading-[1.2] font-light tracking-[-0.01em] ${RISE} delay-75`}
          >
            <Crossfade
              mode={mode}
              render={(m) => (
                <>
                  {COPY[m].title}
                  <span className="block text-muted-foreground">
                    {COPY[m].subtitle}
                  </span>
                </>
              )}
            />
          </h1>

          <form
            onSubmit={onSubmit}
            className={`flex flex-col ${RISE} delay-150`}
          >
            <Reveal open={isRegister}>
              <Field id="name" label="Full name">
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  disabled={!isRegister}
                  className={FIELD}
                />
              </Field>
            </Reveal>
            <Field id="email" label="Email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={FIELD}
              />
            </Field>
            <Field id="password" label="Password">
              <PasswordInput
                id="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 8 : undefined}
                invalid={mismatch}
              />
            </Field>
            <Reveal open={isRegister}>
              <Field id="confirm" label="Confirm password">
                <PasswordInput
                  id="confirm"
                  autoComplete="new-password"
                  minLength={8}
                  invalid={mismatch}
                  inputRef={confirmRef}
                  disabled={!isRegister}
                />
              </Field>
            </Reveal>

            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="mt-2 h-14 w-full rounded-full text-base"
            >
              {pending ? (
                "Working…"
              ) : (
                <Crossfade mode={mode} render={(m) => COPY[m].submit} />
              )}
            </Button>
          </form>

          <p
            className={`pt-2 text-[15px] text-muted-foreground ${RISE} delay-200`}
          >
            <Crossfade
              mode={mode}
              className="justify-items-center"
              render={(m) => (
                <span className="flex flex-wrap justify-center gap-x-2.5 gap-y-1">
                  {COPY[m].switchPrompt}
                  <button
                    type="button"
                    onClick={() =>
                      switchMode(m === "register" ? "login" : "register")
                    }
                    className="font-medium text-foreground transition-colors hover:text-highlight"
                  >
                    {COPY[m].switchAction}
                  </button>
                </span>
              )}
            />
          </p>
        </section>

        {/* Picture panel: the team photo with LeadFlow's own cards
            floating over it, and the theme toggle in the cut-out corner. */}
        <section className="relative hidden min-h-[640px] overflow-hidden rounded-[32px] bg-muted [--photo-edge:color-mix(in_oklch,var(--primary)_55%,var(--card))] lg:block">
          <Image
            src={teamPhoto}
            alt="A small team talking around a meeting table with a laptop, coffee and notes"
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 55vw, 0px"
            className="object-cover object-[center_20%]"
          />
          <ProductCards />
          {/* Subtle brand-orange edge (--photo-edge), drawn inside the photo;
              CornerToggle continues it round the notch. Opaque (orange mixed
              with the card colour) so overlapping pieces don't darken at the
              joins. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-(--photo-edge) ring-inset"
          />
          <EdgeNotch
            corner="tr"
            className="[&_button]:size-16 [&_button]:bg-background [&_svg]:size-5"
          >
            <ModeToggle />
          </EdgeNotch>
        </section>
      </div>
    </main>
  )
}
