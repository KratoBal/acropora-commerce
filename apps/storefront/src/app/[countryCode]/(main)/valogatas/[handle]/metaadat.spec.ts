import { describe, expect, it, vi } from "vitest"

/**
 * A VÁLOGATÁS LAPJÁNAK generateMetadata-JA (t10), a lap saját függvényével.
 * MI PIROSÍTJA: a canonical nem a /hu/valogatas/{slug}; a SEO-cím vagy -leírás
 * nem a landingből jön; az ismeretlen vagy érvénytelen szűrőjű válogatás nem 404.
 */
const adat = vi.hoisted(() => ({ v: null as Record<string, unknown> | null }))

vi.mock("@lib/data/valogatas", () => ({
  valogatasHandleAlapjan: async () => adat.v,
  valogatasTermekAzonositok: async () => [],
}))
vi.mock("@lib/data/products", () => ({
  listProducts: async () => ({ response: { products: [], count: 0 } }),
}))
vi.mock("@lib/data/regions", () => ({ getRegion: async () => ({ id: "reg" }) }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
vi.mock("@modules/products/components/product-preview", () => ({
  default: () => null,
}))

import { generateMetadata } from "./page"

const props = {
  params: Promise.resolve({ countryCode: "hu", handle: "kh-potlas" }),
}
const valogatas = (over: Record<string, unknown> = {}) => ({
  handle: "kh-potlas",
  title: "KH-pótlók",
  seo_title: null,
  meta_description: null,
  intro: "A karbonátkeménység emelésére.",
  filter: {
    category_ids: ["pcat_kh"],
    os_brand_ids: [],
    attribute_filters: [],
  },
  updated_at: null,
  ...over,
})

describe("a válogatás metaadata", () => {
  it("canonical a /hu/valogatas/{slug}, a SEO-mezők a landingből", async () => {
    adat.v = valogatas({
      seo_title: "KH-pótlók | Acropora",
      meta_description: "KH-emelő szerek.",
    })
    const m = await generateMetadata(props)
    expect(m.alternates?.canonical).toBe("/hu/valogatas/kh-potlas")
    expect(m.title).toBe("KH-pótlók | Acropora")
    expect(m.description).toBe("KH-emelő szerek.")
  })

  it("SEO-mezők nélkül a cím és a bevezető a tartalék", async () => {
    adat.v = valogatas()
    const m = await generateMetadata(props)
    expect(m.title).toBe("KH-pótlók | Acropora")
    expect(m.description).toBe("A karbonátkeménység emelésére.")
  })

  it("ismeretlen, üres szűrőjű vagy attribútum-szűrős válogatás: 404", async () => {
    for (const v of [
      null,
      valogatas({
        filter: { category_ids: [], os_brand_ids: [], attribute_filters: [] },
      }),
      valogatas({
        filter: {
          category_ids: ["pcat_kh"],
          os_brand_ids: [],
          attribute_filters: [{ key: "liter", op: "gte", value: 1 }],
        },
      }),
    ]) {
      adat.v = v
      await expect(generateMetadata(props)).rejects.toThrow("NEXT_NOT_FOUND")
    }
  })
})
