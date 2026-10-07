// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/*
  A PUBLIKUS LEKERES NEM OLVAS SUTIT (FE-7, Balazs 2026-10-07 07:44 UTC).

  A Next.js-ben egyetlen `cookies()` hivas a lekeresben az egesz lapot
  dinamikussa teszi: a teszt kirakaton emiatt mind a tiz laptipus
  `private, no-store` valaszt adott. A katalogus nem latogatofuggo (vevocsoport-
  ar nincs a kodban), tehat a lekeresnek nincs mit olvasnia a sutibol.

  A VALODI `cookies` modult huzzuk be, nem mockot: a `next/headers` szamolja,
  hanyszor kerdeztek. MI PIROSIT: barmelyik publikus lekeres visszakapja a
  `getCacheOptions`-t vagy a `getAuthHeaders`-t (mindketto sutit olvas), vagy a
  cimke latogatonkenti lesz.
*/
const suti = vi.hoisted(() => ({ olvasasok: 0 }))
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => {
    suti.olvasasok++
    return {
      get: (nev: string) =>
        nev === "_medusa_cache_id" ? { value: "latogato" } : undefined,
    }
  },
}))

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))

import { getCollectionByHandle, listCollections } from "./collections"
import { getCategoryByHandle, listCategories } from "./categories"
import { termekTudas } from "./product-knowledge"
import { listProducts } from "./products"
import { listRegions, retrieveRegion } from "./regions"

beforeEach(() => {
  suti.olvasasok = 0
  sdk.client.fetch.mockImplementation(async (ut: string) => {
    if (ut === "/store/regions")
      return { regions: [{ id: "reg_kitalalt", countries: [{ iso_2: "hu" }] }] }
    if (ut.startsWith("/store/regions/"))
      return { region: { id: "reg_kitalalt" } }
    if (ut === "/store/products") return { products: [], count: 0 }
    if (ut === "/store/product-categories")
      return { product_categories: [], count: 0 }
    if (ut === "/store/collections") return { collections: [], count: 0 }
    if (ut.startsWith("/store/product-knowledge/"))
      return { product_knowledge: { facts: [], copy: [] } }
    throw new Error(`nem vart ut: ${ut}`)
  })
})

afterEach(() => vi.clearAllMocks())

type Opcio = { headers?: Record<string, string>; next?: { tags?: string[] } }

const opciok = () =>
  sdk.client.fetch.mock.calls.map((hivas) => {
    const [ut, o] = hivas as [string, Opcio | undefined]
    return { ut, fejlec: o?.headers ?? {}, cimkek: o?.next?.tags ?? [] }
  })

describe("a publikus lekérés sütit nem olvas", () => {
  it.each([
    ["listRegions", () => listRegions()],
    ["retrieveRegion", () => retrieveRegion("reg_kitalalt")],
    ["listProducts", () => listProducts({ countryCode: "hu" })],
    ["listCategories", () => listCategories({ limit: 5 })],
    ["getCategoryByHandle", () => getCategoryByHandle(["eszkozok"])],
    ["listCollections", () => listCollections()],
    ["getCollectionByHandle", () => getCollectionByHandle("kitalalt")],
    ["termekTudas", () => termekTudas("prod_kitalalt")],
  ])("%s", async (_nev, hivas) => {
    await hivas()

    expect(sdk.client.fetch).toHaveBeenCalled()
    expect(suti.olvasasok).toBe(0)
    for (const { fejlec, cimkek } of opciok()) {
      expect(Object.keys(fejlec)).not.toContain("authorization")
      expect(cimkek.length).toBeGreaterThan(0)
      expect(cimkek.some((c) => c.endsWith("-latogato"))).toBe(false)
    }
  })

  it("a termékek a közös címkét viszik, amit a #514 ürít", async () => {
    await listProducts({ regionId: "reg_kitalalt" })

    const termek = opciok().find((o) => o.ut === "/store/products")
    expect(termek?.cimkek).toEqual(["products"])
  })
})
