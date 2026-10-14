import { defineConfig } from "@hey-api/openapi-ts"

// Generated from the backend's live schema. Re-run `bun run openapi-ts` after
// any API change; never edit src/client by hand.
export default defineConfig({
  input: "https://localhost:8011/api/schema/",
  output: "src/client",
})
