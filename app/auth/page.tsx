"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RouteIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { describeApiError, OFFLINE, refreshCsrf } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModeToggle } from "@/components/mode-toggle"
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

// Illustrative only: example leads showing what the app looks like inside.
const PREVIEW = [
  {
    name: "Priya Sharma",
    company: "Example Traders",
    status: "Proposal Sent",
    dot: "bg-status-proposal",
    time: "11:30 am",
  },
  {
    name: "Rahul Verma",
    company: "Sample Foods",
    status: "Qualified",
    dot: "bg-status-qualified",
    time: "2:00 pm",
  },
  {
    name: "Ananya Iyer",
    company: "Demo Textiles",
    status: "Contacted",
    dot: "bg-status-contacted",
    time: "4:15 pm",
  },
] as const

// Shown when the register form makes the card taller, so the extra height
// fills with content instead of an empty gap.
const PREVIEW_MORE = [
  {
    name: "Meera Nair",
    company: "Sample Exports",
    status: "New",
    dot: "bg-status-new",
    time: "5:00 pm",
  },
  {
    name: "Vikram Singh",
    company: "Demo Motors",
    status: "Qualified",
    dot: "bg-status-qualified",
    time: "6:30 pm",
  },
] as const

// Log in: form on the left, brand panel on the right. Register: they swap.
// Both columns are equal width, so each slides exactly one column plus the
// panel gap, by transform only. The panel (z-10) passes over the form.
// Reduced motion: the sides swap instantly.
const SWAP =
  "transition-transform duration-500 ease-in-out motion-reduce:transition-none"

const RISE =
  "animate-in duration-500 fill-mode-both fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"

type Lead = (typeof PREVIEW)[number] | (typeof PREVIEW_MORE)[number]

function PreviewRow({
  lead,
  className,
  style,
}: {
  lead: Lead
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-md bg-card/95 px-4 py-3 transition-colors duration-200",
        className
      )}
      style={style}
    >
      <div className="min-w-0 flex-1 text-sm leading-tight">
        <span className="block truncate font-medium">{lead.name}</span>
        <span className="block truncate text-muted-foreground">
          {lead.company}
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
        <span className={`size-2 rounded-full ${lead.dot}`} />
        {lead.status}
      </span>
      <span className="w-16 text-right text-sm text-muted-foreground tabular-nums">
        {lead.time}
      </span>
    </div>
  )
}

function FollowUpsPreview({ mode }: { mode: Mode }) {
  return (
    <figure
      data-ui
      aria-label="Example of the Today's Follow-ups list, with sample leads"
      className="flex flex-col gap-3"
    >
      <figcaption
        className={`flex items-baseline justify-between ${RISE} delay-150`}
      >
        <span className="text-lg leading-tight font-medium">
          Today&apos;s Follow-ups
          <span className="block text-base font-normal">Example data</span>
        </span>
        <Crossfade
          mode={mode}
          className="text-sm"
          render={(m) => (m === "register" ? "5 scheduled" : "3 scheduled")}
        />
      </figcaption>
      {/* Rows follow the page theme like the real app: white cards in light
          mode, dark cards in dark mode. Slightly translucent so they sit into
          the orange instead of cutting out of it. */}
      <div className="flex flex-col text-foreground">
        <div className="flex flex-col gap-2">
          {PREVIEW.map((lead, i) => (
            <PreviewRow
              key={lead.name}
              lead={lead}
              className={RISE}
              style={{ animationDelay: `${225 + i * 75}ms` }}
            />
          ))}
        </div>
        <Reveal open={mode === "register"}>
          <div className="flex flex-col gap-2 pt-2">
            {PREVIEW_MORE.map((lead) => (
              <PreviewRow key={lead.name} lead={lead} />
            ))}
          </div>
        </Reveal>
      </div>
    </figure>
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
    <main className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-8">
      <div className="grid w-full max-w-5xl grid-cols-1 gap-panel rounded-xl bg-card p-panel shadow-card lg:grid-cols-2">
        {/* Brand panel: a calmer brand orange (brand-surface) in both themes,
            ink text at 4.6:1. Headline top, product fragment bottom; when
            the card grows, the space between them and two extra rows absorb
            it, gliding with the form. */}
        <section
          className={cn(
            "relative z-10 hidden flex-col justify-between gap-10 rounded-lg bg-brand-surface p-10 text-brand-ink lg:flex",
            SWAP,
            !isRegister && "lg:translate-x-[calc(100%+var(--spacing-panel))]"
          )}
        >
          <div className="flex flex-col gap-5">
            <h1 className="animate-in text-6xl leading-[1.02] font-light tracking-tight duration-500 fade-in-0 fill-mode-both slide-in-from-bottom-4 motion-reduce:animate-none">
              Every lead,
              <span className="block text-brand-ink/70">one screen.</span>
            </h1>
            <p className="max-w-sm animate-in text-base leading-relaxed delay-75 duration-500 fade-in-0 fill-mode-both slide-in-from-bottom-4 motion-reduce:animate-none">
              Lead details, sales status, every discussion and the next
              follow-up, without a page for each lead.
            </p>
          </div>
          <FollowUpsPreview mode={mode} />
        </section>

        <section
          className={cn(
            "flex min-w-0 flex-col gap-8 p-6 sm:p-10",
            SWAP,
            !isRegister && "lg:-translate-x-[calc(100%+var(--spacing-panel))]"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Logo left, theme toggle in the top-right corner. */}
            <div className="flex basis-full items-center justify-between">
              <Logo />
              <ModeToggle />
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
      </div>
    </main>
  )
}
