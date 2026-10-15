import * as React from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ic } from "@/components/dashboard/icons"

/** The popup's surface with its top-right corner cut out for the close button. */
export function NotchedSurface() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-1 rounded-[inherit]"
      style={{
        filter:
          "drop-shadow(0 1px 2px rgb(0 0 0 / 0.06)) drop-shadow(0 12px 32px rgb(0 0 0 / 0.14))",
      }}
    >
      <div style={NOTCH_MASK} />
    </div>
  )
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon-lg"
      aria-label="Close"
      title="Close"
      onClick={onClick}
      className="absolute top-0 right-0 z-1 size-12 min-w-12 rounded-full p-0"
    >
      <X {...ic} className="size-5" />
    </Button>
  )
}

export const NOTCH_SVG =
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="78" height="78"><path d="M0 0H78V78A20 20 0 0 0 58 58H54A34 34 0 0 1 20 24V20A20 20 0 0 0 0 0Z"/></svg>'
  ) +
  '")'
export const NOTCH_MASK: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "var(--popover)",
  borderRadius: "inherit",
  maskImage: "linear-gradient(#000,#000), " + NOTCH_SVG,
  WebkitMaskImage: "linear-gradient(#000,#000), " + NOTCH_SVG,
  maskPosition: "0 0, top right",
  WebkitMaskPosition: "0 0, top right",
  maskSize: "100% 100%, 78px 78px",
  WebkitMaskSize: "100% 100%, 78px 78px",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskComposite: "exclude",
  WebkitMaskComposite: "xor",
}
// The popup itself is transparent; NotchedSurface paints it.
export const POPUP_STYLE: React.CSSProperties = {
  background: "transparent",
  boxShadow: "none",
  border: 0,
  isolation: "isolate",
}
export const SHEET_STYLE: React.CSSProperties = {
  ...POPUP_STYLE,
  top: 6,
  right: 6,
  bottom: 6,
  height: "auto",
  borderRadius: 32,
}
