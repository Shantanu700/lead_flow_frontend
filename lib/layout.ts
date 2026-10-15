import type * as React from "react"

/** Breakpoints and sizes for the dashboard frame. They follow the content
 *  width (the frame minus the rail), as in the design, not CSS breakpoints. */
export function layoutFor(w: number, rail: boolean, phone: boolean) {
  // Layout breakpoints follow the content width (frame minus rail), as in the design.
  const cw = phone ? w : w - (rail ? 230 : 86)
  const narrow = cw < 820
  const compact = cw < 1154
  const odW = cw < 914 ? 290 : 330
  const bigSize = phone ? 44 : cw < 914 ? 60 : cw < 1254 ? 72 : 84
  const heroH = phone ? 700 : narrow ? 780 : compact ? 600 : 540
  // Room above the hero's content for the top notches.
  const heroPad = phone ? "80px 20px 24px" : "104px 36px 30px"
  // The round buttons in the top notches.
  const btnSize = phone ? "size-13 min-w-13" : "size-16 min-w-16"
  // Stacked layouts scroll the content column, so their rows take their
  // content's full height (max-content); `auto` rows in this fixed-height
  // grid would shrink and let panels overlap.
  const stackedRows = (n: number) => Array(n).fill("max-content").join(" ")
  const subVisible = cw >= 1000
  const pageStyle: React.CSSProperties = { gridColumn: "1 / -1" }

  return {
    cw,
    narrow,
    compact,
    odW,
    bigSize,
    heroH,
    heroPad,
    btnSize,
    stackedRows,
    subVisible,
    pageStyle,
  }
}
