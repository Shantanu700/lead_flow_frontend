import * as React from "react"

import { cn } from "@/lib/utils"

/** The LeadFlow mark (three rising bars on orange) and wordmark. `small`
 *  is the header size. */
export function Logo({ small }: { small?: boolean }) {
  return (
    <span className={cn("flex items-center", small ? "gap-2.5" : "gap-3")}>
      <span
        className={cn(
          "grid flex-none place-items-center rounded-full bg-primary",
          small ? "size-11" : "size-13"
        )}
      >
        <span className={cn("flex items-end", small ? "gap-0.5" : "gap-[3px]")}>
          <span
            className={cn(
              "rounded-[3px] bg-primary-foreground/60",
              small ? "h-2 w-[5px]" : "h-2.5 w-1.5"
            )}
          />
          <span
            className={cn(
              "rounded-[3px] bg-primary-foreground/80",
              small ? "h-[13px] w-[5px]" : "h-4 w-1.5"
            )}
          />
          <span
            className={cn(
              "rounded-[3px] bg-primary-foreground",
              small ? "h-[18px] w-[5px]" : "h-[22px] w-1.5"
            )}
          />
        </span>
      </span>
      <span
        className={cn(
          "font-medium",
          small ? "text-[17px]" : "text-[22px] tracking-[-0.01em]"
        )}
      >
        LeadFlow
      </span>
    </span>
  )
}
