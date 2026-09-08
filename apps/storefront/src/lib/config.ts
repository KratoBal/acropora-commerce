import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

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
  return originalFetch(input, init)
}
