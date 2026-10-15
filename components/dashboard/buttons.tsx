import * as React from "react"

import { cn } from "@/lib/utils"

export function RoundButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      aria-label={props.title}
      className={cn(
        "grid size-16 flex-none cursor-pointer place-items-center rounded-full border-0 bg-background text-foreground",
        className
      )}
      {...props}
    />
  )
}

export function AttentionButton(props: React.ComponentProps<"button">) {
  return (
    <button
      aria-label={props.title}
      className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-attention-foreground text-attention"
      {...props}
    />
  )
}
