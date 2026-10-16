import type { Metadata } from "next"

import { Home } from "@/components/home/home"

export const metadata: Metadata = {
  title: "LeadFlow · Every lead, followed up on time",
  description:
    "Lead tracking for small sales teams: pipeline, today's follow-ups and this week's revenue on one screen.",
}

export default function Page() {
  return <Home />
}
