"use client"

import * as React from "react"
import {
  ArrowRight,
  Calendar,
  ChartColumn,
  House,
  Moon,
  Pencil,
  Plus,
  Users,
} from "lucide-react"

import "@/lib/api"
import { toastFailure } from "@/lib/api"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { getApiLeads } from "@/src/client/sdk.gen"
import type { Lead } from "@/src/client/types.gen"

const TABS = [
  { label: "Dashboard", icon: House },
  { label: "Leads", icon: Users },
  { label: "Follow-ups", icon: Calendar },
  { label: "Reports", icon: ChartColumn },
] as const

/**
 * The search button's command palette (also ⌘K / Ctrl+K). Searches leads on
 * the server; Enter opens a lead and ⌘↵ / the pencil edits it. Also jumps
 * between tabs and runs actions.
 */
export function CommandPalette({
  open,
  onOpenChange,
  view,
  dotOf,
  onOpenLead,
  onEditLead,
  onNavigate,
  onAddLead,
  onToggleTheme,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: number
  dotOf: (status: Lead["status"]) => string
  onOpenLead: (lead: Lead) => void
  onEditLead: (lead: Lead) => void
  onNavigate: (tab: number) => void
  onAddLead: () => void
  onToggleTheme: () => void
}) {
  const [q, setQ] = React.useState("")
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [picked, setPicked] = React.useState("")
  const seq = React.useRef(0)

  // Server search, after a pause in typing; an empty query lists the most
  // recently touched leads. Answers to older queries are dropped.
  React.useEffect(() => {
    if (!open) return
    const mine = ++seq.current
    const t = setTimeout(
      () => {
        getApiLeads({
          query: {
            q: q.trim() || undefined,
            ordering: "recent",
            page_size: 6,
          },
        })
          .then(({ data, error }) => {
            if (mine !== seq.current) return
            if (error !== undefined || !data) throw error
            setLeads(data.results)
          })
          .catch(toastFailure)
      },
      q ? 200 : 0
    )
    return () => clearTimeout(t)
  }, [q, open])

  // Reset when it closes, so it reopens clean.
  const openChange = (next: boolean) => {
    if (!next) {
      setQ("")
      setPicked("")
    }
    onOpenChange(next)
  }
  const run = (fn: () => void) => {
    openChange(false)
    fn()
  }
  // Tabs and actions match on their label; leads come filtered by the server.
  const matches = (label: string) =>
    label.toLowerCase().includes(q.trim().toLowerCase())
  const tabs = TABS.map((t, i) => ({ ...t, i })).filter((t) =>
    matches("go to " + t.label)
  )
  const actions = [
    {
      id: "add",
      label: "Add new lead",
      icon: Plus,
      run: onAddLead,
    },
    {
      id: "theme",
      label: "Toggle light / dark theme",
      icon: Moon,
      run: onToggleTheme,
    },
  ].filter((a) => matches(a.label))
  // Highlight: what the user moved to, while it's still listed; otherwise
  // the first row (so Enter acts on the top result as results change).
  const rows = [
    ...leads.map((l) => "lead-" + l.id),
    ...tabs.map((t) => "tab-" + t.i),
    ...actions.map((a) => "action-" + a.id),
  ]
  const active = rows.includes(picked) ? picked : (rows[0] ?? "")

  return (
    <CommandDialog
      open={open}
      onOpenChange={openChange}
      title="Search LeadFlow"
      description="Search leads, jump to a tab or run an action."
      className="duration-150 ease-out sm:max-w-lg"
    >
      {/* Leads arrive filtered by the server, so cmdk doesn't re-filter. */}
      <Command
        shouldFilter={false}
        loop
        className="rounded-none"
        value={active}
        onValueChange={setPicked}
        onKeyDown={(e) => {
          // ⌘↵ / Ctrl+Enter edits the highlighted lead.
          if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return
          const lead = leads.find((l) => "lead-" + l.id === active)
          if (!lead) return
          e.preventDefault()
          run(() => onEditLead(lead))
        }}
      >
        <CommandInput
          value={q}
          onValueChange={setQ}
          placeholder="Search leads, tabs and actions…"
        />
        <CommandList>
          <CommandEmpty>Nothing matches “{q}”.</CommandEmpty>
          {leads.length > 0 && (
            <CommandGroup heading={q.trim() ? "Leads" : "Recent leads"}>
              {leads.map((l) => (
                <CommandItem
                  key={l.id}
                  value={"lead-" + l.id}
                  onSelect={() => run(() => onOpenLead(l))}
                  className="py-1.5 pr-1.5"
                >
                  <span
                    className="size-2 flex-none rounded-full"
                    style={{ background: dotOf(l.status) }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{l.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {[l.company, l.status].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <button
                    type="button"
                    title="Edit lead (⌘↵)"
                    aria-label={`Edit ${l.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      run(() => onEditLead(l))
                    }}
                    className="grid size-8 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out group-data-selected/command-item:bg-card group-data-selected/command-item:text-primary hover:bg-foreground! hover:text-card active:scale-[0.94] motion-reduce:active:scale-100"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {tabs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Go to">
                {tabs.map((t) => (
                  <CommandItem
                    key={t.label}
                    value={"tab-" + t.i}
                    onSelect={() => run(() => onNavigate(t.i))}
                  >
                    <t.icon />
                    {t.label}
                    {t.i === view ? (
                      <CommandShortcut>Current</CommandShortcut>
                    ) : (
                      <ArrowRight className="ml-auto text-muted-foreground" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {actions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                {actions.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={"action-" + a.id}
                    onSelect={() => run(a.run)}
                  >
                    <a.icon />
                    {a.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
        {/* Keyboard hints; touch screens have no use for them. */}
        <div className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground max-sm:hidden">
          <span>
            <Kbd>↵</Kbd> open
          </span>
          <span>
            <Kbd>⌘↵</Kbd> edit lead
          </span>
          <span>
            <Kbd>esc</Kbd> close
          </span>
          <span className="ml-auto">
            <Kbd>⌘K</Kbd> anywhere
          </span>
        </div>
      </Command>
    </CommandDialog>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-1 rounded-md bg-muted px-1.5 py-0.5 font-sans text-[11px] text-foreground">
      {children}
    </kbd>
  )
}
