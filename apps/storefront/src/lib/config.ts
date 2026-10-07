import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

import { epitesKozbenUjraprobal } from "@lib/util/epites-ujraprobalas"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs,
): Promise<T> => {
  /**
   * EGYNYELVU BOLT: a starter itt egy `x-medusa-locale` fejlecet tett MINDEN
   * SDK-keresre, a `/store/locales` vegpontrol lekerdezett nyelv alapjan.
   * A mi Medusankon az a vegpont NEM LETEZIK (merve 2026-09-07: HTTP 404),
   * tehat a fejlec mindig `null` lett volna.
   *
   * Kivettuk, nem kikapcsoltuk: egy mindig-null fejlec ugy nezne ki, mint egy
   * mukodo, csak epp beallitatlan kepesseg.
   */
  const headers = init?.headers ?? {}
  const newHeaders = { ...headers }
  init = {
    ...init,
    headers: newHeaders,
  }
  /*
    BUILD KOZBEN a bolt atmeneti kieseset (502/503/504, halozati hiba) kb. egy
    percig ujraprobaljuk, csak GET-nel; futasidoben valtozatlan. Minden
    SDK-hivas (az `sdk.store.*` is) ezen a burkolon megy at. Reszletek:
    `lib/util/epites-ujraprobalas`.
  */
  const keresInit = init
  return epitesKozbenUjraprobal(() => originalFetch<T>(input, keresInit), {
    method: init.method,
    url: keresLeiras(input, init.query),
  })
}

/** A keres olvashato alakja a build-naploba: utvonal es a lekerdezes (a handle-lel). */
function keresLeiras(input: FetchInput, query: FetchArgs["query"]): string {
  const ut = String(input)
  if (!query || typeof query !== "object") return ut
  const parameterek = Object.entries(query as Record<string, unknown>)
    .filter(([, ertek]) => ertek !== undefined && ertek !== null)
    .map(([kulcs, ertek]) => `${kulcs}=${String(ertek)}`)
  return parameterek.length ? `${ut}?${parameterek.join("&")}` : ut
}
