"use client"

import * as React from "react"

import type { Dashboard } from "@/app/dashboard/use-dashboard"

/** The dashboard's state and handlers (useDashboard), for its views. */
export const DashboardContext = React.createContext<Dashboard | null>(null)

export function useDash() {
  const d = React.useContext(DashboardContext)
  if (!d) throw new Error("useDash() needs a DashboardContext provider.")
  return d
}
