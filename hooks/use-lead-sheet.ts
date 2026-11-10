import * as React from "react"
import { toast } from "sonner"

import { got, toastFailure } from "@/lib/api"
import type { Note, Status } from "@/lib/leads"
import {
  getApiLeadsDiscussions,
  postApiLeadsDiscussions,
  putApiLead,
} from "@/src/client/sdk.gen"
import type { Discussion, Lead } from "@/src/client/types.gen"

/** The lead drawer: the lead it shows, its timeline, the note and follow-up
 *  form, and status moves. */
export function useLeadSheet({
  leads,
  mergeLists,
  save,
  captureRows,
}: {
  /** Leads on screen, to open one by id. */
  leads: Lead[]
  /** Put a saved lead into the dashboard's lists. */
  mergeLists: (lead: Lead) => void
  save: (job: () => Promise<void>) => Promise<void>
  captureRows: () => void
}) {
  const [sheet, setSheet] = React.useState(false)
  // The lead open in the sheet; kept here so a save that moves it off the
  // current page doesn't empty the sheet.
  const [selLead, setSelLead] = React.useState<Lead | null>(null)
  // Each lead's discussions, newest first, fetched when its sheet opens.
  const [talk, setTalk] = React.useState<Record<number, Discussion[]>>({})
  const [note, setNote] = React.useState("")
  const [fuOn, setFuOn] = React.useState(false)
  const [fuAt, setFuAt] = React.useState<Date | null>(null)

  // Put a lead the server returned into every list that shows it.
  const merge = (lead: Lead) => {
    mergeLists(lead)
    setSelLead((l) => (l?.id === lead.id ? lead : l))
  }

  const timeline: Note[] = selLead
    ? [
        ...(talk[selLead.id] ?? []).map((d) => ({
          key: "d" + d.id,
          at: d.created_at,
          note: d.note,
          follow: d.follow_up_at,
        })),
        {
          key: "created",
          at: selLead.created_at,
          note: "Lead created",
          system: true,
        },
      ]
    : []

  // `lead` when the caller already has it (the palette's results may not be
  // in any list on screen); otherwise it's found in those lists.
  const openLead = (id: number, lead?: Lead) => {
    setSelLead(lead ?? leads.find((l) => l.id === id) ?? null)
    setSheet(true)
    got(getApiLeadsDiscussions({ path: { id } }), (list) =>
      setTalk((all) => ({ ...all, [id]: list }))
    ).catch(toastFailure)
  }

  const addNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selLead || !note.trim()) return
    // Keep everything typed when the follow-up is incomplete.
    if (fuOn && !fuAt) {
      toast.warning("Pick a date and time for the follow-up.")
      return
    }
    const id = selLead.id
    return save(async () => {
      await got(
        postApiLeadsDiscussions({
          path: { id },
          body: {
            note: note.trim(),
            follow_up_at: fuOn ? fuAt!.toISOString() : null,
          },
        }),
        ({ discussion, lead }) => {
          setTalk((all) => ({ ...all, [id]: [discussion, ...(all[id] ?? [])] }))
          merge(lead)
        }
      )
      setNote("")
      setFuOn(false)
      setFuAt(null)
      toast.success(fuOn ? "Note and follow-up saved." : "Note added.")
    })
  }

  const setStatus = (status: Status) => {
    if (!selLead || status === selLead.status) return
    return save(async () => {
      await got(
        putApiLead({ path: { id: selLead.id }, body: { status } }),
        (lead) => {
          captureRows()
          merge(lead)
        }
      )
      toast.success(`Moved to ${status}.`)
    })
  }

  return {
    sheet,
    setSheet,
    selLead,
    talk,
    note,
    setNote,
    fuOn,
    setFuOn,
    fuAt,
    setFuAt,
    timeline,
    merge,
    openLead,
    addNote,
    setStatus,
  }
}
