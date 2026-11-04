import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getPublicCacheOptions: async (tag: string) => ({ tags: [tag] }),
}))

import { nemKaphatoTermek } from "./nem-kaphato"

afterEach(() => vi.clearAllMocks())

const hiba = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status })

/*
  A NEM KAPHATO TERMEK ADATA (V4.2). MI PIROSIT: ha egy atmeneti hiba (500,
  halozat) is `null` lenne: akkor egy kifutott termek lapja 404-et adna, es az
  ISR ezt a revalidate idejeig tarolna; ha a handle nincs kodolva az utban.
*/
describe("a nem kaphato termek lekerese", () => {
  it("a vegpontot kerdezi, kodolt handle-lel, gyorsitotarral", async () => {
    sdk.client.fetch.mockResolvedValue({
      termek: { id: "p" },
      helyette: [],
      hasonlo: [],
    })
    expect(await nemKaphatoTermek("régi tápoldat")).toMatchObject({
      termek: { id: "p" },
    })
    const [ut, opciok] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/nem-kaphato/r%C3%A9gi%20t%C3%A1poldat")
    expect(opciok.next.revalidate).toBeGreaterThan(0)
  })

  it("csak a 404 null, minden mas hiba tovabbmegy", async () => {
    sdk.client.fetch.mockRejectedValueOnce(hiba(404))
    expect(await nemKaphatoTermek("nincs")).toBeNull()
    sdk.client.fetch.mockRejectedValueOnce(hiba(500))
    await expect(nemKaphatoTermek("x")).rejects.toThrow("HTTP 500")
    sdk.client.fetch.mockRejectedValueOnce(new Error("fetch failed"))
    await expect(nemKaphatoTermek("x")).rejects.toThrow("fetch failed")
  })
})
