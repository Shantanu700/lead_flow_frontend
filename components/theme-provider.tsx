"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

// Fast off the left edge, settling slowly at the right: y = ln(1 + 15t) / ln(16),
// sampled into CSS linear() so the browser can play it off the main thread.
const WIPE_EASING = `linear(${Array.from({ length: 41 }, (_, i) =>
  (Math.log1p((15 * i) / 40) / Math.log(16)).toFixed(4)
).join(", ")})`

/** Toggles light/dark. Where the browser supports view transitions, the new
 *  theme wipes in from the left. The wipe is a native animation, not GSAP: a
 *  main-thread tween stutters while the page re-renders for the new theme. */
function useThemeToggle() {
  const { setTheme } = useTheme()

  return React.useCallback(() => {
    const root = document.documentElement
    // Read the DOM, not React state, so a second press mid-wipe still flips.
    const next = root.classList.contains("dark") ? "light" : "dark"
    // Swap only the class inside the transition so the "new" snapshot is the
    // new theme. Persisting through next-themes re-renders the app, so that
    // waits until the wipe is done.
    const apply = () => {
      root.classList.toggle("dark", next === "dark")
      root.style.colorScheme = next
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || !document.startViewTransition) {
      apply()
      setTheme(next)
      return
    }

    const transition = document.startViewTransition(apply)
    transition.ready
      .then(() =>
        root.animate(
          { clipPath: ["inset(0 100% 0 0)", "inset(0 0 0 0)"] },
          {
            duration: 700,
            easing: WIPE_EASING,
            pseudoElement: "::view-transition-new(root)",
          }
        )
      )
      .catch(() => {}) // skipped (e.g. a newer toggle); the class is applied
    transition.finished.finally(() => setTheme(next))
  }, [setTheme])
}

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const toggleTheme = useThemeToggle()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      toggleTheme()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [toggleTheme])

  return null
}

export { ThemeProvider, useThemeToggle }
