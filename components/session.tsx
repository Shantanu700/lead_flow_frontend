"use client"

import * as React from "react"

import type { User } from "@/src/client/types.gen"

export const SessionContext = React.createContext<User | null>(null)

/** The signed-in user. Only valid below the dashboard layout's auth guard. */
export function useSession(): User {
  const user = React.use(SessionContext)
  if (!user)
    throw new Error("useSession must be used inside the dashboard layout")
  return user
}
