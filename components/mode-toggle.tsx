"use client"

import { MoonIcon, SunIcon } from "lucide-react"

import { useThemeToggle } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const toggleTheme = useThemeToggle()

  return (
    <Button
      variant="secondary"
      size="icon"
      className="rounded-full"
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  )
}
