import { OverlaySamples } from "@/components/overlay-samples"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <main className="flex flex-1 flex-col gap-panel">
      <section className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-lg leading-tight font-normal">
          Colour tokens
          <span className="block text-muted-foreground">Light and dark</span>
        </h2>
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
          {swatches.map(([name, className]) => (
            <div key={name} className="flex flex-col gap-2">
              <div
                className={`h-14 rounded-md ring-1 ring-border ${className}`}
              />
              <span className="text-xs text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-panel md:grid-cols-2">
        <section className="rounded-xl bg-card p-6 shadow-card">
          <h2 className="text-lg leading-tight font-normal">
            Buttons
            <span className="block text-muted-foreground">Variants</span>
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button>Add New Lead</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-5 flex w-fit flex-wrap gap-1 rounded-full bg-secondary p-1">
            {["All", "New", "Won"].map((label, i) => (
              <span
                key={label}
                className={
                  i === 0
                    ? "rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
                    : "rounded-full px-3 py-1 text-sm"
                }
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-card p-6 shadow-card">
          <h2 className="text-lg leading-tight font-normal">
            Lead statuses
            <span className="block text-muted-foreground">Dot plus label</span>
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {statuses.map(([label, dot]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium"
              >
                <span className={`size-2 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl bg-card p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg leading-tight font-normal">
            Priya Sharma
            <span className="block text-muted-foreground">Example Traders</span>
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
            <span className="size-2 rounded-full bg-status-proposal" />
            Proposal Sent
          </span>
        </div>
        <p className="mt-4 max-w-prose text-sm text-muted-foreground">
          Sent pricing PDF. Will review with the purchase team this week.
          <span className="text-foreground"> 2 hours ago</span>
        </p>
        <p className="mt-5 flex items-baseline gap-2">
          <span className="text-5xl font-light">3</span>
          <span className="text-sm font-medium">follow-ups today</span>
        </p>
      </section>
      <section className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-lg leading-tight font-normal">
          Overlays
          <span className="block text-muted-foreground">
            Dialog, modal, drawer, tooltip
          </span>
        </h2>
        <div className="mt-5">
          <OverlaySamples />
        </div>
      </section>
    </main>
  )
}

const swatches = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["foreground", "bg-foreground"],
  ["highlight", "bg-highlight"],
  ["primary", "bg-primary"],
  ["primary-hover", "bg-primary-hover"],
  ["secondary", "bg-secondary"],
  ["muted-foreground", "bg-muted-foreground"],
  ["border", "bg-border"],
  ["input", "bg-input"],
  ["sidebar", "bg-sidebar"],
  ["destructive", "bg-destructive"],
  [
    "chart-1…5",
    "bg-[linear-gradient(90deg,var(--chart-1)_20%,var(--chart-2)_20%_40%,var(--chart-3)_40%_60%,var(--chart-4)_60%_80%,var(--chart-5)_80%)]",
  ],
]

const statuses = [
  ["New", "bg-status-new"],
  ["Contacted", "bg-status-contacted"],
  ["Qualified", "bg-status-qualified"],
  ["Proposal Sent", "bg-status-proposal"],
  ["Won", "bg-status-won"],
  ["Lost", "bg-status-lost"],
]
