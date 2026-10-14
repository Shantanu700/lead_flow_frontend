// Configures the generated API client (src/client). Import this module before
// calling any SDK function; it is imported for its side effects.
import { client } from "@/src/client/client.gen"
import { getCoreCsrf } from "@/src/client/sdk.gen"

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:8011"

// The session is a `sessionid` cookie on the API origin; fetch's default
// `same-origin` credentials would drop it.
client.setConfig({ baseUrl: API_BASE, credentials: "include" })

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"])
let csrfToken: Promise<string> | null = null

function fetchCsrf(): Promise<string> {
  csrfToken ??= getCoreCsrf().then(({ data }) => data?.csrf_token ?? "")
  // A failed fetch must not poison the cache for the next request.
  csrfToken.catch(() => (csrfToken = null))
  return csrfToken
}

/** Django rotates the CSRF token on login and logout; call after either. */
export function refreshCsrf(): void {
  csrfToken = null
}

client.interceptors.request.use(async (request) => {
  if (UNSAFE.has(request.method)) {
    const token = await fetchCsrf()
    if (token) request.headers.set("X-CSRFToken", token)
  }
  return request
})

export { client }

function messages(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(messages)
  if (value && typeof value === "object")
    return Object.values(value).flatMap(messages)
  return []
}

/** Turns `{msg}`, `{detail}` or per-field error dicts into one readable sentence. */
export function describeApiError(error: unknown): string {
  if (error && typeof error === "object") {
    const found = messages(
      "msg" in error ? error.msg : "detail" in error ? error.detail : error
    )
    if (found.length) return found.join(" ")
  }
  return "Something went wrong. Please try again."
}

export const OFFLINE =
  "Could not reach the server. Check your connection and try again."
