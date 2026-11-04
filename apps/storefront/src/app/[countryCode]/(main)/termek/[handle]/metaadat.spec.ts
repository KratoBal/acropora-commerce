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
  kifutott: null as Record<string, unknown> | null,
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
vi.mock("@lib/data/brands", () => ({ termekMarka: async () => null }))
vi.mock("@lib/data/product-knowledge", () => ({
  termekTudas: async () => null,
}))
vi.mock("@modules/products/templates", () => ({ default: () => null }))
vi.mock("@lib/data/nem-kaphato", () => ({
  nemKaphatoTermek: async () => adat.kifutott,
}))

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
    expect(m.alternates?.canonical).toMatch(/\/hu\/termek\/vitalis-lps$/)
  })

  it("a saját robots-tiltású termék noindex (t13)", async () => {
    adat.termek = {
      title: "Blue Life Nitrate FX 500ml",
      metadata: { seo_robots: "noindex, nofollow" },
    }
    const m = await generateMetadata(props)
    expect(m.robots).toEqual({ index: false, follow: false })
    adat.termek = { title: "Vitalis LPS Coral Pellets", metadata: null }
    expect((await generateMetadata(props)).robots).toMatchObject({
      index: true,
    })
  })

  it("leírás nélkül sem a cím másolata", async () => {
    adat.termek = { title: "Vitalis LPS Coral Pellets", metadata: null }
    const m = await generateMetadata(props)
    expect(m.description).toBeTruthy()
    expect(m.description).not.toBe("Vitalis LPS Coral Pellets")
    expect(m.description).not.toBe(m.title)
  })
})

describe("a kifutott termek metaadata (V4.2)", () => {
  it("korall cime es leirasa, a kanonikus a sajat lap", async () => {
    adat.termek = null
    adat.kifutott = {
      termek: {
        id: "p",
        title: "Red Sea Reef Foundation A",
        handle: "vitalis-lps",
        kategoria: null,
      },
      helyette: [],
      hasonlo: [],
    }
    const meta = await generateMetadata(props)
    expect(meta.title).toBe(
      "Már nem kapható: Red Sea Reef Foundation A | Acropora",
    )
    expect(meta.description).toBe(
      "Ez a termék már nem kapható. Mutatjuk a legközelebbi helyettesítőket ugyanabból a kategóriából.",
    )
    expect(String(meta.alternates?.canonical)).toContain(
      "/hu/termek/vitalis-lps",
    )
    adat.kifutott = null
  })
})

describe("a terméklap metaadata az angol úton", () => {
  const enProps = {
    params: Promise.resolve({ countryCode: "en-hu", handle: "vitalis-lps" }),
    searchParams: Promise.resolve({}),
  }

  it("leírás nélkül az angol sablonmondat áll, a cím a terméknév, az OpenGraph en_US", async () => {
    adat.termek = { title: "Vitalis LPS Coral Pellets", metadata: null }
    const m = await generateMetadata(enProps)
    expect(m.title).toBe("Vitalis LPS Coral Pellets | Acropora")
    expect(m.description).toBe(
      "Vitalis LPS Coral Pellets: order from the Acropora web shop.",
    )
    expect(m.openGraph).toMatchObject({ locale: "en_US" })
    expect(m.alternates?.canonical).toMatch(/\/en-hu\/termek\/vitalis-lps$/)
  })

  it("a termék saját leírása adat: az angol úton sem fordul", async () => {
    adat.termek = {
      title: "T",
      metadata: { seo_description: "Magyar SEO-leírás." },
    }
    expect((await generateMetadata(enProps)).description).toBe(
      "Magyar SEO-leírás.",
    )
  })
})
