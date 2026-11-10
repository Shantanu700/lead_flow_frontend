import * as React from "react"
import { toast } from "sonner"

import { got } from "@/lib/api"
import { BLANK_FORM } from "@/lib/leads"
import { postApiLeads, putApiLead } from "@/src/client/sdk.gen"
import type { Lead } from "@/src/client/types.gen"

/** The Add/Edit lead dialog: its form, the lead it edits and saving it. */
export function useLeadDialog({
  save,
  merge,
  onCreated,
}: {
  save: (job: () => Promise<void>) => Promise<void>
  merge: (lead: Lead) => void
  onCreated: () => void
}) {
  const [add, setAdd] = React.useState(false)
  const [form, setForm] = React.useState(BLANK_FORM)
  // The lead dialog edits this lead; null means it adds a new one.
  const [editLead, setEditLead] = React.useState<Lead | null>(null)

  // Row pencil: the lead dialog, prefilled, in edit mode.
  const openEdit = (lead: Lead) => {
    setEditLead(lead)
    setForm({
      name: lead.name,
      company: lead.company ?? "",
      phone: lead.phone ?? "",
      value: String(lead.value ?? 0),
      source: lead.source ?? "",
    })
    setAdd(true)
  }
  // Header +: a blank dialog (an unsaved new-lead draft is kept).
  const openAdd = () => {
    if (editLead) {
      setEditLead(null)
      setForm(BLANK_FORM)
    }
    setAdd(true)
  }

  // Editing sends only the fields that changed.
  const saveLead = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const fields = {
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      value: Math.max(0, Math.round(Number(form.value) || 0)),
      source: form.source,
    }
    const was = editLead
    const changed = was
      ? Object.fromEntries(
          Object.entries(fields).filter(
            ([k, v]) =>
              v !== (was[k as keyof typeof fields] ?? (k === "value" ? 0 : ""))
          )
        )
      : fields
    if (was && !Object.keys(changed).length) return setAdd(false)
    return save(async () => {
      if (was) {
        await got(putApiLead({ path: { id: was.id }, body: changed }), merge)
        toast.success("Lead updated.")
      } else {
        await got(postApiLeads({ body: fields }), () => {})
        onCreated()
        toast.success("Lead saved.")
      }
      setForm(BLANK_FORM)
      setEditLead(null)
      setAdd(false)
    })
  }

  return { add, setAdd, form, setForm, editLead, openEdit, openAdd, saveLead }
}
