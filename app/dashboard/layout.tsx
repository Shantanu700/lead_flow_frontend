"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import "@/lib/api"
import { SessionContext } from "@/components/session"
import { getCoreLogin } from "@/src/client/sdk.gen"
import type { User } from "@/src/client/types.gen"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = React.useState<User | null>(null)

  // The session cookie lives on the API origin, so only the API can say who
  // is signed in. Render nothing until it answers.
  React.useEffect(() => {
    let active = true
    const bounce = () => {
      toast.info("Sign in to open LeadFlow.", { id: "auth-required" })
      router.replace("/auth")
    }
    getCoreLogin()
      .then(({ data }) => {
        if (!active) return
        if (data) setUser(data)
        else bounce()
      })
      .catch(() => active && bounce())
    return () => {
      active = false
    }
  }, [router])

  if (!user) return null

  return <SessionContext value={user}>{children}</SessionContext>
}
