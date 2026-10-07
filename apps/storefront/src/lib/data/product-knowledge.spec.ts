import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getPublicCacheOptions: async (tag: string) => ({ tags: [tag] }),
}))

import { termekTudas } from "./product-knowledge"

afterEach(() => vi.clearAllMocks())

/**
 * A TERMEK-TUDAS GYORSITOTARA (KZ Amino stage futas, #1431 komment
 * 5972125293, 6. lelet). MI PIROSIT: ha a lekeres `force-cache`-sel orokre
 * gyorsitotaraz, vagy nincs korlatos `revalidate` ideje -- akkor a vetites
 * utan a lap soha nem kapja meg az uj tudast.
 */
describe("a termék-tudás lekérése", () => {
  it("korlátos ideig gyorsítótáraz, nem örökre", async () => {
    sdk.client.fetch.mockResolvedValue({
      product_knowledge: { product_id: "prod_kitalalt", facts: [], copy: [] },
    })

    await termekTudas("prod_kitalalt")

    const [ut, opciok] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/product-knowledge/prod_kitalalt")
    expect(opciok.cache).toBeUndefined()
    // FE-7: a publikus lekérés csak a közös címkét viszi, sütiből semmit
    expect(opciok.next.tags).toEqual(["products"])
    expect(opciok.next.revalidate).toBeGreaterThan(0)
    expect(opciok.next.revalidate).toBeLessThanOrEqual(300)
  })

  it("hibánál null, a lap nélküle is teljes", async () => {
    sdk.client.fetch.mockRejectedValue(new Error("kitalált hiba"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(await termekTudas("prod_kitalalt")).toBeNull()
  })
})
