import { GET as storeList } from "../../../store/brands/route"
import { GET as storeOne } from "../../../store/brands/[handle]/route"
import { AdminPutBrand, AdminPutProductBrand } from "../validators"

/*
  THE CONTRACT (SEO P0 PR 11). What turns these red: a brand record accepted
  with a key missing or an unknown key; a handle with a slash (it is one URL
  segment, `/hu/marka/{handle}`); the store answering with the OS id; the store
  list offering a brand with no product; an unknown handle answered as 200.
*/
const record = (over: Record<string, unknown> = {}) => ({
  name: "Aquaforest",
  handle: "aquaforest",
  description: null,
  intro: "Bevezető.",
  seo_title: "Aquaforest termékek",
  meta_description: null,
  logo_url: null,
  website_url: "https://aquaforest.eu",
  ...over,
})

describe("AdminPutBrand", () => {
  const ok = (body: unknown) => AdminPutBrand.safeParse(body).success

  it("takes the OS projection's record", () => {
    expect(ok(record())).toBe(true)
  })

  it("refuses a missing key, an unknown key and a handle that is not one segment", () => {
    const { intro: _, ...missing } = record()
    expect(ok(missing)).toBe(false)
    expect(ok(record({ extra: 1 }))).toBe(false)
    expect(ok(record({ handle: "a/b" }))).toBe(false)
    expect(ok(record({ handle: "" }))).toBe(false)
    expect(ok(record({ website_url: "nem url" }))).toBe(false)
  })

  it("the product link takes an OS id or null, nothing else", () => {
    const ok2 = (body: unknown) => AdminPutProductBrand.safeParse(body).success
    expect(ok2({ os_brand_id: "brand-1" })).toBe(true)
    expect(ok2({ os_brand_id: null })).toBe(true)
    expect(ok2({})).toBe(false)
    expect(ok2({ os_brand_id: "" })).toBe(false)
  })
})

describe("store brand routes", () => {
  const scope = (data: {
    brands: (ReturnType<typeof record> & { os_brand_id: string })[]
    links: { os_brand_id: string }[]
  }) => ({
    resolve: () => ({
      listProductBrands: async (filter?: { os_brand_id?: string }) =>
        filter?.os_brand_id
          ? data.links.filter((l) => l.os_brand_id === filter.os_brand_id)
          : data.links,
      listBrands: async (filter: {
        os_brand_id?: string[]
        handle?: string
      }) =>
        data.brands.filter((b) =>
          filter.handle !== undefined
            ? b.handle === filter.handle
            : (filter.os_brand_id ?? []).includes(b.os_brand_id)
        ),
    }),
  })
  const response = () => {
    const res = { body: undefined as unknown, json: (b: unknown) => (res.body = b) }
    return res
  }
  const data = {
    brands: [
      { ...record(), os_brand_id: "os_1" },
      { ...record({ handle: "ures", name: "Üres" }), os_brand_id: "os_2" },
    ],
    links: [{ os_brand_id: "os_1" }, { os_brand_id: "os_1" }],
  }

  it("lists only brands with a product, without the OS id", async () => {
    const res = response()
    await storeList({ scope: scope(data) } as never, res as never)
    const { brands } = res.body as { brands: Record<string, unknown>[] }
    expect(brands.map((b) => b.handle)).toEqual(["aquaforest"])
    expect(brands[0]).not.toHaveProperty("os_brand_id")
  })

  /*
    Review #538 A. The module service does not page without `take` in Medusa
    2.20.1 (build-query.js:13), so the route must pass none: a `take` would cut
    the sitemap's list silently. Red if either call gets a `take`, or if a
    brand past the 15th goes missing.
  */
  it("returns every brand past 15, and asks without a take", async () => {
    const configs: unknown[] = []
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...record({ handle: `marka-${String(i).padStart(2, "0")}` }),
      os_brand_id: `os_${i}`,
    }))
    const res = response()
    await storeList(
      {
        scope: {
          resolve: () => ({
            listProductBrands: async (_: unknown, config: unknown) => {
              configs.push(config)
              return many.map((b) => ({ os_brand_id: b.os_brand_id }))
            },
            listBrands: async (
              filter: { os_brand_id: string[] },
              config: unknown
            ) => {
              configs.push(config)
              return many.filter((b) => filter.os_brand_id.includes(b.os_brand_id))
            },
          }),
        },
      } as never,
      res as never
    )
    expect((res.body as { brands: unknown[] }).brands).toHaveLength(20)
    expect(configs).toHaveLength(2)
    for (const config of configs) expect(config).not.toHaveProperty("take")
  })

  /*
    t11 (barracuda #1678 B): a hidden brand's record stays in the module, but
    with no product behind it the page is a 404, as in the sitemap list.
  */
  it("a brand with no product behind it is a 404, like the sitemap list", async () => {
    await expect(
      storeOne(
        { scope: scope(data), params: { handle: "ures" } } as never,
        response() as never
      )
    ).rejects.toThrow(/was not found/)
  })

  it("answers one brand by handle, and 404 for an unknown one", async () => {
    const res = response()
    await storeOne(
      { scope: scope(data), params: { handle: "aquaforest" } } as never,
      res as never
    )
    expect((res.body as { brand: { seo_title: string } }).brand.seo_title).toBe(
      "Aquaforest termékek"
    )
    await expect(
      storeOne(
        { scope: scope(data), params: { handle: "nincs" } } as never,
        response() as never
      )
    ).rejects.toThrow(/was not found/)
  })
})
