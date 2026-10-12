import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getPublicCacheOptions: async (tag: string) => ({ tags: [tag] }),
}))

import { valogatasHandleAlapjan, valogatasTermekAzonositok } from "./valogatas"

afterEach(() => vi.clearAllMocks())

const hiba = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status })

/**
 * A VÁLOGATÁS ADATRÉTEGE (t10). MI PIROSÍTJA: egy átmeneti hiba (500) is 404
 * lenne, és az ISR egy élő válogatásra 404-et tárolna.
 */
describe("a válogatás lekérése", () => {
  it("a rekord és az azonosítók a saját útjukon, korlátos gyorsítótárral", async () => {
    sdk.client.fetch.mockResolvedValueOnce({ landing_page: { handle: "kh" } })
    sdk.client.fetch.mockResolvedValueOnce({ product_ids: ["p1"] })
    expect(await valogatasHandleAlapjan("kh")).toEqual({ handle: "kh" })
    expect(await valogatasTermekAzonositok("kh")).toEqual(["p1"])
    expect(sdk.client.fetch.mock.calls.map((c) => c[0])).toEqual([
      "/store/landing-pages/kh",
      "/store/landing-pages/kh/product-ids",
    ])
    expect(sdk.client.fetch.mock.calls[0][1].next.revalidate).toBeGreaterThan(0)
  })

  it("csak a 404 null, a többi hiba továbbmegy", async () => {
    sdk.client.fetch.mockRejectedValueOnce(hiba(404))
    expect(await valogatasHandleAlapjan("nincs")).toBeNull()
    sdk.client.fetch.mockRejectedValueOnce(hiba(404))
    expect(await valogatasTermekAzonositok("nincs")).toBeNull()
    sdk.client.fetch.mockRejectedValueOnce(hiba(500))
    await expect(valogatasHandleAlapjan("kh")).rejects.toThrow("HTTP 500")
    sdk.client.fetch.mockRejectedValueOnce(hiba(503))
    await expect(valogatasTermekAzonositok("kh")).rejects.toThrow("HTTP 503")
  })
})
