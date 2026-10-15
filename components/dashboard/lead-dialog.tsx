"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SourceEnum } from "@/src/client/types.gen"
import { NO_SOURCE, SOURCE_ITEMS } from "@/lib/leads"
import {
  CloseButton,
  NotchedSurface,
  POPUP_STYLE,
} from "@/components/dashboard/popup"

gsap.registerPlugin(useGSAP, Flip)

// Dev only: reach GSAP from the browser console, e.g. slow motion with
// gsap.globalTimeline.timeScale(0.2). Not shipped in production builds.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined")
  (window as unknown as { gsap: typeof gsap }).gsap = gsap

import { useDash } from "@/components/dashboard/context"

/** Add a lead, or edit one (editLead set): name required; status is never set here. */
export function LeadDialog() {
  const { add, setAdd, form, setForm, saving, editLead, saveLead } = useDash()
  return (
    <Dialog open={add} onOpenChange={setAdd}>
      <DialogContent showCloseButton={false} style={POPUP_STYLE}>
        <NotchedSurface />
        <CloseButton onClick={() => setAdd(false)} />
        <form onSubmit={saveLead} className="contents">
          <DialogHeader>
            <DialogTitle>{editLead ? "Edit lead" : "Add new lead"}</DialogTitle>
            <DialogDescription>
              {editLead
                ? "Only the fields you change are saved."
                : "Only the name is required."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3.5">
            {(
              [
                ["name", "Full name", "text"],
                ["company", "Company", "text"],
                ["phone", "Phone", "tel"],
                ["value", "Estimated value (₹)", "number"],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={"lead-" + key}>{label}</Label>
                <Input
                  id={"lead-" + key}
                  type={type}
                  required={key === "name"}
                  {...(key === "value" && {
                    min: 0,
                    step: 1,
                    inputMode: "numeric" as const,
                    placeholder: "0",
                  })}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  aria-invalid={
                    key === "name" && !!form.name && !form.name.trim()
                  }
                  aria-describedby={
                    key === "name" ? "lead-name-error" : undefined
                  }
                />
                {key === "name" && !!form.name && !form.name.trim() && (
                  <span
                    id="lead-name-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    Enter a name, not just spaces.
                  </span>
                )}
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-source">Source</Label>
              <Select
                items={SOURCE_ITEMS}
                value={form.source || NO_SOURCE}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    source: v === NO_SOURCE ? "" : (v as SourceEnum),
                  })
                }
              >
                <SelectTrigger id="lead-source" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_ITEMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={!form.name.trim() || saving}>
              {saving ? "Saving…" : editLead ? "Save changes" : "Save lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
