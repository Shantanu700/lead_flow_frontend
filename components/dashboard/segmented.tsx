"use client"

import * as React from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { cn } from "@/lib/utils"

/** Pill toggle whose dark highlight slides to the chosen option (FLIP: the
 *  highlight renders inside the active button, then tweens from where the
 *  old one was). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  itemClass,
  ...props
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  itemClass?: string
} & Omit<React.ComponentProps<"div">, "onChange">) {
  const ref = React.useRef<HTMLDivElement>(null)
  const from = React.useRef<DOMRect | null>(null)
  const pill = () => ref.current?.querySelector<HTMLElement>("[data-seg-pill]")
  useGSAP(
    () => {
      const old = from.current
      from.current = null
      const el = pill()
      if (!old || !el) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const now = el.getBoundingClientRect()
      gsap.fromTo(
        el,
        { x: old.left - now.left, width: old.width },
        {
          x: 0,
          width: now.width,
          duration: 0.4,
          ease: "power3.inOut",
          clearProps: "transform,width",
        }
      )
    },
    { scope: ref, dependencies: [value] }
  )
  return (
    <div
      ref={ref}
      className={cn(
        "box-border flex gap-1 rounded-full bg-background",
        className
      )}
      {...props}
    >
      {options.map((name) => {
        const on = name === value
        return (
          <button
            key={name}
            aria-pressed={on}
            onClick={() => {
              if (on) return
              from.current = pill()?.getBoundingClientRect() ?? null
              onChange(name)
            }}
            className={cn(
              "relative cursor-pointer rounded-full border-0 bg-transparent text-[13px] font-medium transition-colors duration-400",
              on ? "text-background" : "text-muted-foreground",
              itemClass
            )}
          >
            {on && (
              <span
                data-seg-pill
                aria-hidden
                className="absolute inset-y-0 left-0 w-full rounded-full bg-foreground"
              />
            )}
            <span className="relative z-10">{name}</span>
          </button>
        )
      })}
    </div>
  )
}
