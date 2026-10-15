import type { Lead } from "@/src/client/types.gen"

export const initials = (name: string) =>
  name
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")

export const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

export const money = (v: number) => inr.format(v)

/** "15 Oct, 2:00 pm" */
export const stamp = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })

/** "15:15" in local time. */
export const hhmm = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

/** When the lead was last touched: its newest note, else its creation. */
export const lastAt = (l: Lead) => l.last_note?.created_at ?? l.created_at

/** "Just now", "5 min ago", "2 hours ago", "Yesterday", "3 days ago", "12 Oct". */
export const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  if (mins < 24 * 60) {
    const h = Math.round(mins / 60)
    return `${h} hour${h === 1 ? "" : "s"} ago`
  }
  const days = Math.round(mins / 1440)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

export const pct = (v?: number | null) => (v == null ? "—" : v + "%")

export const points = (n: number) => `${n} point${n === 1 ? "" : "s"}`

/** "Kite Labs · was due 2 days ago" */
export const overdueNote = (l: Lead) =>
  [l.company, "was due " + ago(l.next_follow_up_at ?? l.created_at)]
    .filter(Boolean)
    .join(" · ")

/** Upcoming follow-ups grouped by day: [["Thu, 16 Oct", leads], …]. */
export const byDay = (list: Lead[]) => {
  const groups = new Map<string, Lead[]>()
  for (const l of list) {
    const day = new Date(
      l.next_follow_up_at ?? l.created_at
    ).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    groups.set(day, [...(groups.get(day) ?? []), l])
  }
  return [...groups]
}

/** One CSV cell: quoted when it holds a comma, quote or line break. */
export const csvCell = (v: string | number | null) => {
  const t = v == null ? "" : String(v)
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

// Short bar labels: ₹42.6k, ₹1.2L.
export const kfmt = (v: number) =>
  v === 0
    ? "—"
    : v >= 100000
      ? "₹" + (v / 100000).toFixed(1).replace(".0", "") + "L"
      : v >= 1000
        ? "₹" + (v / 1000).toFixed(1).replace(".0", "") + "k"
        : "₹" + v

// Segment opacity by source rank (the API sorts sources largest first).
export const ink = (rank: number) => [1, 0.78, 0.58, 0.42, 0.28][rank] ?? 0.2
