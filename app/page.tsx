import { redirect } from "next/navigation"

// The dashboard layout decides between the app and /auth.
export default function Home() {
  redirect("/dashboard")
}
