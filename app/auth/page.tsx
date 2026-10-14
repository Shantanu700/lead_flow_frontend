"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { EyeClosedIcon, EyeIcon, RouteIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { describeApiError, OFFLINE, refreshCsrf } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <RouteIcon className="size-4" />
      </span>
      <span className="text-lg font-medium">LeadFlow</span>
    </div>
  )
}

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
    <div className="flex flex-col gap-2 pb-4">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

// Autofill: paint the field colour over Chrome's autofill fill so saved
// emails and passwords don't turn the field yellow or olive.
const FIELD =
  "h-11 px-4 md:text-base autofill:shadow-[inset_0_0_0_1000px_color-mix(in_oklch,var(--input)_50%,var(--card))] autofill:[-webkit-text-fill-color:var(--foreground)]"

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
        className={`${FIELD} pr-12`}
      />
      {/* Open eye = the password is hidden and can be shown; closed eye =
          it is visible and can be hidden. The icon swaps instantly: no
          transition and no press nudge, unlike other buttons. */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground transition-none hover:text-foreground active:not-aria-[haspopup]:translate-y-[-50%]"
      >
        {visible ? <EyeClosedIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}

const MODES = ["login", "register"] as const

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
        className={`absolute top-8 right-20 left-8 flex flex-col gap-3 rounded-lg glass p-4 ${RISE} delay-300`}
      >
        <div className="flex items-baseline justify-between px-1">
          <span className="text-sm font-medium">October 2026</span>
          <span className="text-xs text-white/90">
            {WEEK_TOTAL} follow-ups this week
          </span>
        </div>

        <div className="grid grid-cols-7 text-center">
          {WEEK.map(([day, date, count]) => {
            const today = date === TODAY
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <span className="text-xs text-white/90">{day}</span>
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-lg font-light tabular-nums",
                    today && "bg-primary text-primary-foreground"
                  )}
                >
                  {date}
                </span>
                {/* One dot per follow-up, up to three. */}
                <span className="flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-1.5 rounded-full",
                        today ? "bg-primary" : "bg-white/70"
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-xs",
                i === 0
                  ? "bg-brand-surface text-brand-ink"
                  : "bg-white/10 text-white"
              )}
            >
              <span className="w-14 shrink-0 tabular-nums">{item.time}</span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {i === 0 ? `Follow up with ${item.name}` : item.name}
              </span>
              <span className={i === 0 ? "" : "text-white/90"}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Today's follow-ups: follows the page theme like the real app. One
          row (text left, avatars right) so it stays low, on the table. */}
      <div
        className={`absolute bottom-6 left-8 flex w-80 items-center justify-between gap-4 rounded-md bg-card px-5 py-3 text-card-foreground ${RISE} delay-500`}
      >
        <span className="text-sm leading-tight font-medium">
          Today&apos;s Follow-ups
          <span className="block text-xs font-normal text-muted-foreground">
            3 scheduled · Example data
          </span>
        </span>
        <div className="flex shrink-0">
          {TODAY_LEADS.map((lead) => (
            <span
              key={lead.initials}
              className="relative -ml-2 flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-medium ring-2 ring-card first:ml-0"
            >
              {lead.initials}
              <span
                className={`absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-card ${lead.dot}`}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The theme toggle sits in a notch cut out of the photo's top-right corner.
 *  The notch is the card colour; two radial-gradient fillets curve the photo
 *  edge into it. Its padding is the panel gap (6px), so the button sits the
 *  same distance from the photo as from the card's outer edge; the 28px
 *  corner is concentric with the 22px button radius. */
function CornerToggle() {
  // Each fillet: photo inside the arc, a 2px orange band on the arc (the
  // photo's edge line continuing round the curve), card outside it.
  const fillet =
    "pointer-events-none absolute size-6 bg-[radial-gradient(circle_at_0_100%,transparent_calc(1.5rem-2px),var(--photo-edge)_calc(1.5rem-2px),var(--photo-edge)_1.5rem,var(--card)_calc(1.5rem+0.5px))]"
  return (
    // The offset outer shadow draws the same 2px line along the notch's
    // left edge, its curved corner and its bottom edge, on the photo side.
    <div className="absolute top-0 right-0 z-10 rounded-bl-[1.75rem] bg-card pb-panel pl-panel shadow-[-2px_2px_0_0_var(--photo-edge)] [&_button]:size-11 [&_svg]:size-5">
      <span aria-hidden className={`${fillet} top-0 right-full`} />
      <span aria-hidden className={`${fillet} top-full right-0`} />
      <ModeToggle />
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>("login")
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
      toast.error(
        "Those two passwords do not match. Retype them and try again."
      )
      confirmRef.current?.focus()
      return
    }
    setMismatch(false)
    setPending(true)
    const id = toast.loading(copy.pending)

    try {
      const { error } = isRegister
        ? await postCoreRegister({
            body: {
              name: String(form.get("name") ?? "").trim(),
              email,
              password,
            },
          })
        : await postCoreLogin({ body: { email, password } })

      if (error) {
        toast.error(describeApiError(error), { id })
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
    <main className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <div className="grid w-full max-w-6xl grid-cols-1 gap-panel rounded-xl bg-card p-panel shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="flex min-w-0 flex-col gap-8 p-6 sm:p-10">
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
              className="relative grid w-fit grid-cols-2 rounded-full bg-secondary p-1 ring-ring/50 has-focus-visible:ring-3"
            >
              {MODES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => switchMode(value)}
                  className="rounded-control px-4 py-1.5 text-sm font-medium outline-none"
                >
                  {value === "login" ? "Log in" : "Register"}
                </button>
              ))}
              {/* The active state is a styled copy of the labels, clipped to
                  the active half; the clip slides, so fill and text change in
                  one motion. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-1 grid grid-cols-2 rounded-control bg-primary text-sm font-medium text-primary-foreground transition-[clip-path] duration-250 ease-in-out motion-reduce:transition-none"
                style={{
                  clipPath: isRegister
                    ? "inset(0 0 0 50% round 9999px)"
                    : "inset(0 50% 0 0 round 9999px)",
                }}
              >
                <span className="flex items-center justify-center px-4">
                  Log in
                </span>
                <span className="flex items-center justify-center px-4">
                  Register
                </span>
              </div>
            </div>
          </div>

          <h2 className={`text-2xl leading-tight font-light ${RISE} delay-75`}>
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
          </h2>

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
              className="mt-2 h-11 w-full"
            >
              {pending ? (
                "Working…"
              ) : (
                <Crossfade mode={mode} render={(m) => COPY[m].submit} />
              )}
            </Button>
          </form>

          <p className={`text-sm text-muted-foreground ${RISE} delay-200`}>
            <Crossfade
              mode={mode}
              render={(m) => (
                <span>
                  {COPY[m].switchPrompt}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      switchMode(m === "register" ? "login" : "register")
                    }
                    className="font-medium text-foreground underline-offset-4 hover:underline"
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
        <section className="relative hidden overflow-hidden rounded-lg bg-muted [--photo-edge:color-mix(in_oklch,var(--primary)_55%,var(--card))] lg:block">
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
          <CornerToggle />
        </section>
      </div>
    </main>
  )
}
