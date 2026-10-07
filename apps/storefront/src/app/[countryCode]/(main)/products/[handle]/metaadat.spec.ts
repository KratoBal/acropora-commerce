import { describe, expect, it, vi } from "vitest"

/**
 * A TERMEKLAP generateMetadata-JA, A LAP SZINTJEN (barracuda atvetele, #519).
 *
 * A leiras-epito fuggvenyt (`termekLeiras`) a sajat spec-je meri; azt nem, hogy a
 * lap HIVJA. Ha a lap visszaallna a `description: product.title` alakra, a
 * fuggveny-teszt zold maradna. Itt a lap sajat `generateMetadata`-ja fut, a
 * termek-lekeres kifigurazva.
 *
 * MI PIROSIT: a leiras a cim masolata; a cim nem a termek neve; a canonical
 * nem a termeklap.
 */
const adat = vi.hoisted(() => ({
  termek: null as Record<string, unknown> | null,
}))

vi.mock("@lib/data/regions", () => ({
  getRegion: async () => ({ id: "reg_hu" }),
  listRegions: async () => [],
}))
vi.mock("@lib/data/products", () => ({
  listProducts: async () => ({
    response: { products: adat.termek ? [adat.termek] : [] },
  }),
}))
vi.mock("@lib/data/categories", () => ({ listCategories: async () => [] }))
vi.mock("@lib/data/product-knowledge", () => ({
  termekTudas: async () => null,
}))
vi.mock("@modules/products/templates", () => ({ default: () => null }))

import { generateMetadata } from "./page"

const props = {
  params: Promise.resolve({ countryCode: "hu", handle: "vitalis-lps" }),
  searchParams: Promise.resolve({}),
}

describe("a terméklap metaadata", () => {
  it("a leírás a rövid leírásból, és nem a cím", async () => {
    adat.termek = {
      title: "Vitalis LPS Coral Pellets",
      description: "<p>Lassan süllyedő pellet LPS korallokhoz.</p>",
      metadata: { unas_short_description: "<p>LPS koralltáp.</p>" },
    }
    const m = await generateMetadata(props)
    expect(m.title).toBe("Vitalis LPS Coral Pellets | Acropora")
    expect(m.description).toBe("LPS koralltáp.")
    expect(m.alternates?.canonical).toMatch(/\/hu\/products\/vitalis-lps$/)
  })

  it("leírás nélkül sem a cím másolata", async () => {
    adat.termek = { title: "Vitalis LPS Coral Pellets", metadata: null }
    const m = await generateMetadata(props)
    expect(m.description).toBeTruthy()
    expect(m.description).not.toBe("Vitalis LPS Coral Pellets")
    expect(m.description).not.toBe(m.title)
  })
})
