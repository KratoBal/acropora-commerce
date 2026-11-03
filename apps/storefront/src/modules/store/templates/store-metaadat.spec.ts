import { describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/products", () => ({ listProducts: vi.fn() }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
vi.mock("@modules/store/templates", () => ({ default: () => null }))

import { storeMetaadat } from "./store-lap-torzs"

/**
 * A /store LAP METAADATA A LAP NYELVEN. MI PIROSIT: ha az angol uton magyar
 * cim marad; ha a magyar ut cime elmozdul; ha a lapozott cim lapszama nem a
 * lap nyelven all; ha a canonical elveszti az angol szegmenst.
 */
describe("a /store metaadata", () => {
  it("magyarul: összes termék, keresés, (2. oldal)", () => {
    expect(storeMetaadat("hu", {}).title).toBe("Összes termék | Acropora")
    expect(storeMetaadat("hu", { q: "led" }).title).toBe(
      "Keresés: led | Acropora",
    )
    expect(storeMetaadat("hu", { page: "2" }).title).toBe(
      "Összes termék | Acropora (2. oldal)",
    )
  })

  it("angolul: All products, Search, (page 2), és az angol canonical", () => {
    const alap = storeMetaadat("en-hu", {})
    expect(alap.title).toBe("All products | Acropora")
    expect(alap.description).toBe("All products of the Acropora web shop.")
    expect(storeMetaadat("en-hu", { q: "led" })).toMatchObject({
      title: "Search: led | Acropora",
      description: "Results for “led” at the Acropora web shop.",
    })
    expect(storeMetaadat("en-hu", { page: "2" }).title).toBe(
      "All products | Acropora (page 2)",
    )
    expect(String(alap.alternates?.canonical)).toContain("/en-hu/store")
  })
})
