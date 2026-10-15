import * as React from "react"

import { cn } from "@/lib/utils"

export function Hero({
  padding,
  children,
}: {
  padding: string
  children: React.ReactNode
}) {
  return (
    <div
      data-hero
      data-flip-id="hero"
      className="dark relative box-border flex h-full min-h-[inherit] flex-col overflow-hidden rounded-xl bg-background text-foreground"
      style={{ padding }}
    >
      {children}
    </div>
  )
}

export function Title({
  title,
  sub,
  subClass = "text-muted-foreground",
  subRoll,
}: {
  title: string
  sub: string
  subClass?: string
  /** data-roll key, when the subtitle changes in place. */
  subRoll?: string
}) {
  return (
    <h2 className="m-0 text-2xl leading-[1.2] font-light">
      {title}
      <span data-roll={subRoll} className={cn("block", subClass)}>
        {sub}
      </span>
    </h2>
  )
}
