"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { RouteIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { describeApiError, OFFLINE, refreshCsrf } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModeToggle } from "@/components/mode-toggle"
import workspace from "@/public/auth/workspace.jpg"
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
    <div className="flex flex-col gap-2 pb-3.5">
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
        className={`${FIELD} pr-20`}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
      >
        {visible ? "Hide" : "Show"}
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

// Photo: "Desk workspace featuring coffee cup, laptop, and plant…" by
// Shixart1985, CC BY 2.0, via Wikimedia Commons. Credited in the form footer;
// source record in docs/image-credits.json.
const PHOTO_CREDIT_URL =
  "https://commons.wikimedia.org/wiki/File:Desk_workspace_featuring_coffee_cup,_laptop,_and_plant_with_artwork_in_background_during_a_sunny_day.jpg"

// Illustrative only: example data showing what LeadFlow looks like inside.
const WEEK = [
  ["Sun", 11],
  ["Mon", 12],
  ["Tue", 13],
  ["Wed", 14],
  ["Thu", 15],
  ["Fri", 16],
  ["Sat", 17],
] as const
const TODAY = 15
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
      aria-label="Example LeadFlow cards: a follow-up with Priya Sharma at 11:30 am, this week's calendar, and three follow-ups today"
    >
      {/* Next follow-up, with the one after it tucked behind. */}
      <div className={`absolute top-10 left-8 w-64 ${RISE} delay-300`}>
        <div className="absolute inset-x-6 top-full -mt-5 rounded-b-md bg-brand-ink/90 px-5 pt-7 pb-3 text-xs text-white/75">
          2:00 pm · Rahul Verma
        </div>
        <div className="relative flex items-start justify-between gap-3 rounded-md bg-brand-surface px-5 py-4 text-brand-ink">
          <div className="leading-tight">
            <span className="block text-sm font-medium">
              Follow up with Priya Sharma
            </span>
            <span className="mt-1 block text-xs">11:30 am · Proposal Sent</span>
          </div>
          <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-ink" />
        </div>
      </div>

      {/* This week. */}
      <div
        className={`absolute inset-x-8 bottom-40 grid grid-cols-7 rounded-md bg-black/50 px-3 py-4 text-center text-white backdrop-blur-md ${RISE} delay-400`}
      >
        {WEEK.map(([day, date]) => (
          <div key={date} className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-white/85">{day}</span>
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-lg font-light tabular-nums",
                date === TODAY && "bg-primary text-primary-foreground"
              )}
            >
              {date}
            </span>
          </div>
        ))}
      </div>

      {/* Today's follow-ups: follows the page theme like the real app. */}
      <div
        className={`absolute bottom-8 left-8 w-72 rounded-md bg-card px-5 py-4 text-card-foreground ${RISE} delay-500`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm leading-tight font-medium">
            Today&apos;s Follow-ups
            <span className="block text-xs font-normal text-muted-foreground">
              3 scheduled · Example data
            </span>
          </span>
          <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
        </div>
        <div className="mt-4 flex">
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
  const fillet =
    "pointer-events-none absolute size-6 bg-[radial-gradient(circle_at_0_100%,transparent_1.5rem,var(--card)_calc(1.5rem+0.5px))]"
  return (
    <div className="absolute top-0 right-0 z-10 rounded-bl-[1.75rem] bg-card pb-panel pl-panel [&_button]:size-11 [&_svg]:size-5">
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
      <div className="grid w-full max-w-6xl grid-cols-1 gap-panel rounded-xl bg-card p-panel shadow-card lg:min-h-[42rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Form column: wordmark top, form centred, footer row bottom. */}
        <section className="flex min-w-0 flex-col p-6 sm:p-9">
          <div className="flex items-center justify-between">
            <Logo />
            {/* Below lg the photo (and its corner toggle) is hidden. */}
            <div className="lg:hidden">
              <ModeToggle />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center py-7">
            <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
              <div className="flex flex-col items-center gap-5 text-center">
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
                  {/* The active state is a styled copy of the labels, clipped
                      to the active half; the clip slides, so fill and text
                      change in one motion. */}
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

                <h1
                  className={`text-3xl leading-tight font-light ${RISE} delay-75`}
                >
                  <Crossfade
                    mode={mode}
                    render={(m) => (
                      <>
                        {COPY[m].title}
                        <span className="mt-1 block text-base text-muted-foreground">
                          {COPY[m].subtitle}
                        </span>
                      </>
                    )}
                  />
                </h1>
              </div>

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
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
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
                  className="mt-2 h-12 w-full text-base"
                >
                  {pending ? (
                    "Working…"
                  ) : (
                    <Crossfade mode={mode} render={(m) => COPY[m].submit} />
                  )}
                </Button>
              </form>
            </div>
          </div>

          <div
            className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground ${RISE} delay-200`}
          >
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
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    {COPY[m].switchAction}
                  </button>
                </span>
              )}
            />
            <a
              href={PHOTO_CREDIT_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden underline-offset-4 hover:underline lg:inline"
            >
              Photo: Shixart1985, CC BY 2.0
            </a>
          </div>
        </section>

        {/* Picture panel: a real workspace photo with LeadFlow's own cards
            floating over it, and the theme toggle in the cut-out corner. */}
        <section className="relative hidden overflow-hidden rounded-lg bg-muted lg:block">
          <Image
            src={workspace}
            alt="A bright desk with a closed laptop, a coffee cup, a plant and a framed picture on the wall"
            fill
            priority
            placeholder="blur"
            sizes="(min-width: 1024px) 55vw, 0px"
            className="object-cover"
          />
          <ProductCards />
          <CornerToggle />
        </section>
      </div>
    </main>
  )
}
