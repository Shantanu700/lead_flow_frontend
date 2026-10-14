"use client"

import { useRouter } from "next/navigation"
import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react"
import { toast } from "sonner"

import { refreshCsrf } from "@/lib/api"
import { useSession } from "@/components/session"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { deleteCoreLogin } from "@/src/client/sdk.gen"

function initials(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return (
    parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)
  ).toUpperCase()
}

function Identity({ name, email }: { name: string; email: string }) {
  return (
    <>
      <Avatar>
        <AvatarFallback>{initials(name, email)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name || email}</span>
        <span className="truncate text-xs">{email}</span>
      </div>
    </>
  )
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const user = useSession()
  const name = user.name ?? ""

  async function logOut() {
    const { error } = await deleteCoreLogin().catch(() => ({
      error: true as const,
    }))
    refreshCsrf()
    if (error)
      toast.warning("We could not reach the server to end your session.")
    else toast.success("Signed out.")
    router.replace("/auth")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Identity name={name} email={user.email} />
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Identity name={name} email={user.email} />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logOut}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
