import type {
  PaginatedLead,
  ReportsStats,
  SourceEnum,
} from "@/src/client/types.gen"

export type Status = (typeof STAGES)[number][0]
export type Period = (typeof PERIODS)[number]
/** A timeline entry. System events (lead created) aren't discussions. */
export type Note = {
  key: string
  /** When it was logged (ISO), for the relative time. */
  at: string
  note: string
  /** The follow-up this note scheduled (ISO). */
  follow?: string | null
  system?: boolean
}
export type Sort = "Recent" | "Value" | "Name"

export const LEAD_COLS = "minmax(0,2fr) minmax(0,1.3fr) minmax(0,1fr) 110px"

// Morphing ids each view renders (besides lead rows): what both sides of a
// switch share morphs, the rest fades. Keep in sync with the markup.
export const SHAPE_IDS = [
  "hero",
  "notch-tl",
  "notch-tr",
  "btn-rail",
  "title-pill",
  "actions",
]
export const VIEW_FLIP: Record<number, string[]> = {
  0: [
    ...SHAPE_IDS,
    "notch-att",
    "btn-search",
    "btn-bell",
    "big",
    "callouts",
    "leads-card",
  ],
  1: [...SHAPE_IDS, "big", "callouts", "leads-card"],
  2: [...SHAPE_IDS, "notch-att", "btn-bell"],
  3: [...SHAPE_IDS, "notch-att", "periods", "big", "callouts"],
}

export const STAGES = [
  ["New", "var(--status-new)"],
  ["Contacted", "var(--status-contacted)"],
  ["Qualified", "var(--status-qualified)"],
  ["Proposal Sent", "var(--status-proposal)"],
  ["Won", "var(--status-won)"],
  ["Lost", "var(--status-lost)"],
] as const

export const CHIPS: (readonly ["All" | Status, string | null])[] = [
  ["All", null],
  ...STAGES,
]

export const DOT = Object.fromEntries(STAGES) as Record<Status, string>

export const SORT_KEY = {
  Recent: "recent",
  Value: "value",
  Name: "name",
} as const

export const EMPTY_PAGE: PaginatedLead = {
  count: 0,
  next: null,
  previous: null,
  results: [],
}

export const PERIODS = ["Week", "Month", "Quarter"] as const

export const PERIOD_KEY = {
  Week: "week",
  Month: "month",
  Quarter: "quarter",
} as const

export const PERIOD_LABEL = {
  Week: "This week",
  Month: "This month",
  Quarter: "This quarter",
} as const

export const ZERO_COUNTS = Object.fromEntries(
  STAGES.map(([s]) => [s, 0])
) as Record<Status, number>

// Shown until a period's report arrives.
export const EMPTY_REPORT: ReportsStats = {
  period: "month",
  revenue: 0,
  deals_won: 0,
  avg_deal: 0,
  avg_days_to_close: null,
  win_rate: null,
  prev_win_rate: null,
  bars: [],
  funnel: STAGES.map(([status]) => ({ status, count: 0, value: 0 })),
  leads: 0,
  sources: [],
}

export const BLANK_FORM = {
  name: "",
  company: "",
  phone: "",
  value: "",
  source: "" as SourceEnum | "",
}

export const SOURCE_OPTIONS: SourceEnum[] = [
  "Website form",
  "Referral",
  "LinkedIn",
  "Cold email",
  "Events",
  "Other",
]

// Source picker: "Not recorded" is the empty source.
export const NO_SOURCE = "none"
export const SOURCE_ITEMS = [
  { value: NO_SOURCE, label: "Not recorded" },
  ...SOURCE_OPTIONS.map((o) => ({ value: o, label: o })),
]
