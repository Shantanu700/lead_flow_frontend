import { Calendar, ChartColumn, House, Users } from "lucide-react"

// Icon props: rail and buttons (ic), small inline icons (sm).
export const ic = { size: 20, strokeWidth: 1.75 }
export const sm = { size: 16, strokeWidth: 1.75 }

export const NAV = [
  ["Dashboard", House],
  ["Leads", Users],
  ["Follow-ups", Calendar],
  ["Reports", ChartColumn],
] as const
