import { DOT, type Status } from "@/lib/leads"

// Illustrative only: example data showing what LeadFlow looks like inside.
// No real people or companies.

/** The glass card over the hero photo cycles through these. */
export const LIVE = [
  {
    initials: "PS",
    name: "Priya Sharma",
    company: "Acme Corp",
    value: 48000,
    steps: [
      ["Proposal Sent", "Proposal sent", "Mon"],
      ["Contacted", "Call back about pricing", "11:30 am"],
      ["Won", "Likely to close", "This week"],
    ],
  },
  {
    initials: "RV",
    name: "Rahul Verma",
    company: "Northwind",
    value: 22500,
    steps: [
      ["Qualified", "Qualified on first call", "Tue"],
      ["Contacted", "Send product demo", "2:00 pm"],
      ["Proposal Sent", "Proposal next", "Fri"],
    ],
  },
  {
    initials: "AI",
    name: "Aisha Iqbal",
    company: "Bluefin Studio",
    value: 15000,
    steps: [
      ["New", "Came in from website", "Today"],
      ["Contacted", "First call", "4:15 pm"],
      ["Qualified", "Check budget", "Tomorrow"],
    ],
  },
  {
    initials: "KM",
    name: "Karan Mehta",
    company: "Orbit Labs",
    value: 64000,
    steps: [
      ["Proposal Sent", "Revised proposal", "Wed"],
      ["Contacted", "Follow up on terms", "5:30 pm"],
      ["Won", "Contract draft", "Next week"],
    ],
  },
] as const

/** The hero's leads card; its filter picks from these. */
export const EXAMPLE_LEADS: [
  name: string,
  company: string,
  Status,
  value: number,
][] = [
  ["Priya Sharma", "Acme Corp", "Proposal Sent", 48000],
  ["Rahul Verma", "Northwind", "Qualified", 22500],
  ["Aisha Iqbal", "Bluefin Studio", "New", 15000],
  ["Karan Mehta", "Orbit Labs", "Contacted", 64000],
  ["Neha Joshi", "Lumen Labs", "Won", 52000],
  ["Vikram Rao", "Peakline", "New", 18000],
  ["Sara Thomas", "Kite & Co", "Contacted", 27500],
  ["Arjun Nair", "Fernbridge", "Lost", 9000],
  ["Meera Pillai", "Brightside", "Qualified", 36000],
  ["Dev Malhotra", "Cobalt Works", "Won", 41000],
]

/** Leads per stage in the tour's pipeline. */
export const STAGE_COUNTS: [Status, number][] = [
  ["New", 14],
  ["Contacted", 11],
  ["Qualified", 8],
  ["Proposal Sent", 6],
  ["Won", 4],
  ["Lost", 2],
]

export const FOLLOWS: [time: string, name: string, company: string, Status][] =
  [
    ["9:30 am", "Aisha Iqbal", "Bluefin Studio", "New"],
    ["11:30 am", "Priya Sharma", "Acme Corp", "Proposal Sent"],
    ["2:00 pm", "Rahul Verma", "Northwind", "Qualified"],
    ["5:30 pm", "Karan Mehta", "Orbit Labs", "Contacted"],
  ]

/** Revenue won per day this week (₹). */
export const WEEK: [day: string, value: number][] = [
  ["Mon", 1200],
  ["Tue", 2600],
  ["Wed", 3100],
  ["Thu", 0],
  ["Fri", 2900],
  ["Sat", 0],
  ["Sun", 0],
]

export const TIMELINE: [title: string, meta: string, Status][] = [
  ["Added as a lead", "From website form · 2 Oct", "New"],
  ["First call", "Interested in the team plan · 4 Oct", "Contacted"],
  ["Qualified", "Budget confirmed · 8 Oct", "Qualified"],
  ["Demo booked", "Thursday, 3 pm, with their ops lead · 9 Oct", "Qualified"],
  [
    "Pricing questions",
    "Wants annual billing for 12 seats · 11 Oct",
    "Qualified",
  ],
  ["Proposal sent", "₹48,000 · 13 Oct", "Proposal Sent"],
]

export const TABS = [
  {
    label: "Pipeline",
    desc: "Six stages from New to Won. Tap a stage to see who is in it.",
  },
  {
    label: "Follow-ups",
    desc: "Today's calls in time order. Tick one off when it's done.",
  },
  {
    label: "Reports",
    desc: "Revenue won this week, by day, with no spreadsheet.",
  },
  {
    label: "Lead timeline",
    desc: "Every call, note and status change for one lead, in order.",
  },
] as const

export { DOT }

/** Reports view: revenue won per bar for each period, deals and win rate. */
export const REPORTS = {
  Week: { bars: WEEK, deals: 4, winRate: 50 },
  Month: {
    bars: [
      ["W1", 6200],
      ["W2", 9800],
      ["W3", 4100],
      ["W4", 11300],
    ] as [string, number][],
    deals: 12,
    winRate: 46,
  },
  Quarter: {
    bars: [
      ["Aug", 28400],
      ["Sep", 35100],
      ["Oct", 31400],
    ] as [string, number][],
    deals: 33,
    winRate: 44,
  },
}
export type Period = keyof typeof REPORTS

/** The follow-ups view's overdue card. */
export const OVERDUE = {
  name: "Arjun Nair",
  company: "Fernbridge",
  note: "Was due 2 days ago · asked for a revised quote",
} as const
