import * as React from "react"

import { initials } from "@/lib/format"

export function Dot({ color }: { color: string }) {
  return (
    <span
      className="size-2 flex-none rounded-full"
      style={{ background: color }}
    />
  )
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-10 flex-none place-items-center rounded-full bg-secondary text-[13px] font-medium">
      {initials(name)}
    </span>
  )
}
