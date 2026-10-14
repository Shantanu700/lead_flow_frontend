"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import "@/lib/api"
import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { SessionContext } from "@/components/session"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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

  return (
    <SessionContext value={user}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <div className="flex min-w-0 flex-1 flex-col gap-panel p-panel md:pl-0">
            <header className="flex shrink-0 items-center gap-2 rounded-xl bg-card px-5 py-3.5 shadow-card">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="ml-auto">
                <ModeToggle />
              </div>
            </header>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SessionContext>
  )
}
