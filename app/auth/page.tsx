"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RouteIcon } from "lucide-react"
import { toast } from "sonner"

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
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

const FIELD = "h-11 px-4 md:text-base"

function PasswordInput({
  id,
  autoComplete,
  invalid,
  inputRef,
  minLength,
}: {
  id: string
  autoComplete: string
  invalid?: boolean
  inputRef?: React.Ref<HTMLInputElement>
  minLength?: number
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

const RISE =
  "animate-in duration-500 fill-mode-both fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"

function FollowUpsPreview() {
  return (
    <figure
      data-ui
      aria-label="Example of the Today's Follow-ups list, with sample leads"
      className="flex flex-col gap-2"
    >
      <figcaption
        className={`mb-1 flex items-baseline justify-between ${RISE} delay-150`}
      >
        <span className="text-lg leading-tight font-normal">
          Today&apos;s Follow-ups
          <span className="block text-muted-foreground">Example data</span>
        </span>
        <span className="text-sm text-muted-foreground">3 scheduled</span>
      </figcaption>
      {PREVIEW.map((lead, i) => (
        <div
          key={lead.name}
          className={`flex items-center gap-4 rounded-md bg-card px-4 py-3 ${RISE}`}
          style={{ animationDelay: `${225 + i * 75}ms` }}
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
      ))}
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
        {/* Brand panel: always dark, whatever the page theme. It shows the
            product itself, a "Today's Follow-ups" fragment, instead of decoration. */}
        <section className="dark hidden flex-col justify-center gap-10 rounded-lg bg-background p-10 text-foreground lg:flex">
          <div className="flex flex-col gap-5">
            <h1 className="animate-in text-6xl leading-[1.02] font-light tracking-tight duration-500 fade-in-0 fill-mode-both slide-in-from-bottom-4 motion-reduce:animate-none">
              Every lead,
              <span className="block text-muted-foreground">one screen.</span>
            </h1>
            <p className="max-w-sm animate-in text-base leading-relaxed text-foreground/80 delay-75 duration-500 fade-in-0 fill-mode-both slide-in-from-bottom-4 motion-reduce:animate-none">
              Lead details, sales status, every discussion and the next
              follow-up, without a page for each lead.
            </p>
          </div>
          <FollowUpsPreview />
        </section>

        <section className="flex min-w-0 flex-col gap-8 p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="basis-full">
              <Logo />
            </div>
            <div
              role="group"
              aria-label="Choose log in or register"
              className="flex w-fit gap-1 rounded-full bg-secondary p-1"
            >
              {(["login", "register"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => switchMode(value)}
                  className="rounded-control px-4 py-1.5 text-sm font-medium transition-colors hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {value === "login" ? "Log in" : "Register"}
                </button>
              ))}
            </div>
            <ModeToggle />
          </div>

          <h2 className={`text-2xl leading-tight font-light ${RISE} delay-75`}>
            {copy.title}
            <span className="block text-muted-foreground">{copy.subtitle}</span>
          </h2>

          <form
            onSubmit={onSubmit}
            className={`flex flex-col gap-4 ${RISE} delay-150`}
          >
            {isRegister && (
              <Field id="name" label="Full name">
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  required
                  className={FIELD}
                />
              </Field>
            )}
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
            {isRegister && (
              <Field id="confirm" label="Confirm password">
                <PasswordInput
                  id="confirm"
                  autoComplete="new-password"
                  minLength={8}
                  invalid={mismatch}
                  inputRef={confirmRef}
                />
              </Field>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="mt-2 h-11 w-full"
            >
              {pending ? "Working…" : copy.submit}
            </Button>
          </form>

          <p className={`text-sm text-muted-foreground ${RISE} delay-200`}>
            {copy.switchPrompt}{" "}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? "login" : "register")}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {copy.switchAction}
            </button>
          </p>
        </section>
      </div>
    </main>
  )
}
