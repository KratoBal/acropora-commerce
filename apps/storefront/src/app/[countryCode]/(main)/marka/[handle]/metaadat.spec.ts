import { describe, expect, it, vi } from "vitest"

/**
 * A MARKAOLDAL ES A REGI GYUJTEMENY-LAP generateMetadata-JA (SEO P0 PR 11).
 *
 * A lapok sajat `generateMetadata`-ja fut, a marka- es gyujtemeny-lekeres
 * kifigurazva. MI PIROSIT: a markaoldal canonicalja nem a `/hu/marka/{slug}`;
 * a SEO-cim vagy a meta leiras nem a marka-modulbol jon; az ismeretlen marka
 * nem 404; a markahoz tartozo gyujtemeny-lap nem a markaoldalra mutat; egy
 * markarekord nelkuli (kuralt) gyujtemeny canonicalt kap.
 */
const adat = vi.hoisted(() => ({
  marka: null as Record<string, unknown> | "dob" | null,
}))

vi.mock("@lib/data/brands", () => ({
  markaHandleAlapjan: async () => {
    if (adat.marka === "dob") throw new Error("HTTP 500")
    return adat.marka
  },
}))
vi.mock("@lib/data/collections", () => ({
  getCollectionByHandle: async (handle: string) => ({
    id: "pcol_1",
    title: "Aquaforest",
    handle,
    metadata: null,
  }),
  listCollections: async () => ({ collections: [] }),
}))
vi.mock("@lib/data/regions", () => ({ listRegions: async () => [] }))
vi.mock("@lib/data/products", () => ({
  listProducts: async () => ({ response: { products: [], count: 0 } }),
}))
vi.mock("@lib/data/categories", () => ({ listCategories: async () => [] }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
vi.mock("@modules/collections/templates", () => ({ default: () => null }))

import { generateMetadata } from "./page"
import { generateMetadata as gyujtemenyMetaadat } from "../../collections/[handle]/page"
import { generateMetadata as gyujtemenyLapozott } from "../../%5Fp/[lap]/collections/[handle]/page"

const props = {
  params: Promise.resolve({ countryCode: "hu", handle: "aquaforest" }),
}

const marka = (over: Record<string, unknown> = {}) => ({
  name: "Aquaforest",
  handle: "aquaforest",
  description: "Lengyel tengeriakvarisztikai gyártó.",
  intro: null,
  seo_title: null,
  meta_description: null,
  logo_url: null,
  website_url: null,
  updated_at: null,
  ...over,
})

describe("a márkaoldal metaadata", () => {
  it("a canonical a /hu/marka/{slug}, a cím és a leírás a márkából", async () => {
    adat.marka = marka({
      seo_title: "Aquaforest termékek | Acropora",
      meta_description: "Aquaforest sók, tápok és adalékok.",
    })
    const m = await generateMetadata(props)
    expect(m.alternates?.canonical).toBe("/hu/marka/aquaforest")
    expect(m.title).toBe("Aquaforest termékek | Acropora")
    expect(m.description).toBe("Aquaforest sók, tápok és adalékok.")
  })

  it("SEO-mezők nélkül a név és a leírás a tartalék", async () => {
    adat.marka = marka()
    const m = await generateMetadata(props)
    expect(m.title).toBe("Aquaforest | Acropora")
    expect(m.description).toContain("Lengyel tengeriakvarisztikai gyártó.")
  })

  it("ismeretlen márka: 404", async () => {
    adat.marka = null
    await expect(generateMetadata(props)).rejects.toThrow("NEXT_NOT_FOUND")
  })
})

describe("a régi gyűjtemény-lap canonicalja", () => {
  it("márkához tartozó gyűjtemény a márkaoldalra mutat", async () => {
    adat.marka = marka()
    const m = await gyujtemenyMetaadat(props)
    expect(m.alternates?.canonical).toBe("/hu/marka/aquaforest")
  })

  it("a márka-végpont hibája a gyűjtemény-lapot nem viszi el", async () => {
    adat.marka = "dob"
    const m = await gyujtemenyMetaadat(props)
    expect(m.alternates).toBeUndefined()
    expect(m.title).toBe("Aquaforest | Acropora")
  })

  it("a lapozott gyűjtemény is a márkaoldal azonos lapjára mutat", async () => {
    adat.marka = marka()
    const m = await gyujtemenyLapozott({
      params: Promise.resolve({
        countryCode: "hu",
        handle: "aquaforest",
        lap: "2",
      }),
    })
    expect(m.alternates?.canonical).toBe("/hu/marka/aquaforest?page=2")
  })

  it("márkarekord nélküli gyűjtemény nem kap canonicalt", async () => {
    adat.marka = null
    const m = await gyujtemenyMetaadat(props)
    expect(m.alternates).toBeUndefined()
  })
})
