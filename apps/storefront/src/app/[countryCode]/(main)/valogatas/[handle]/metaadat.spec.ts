import { describe, expect, it, vi } from "vitest"

/**
 * A VÁLOGATÁS LAPJÁNAK generateMetadata-JA (t10), a lap saját függvényével.
 * MI PIROSÍTJA: a canonical nem a /hu/valogatas/{slug}; a SEO-cím vagy -leírás
 * nem a landingből jön; az ismeretlen vagy érvénytelen szűrőjű válogatás nem 404.
 */
const adat = vi.hoisted(() => ({
  v: null as Record<string, unknown> | null,
  ids: ["p1"] as string[],
}))

vi.mock("@lib/data/valogatas", () => ({
  valogatasHandleAlapjan: async () => adat.v,
  valogatasTermekAzonositok: async () => adat.ids,
}))
vi.mock("@lib/data/products", () => ({
  listProducts: async () => ({ response: { products: [], count: 0 } }),
}))
vi.mock("@lib/data/regions", () => ({ getRegion: async () => ({ id: "reg" }) }))
vi.mock("@lib/data/categories", () => ({ listCategories: async () => [] }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
// the page body is not under test here (its own spec renders it): the shared
// list page pulls the cart's server action, which a metadata spec has no use for
vi.mock("@modules/categories/templates/commerce/lista-lap", () => ({
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

  it("termékkel indexelhető, termék nélkül noindex (barracuda #544)", async () => {
    adat.v = valogatas()
    adat.ids = ["p1"]
    expect((await generateMetadata(props)).robots).toMatchObject({
      index: true,
    })
    adat.ids = []
    expect((await generateMetadata(props)).robots).toEqual({
      index: false,
      follow: true,
    })
    adat.ids = ["p1"]
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

describe("a válogatás metaadata az angol úton", () => {
  const enProps = {
    params: Promise.resolve({ countryCode: "en-hu", handle: "kh-potlas" }),
  }

  it("a tartalék leírás angol, az OpenGraph en_US, a canonical az angol út", async () => {
    adat.v = valogatas({ intro: null })
    const m = await generateMetadata(enProps)
    expect(m.description).toBe(
      "KH-pótlók: a selection at the Acropora web shop.",
    )
    expect(m.openGraph).toMatchObject({ locale: "en_US" })
    expect(m.alternates?.canonical).toBe("/en-hu/valogatas/kh-potlas")
  })

  it("a válogatás saját szövege adat: az angol úton sem fordul", async () => {
    adat.v = valogatas()
    expect((await generateMetadata(enProps)).description).toBe(
      "A karbonátkeménység emelésére.",
    )
  })
})
