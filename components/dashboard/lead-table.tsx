import * as React from "react"
import { Calendar, Pencil } from "lucide-react"

import { ago, hhmm, lastAt, money, stamp } from "@/lib/format"
import { DOT, LEAD_COLS } from "@/lib/leads"
import { cn } from "@/lib/utils"
import type { Lead } from "@/src/client/types.gen"
import { Dot } from "@/components/dashboard/atoms"

export function LeadTable({
  rows,
  onOpen,
  onEdit,
  stacked,
}: {
  rows: Lead[]
  onOpen: (id: number) => void
  /** Leads tab only: adds a pencil to each row. */
  onEdit?: (lead: Lead) => void
  /** Phones: name, company and status on the left, value on the right; no
   *  header and no last note. */
  stacked?: boolean
}) {
  // The pencil gets its own column only where editing is offered.
  const base = stacked ? "minmax(0,1fr) auto" : LEAD_COLS
  const cols = onEdit ? base + " 36px" : base
  return (
    <>
      <div
        hidden={stacked}
        className="grid gap-3 px-4 text-xs font-medium text-muted-foreground"
        style={{ gridTemplateColumns: cols }}
      >
        <span>Name</span>
        <span>Status</span>
        <span>Last note</span>
        <span className="text-right">Value</span>
        {onEdit && <span />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {rows.map((l) => (
          // The row is a plain container: a full-size button underneath opens
          // the lead, and the pencil sits above it (no nested buttons).
          <div
            key={l.id}
            data-flip-id={"lead-" + l.id}
            className={cn(
              "group relative grid items-center gap-3 rounded-[18px] bg-card py-3 pl-4 text-left text-foreground transition-colors duration-150 hover:bg-secondary",
              onEdit ? "pr-2.5" : "pr-4"
            )}
            style={{ gridTemplateColumns: cols }}
          >
            <button
              type="button"
              aria-label={`Open ${l.name}`}
              onClick={() => onOpen(l.id)}
              className="absolute inset-0 cursor-pointer rounded-[inherit] border-0 bg-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            />
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-sm font-medium">{l.name}</span>
              <span className="text-xs text-muted-foreground">
                {l.company || "—"}
              </span>
              {stacked && (
                <span className="mt-0.5 truncate text-xs text-muted-foreground">
                  {l.last_note?.note ?? "No notes yet"} · {ago(lastAt(l))}
                </span>
              )}
              {stacked && <span className="mt-1.5">{status(l)}</span>}
            </span>
            {!stacked && status(l)}
            {!stacked && (
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-[13px]">
                  {l.last_note?.note ?? "No notes yet"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ago(lastAt(l))}
                </span>
              </span>
            )}
            <span className="text-right text-[15px] font-light tabular-nums">
              {money(l.value ?? 0)}
            </span>
            {onEdit && (
              <button
                type="button"
                title="Edit lead"
                aria-label={`Edit ${l.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(l)
                }}
                className="relative grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 bg-secondary text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out group-hover:bg-card hover:bg-foreground! hover:text-card active:scale-[0.94] motion-reduce:active:scale-100"
              >
                <Pencil size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-7 text-sm text-muted-foreground">
            No leads match this filter.
          </div>
        )}
      </div>
    </>
  )
}

/** Status chip, with the next follow-up under it when one is open. */
export const status = (l: Lead) => (
  <span className="flex min-w-0 flex-col items-start gap-1">
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-[3px] text-xs font-medium">
      <Dot color={DOT[l.status]} />
      {l.status}
    </span>
    {nextOf(l) && (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar size={12} strokeWidth={1.75} />
        {nextOf(l)}
      </span>
    )}
  </span>
)

/** The lead's next follow-up, if one is open: "Today, 15:15" or a date. */
export const nextOf = (l: Lead) => {
  if (!l.next_follow_up_at || l.follow_up_done_at) return ""
  const d = new Date(l.next_follow_up_at)
  return d.toDateString() === new Date().toDateString()
    ? "Today, " + hhmm(l.next_follow_up_at)
    : stamp(d)
}
