import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getPublicCacheOptions: async (tag: string) => ({ tags: [tag] }),
}))

import { markaHandleAlapjan } from "./brands"

afterEach(() => vi.clearAllMocks())

const hiba = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status })

/**
 * A MARKAOLDAL REKORDJA (SEO P0 PR 11, barracuda review #538 E). MI PIROSIT:
 * ha egy atmeneti hiba (500, halozat) is `null` lenne -- akkor a lap 404-et
 * adna egy elo markara, es az ISR ezt a revalidate idejeig tarolna.
 */
describe("a márka lekérése handle alapján", () => {
  it("a rekordot adja, korlátos gyorsítótárral", async () => {
    sdk.client.fetch.mockResolvedValue({ brand: { handle: "aquaforest" } })
    expect(await markaHandleAlapjan("aquaforest")).toEqual({
      handle: "aquaforest",
    })
    const [ut, opciok] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/brands/aquaforest")
    expect(opciok.next.revalidate).toBeGreaterThan(0)
  })

  it("csak a 404 null", async () => {
    sdk.client.fetch.mockRejectedValue(hiba(404))
    expect(await markaHandleAlapjan("nincs")).toBeNull()
  })

  it("az 500 és a státusz nélküli hiba továbbmegy", async () => {
    sdk.client.fetch.mockRejectedValueOnce(hiba(500))
    await expect(markaHandleAlapjan("aquaforest")).rejects.toThrow("HTTP 500")
    sdk.client.fetch.mockRejectedValueOnce(new Error("fetch failed"))
    await expect(markaHandleAlapjan("aquaforest")).rejects.toThrow(
      "fetch failed",
    )
  })
})
