import { GET } from "../[handle]/product-ids/route"
import { landingSzuro, leszarmazottakkal } from "../szuro"

/*
  THE LANDING'S PRODUCTS (SEO P1-14, t10). What turns these red: an empty
  filter answering with the whole catalogue; a non-empty attribute_filters
  applied halfway (or ignored); the brand and category dimensions combined with
  OR instead of AND; an unpublished landing answering; a brand with no products
  falling through to an unfiltered product query.
*/
describe("landingSzuro", () => {
  it("takes categories, brands, or both", () => {
    expect(
      landingSzuro({ category_ids: ["c1"], os_brand_ids: [], attribute_filters: [] })
    ).toEqual({ category_ids: ["c1"], os_brand_ids: [] })
    expect(
      landingSzuro({ category_ids: [], os_brand_ids: ["b1"], attribute_filters: [] })
    ).toEqual({ category_ids: [], os_brand_ids: ["b1"] })
  })

  it("refuses an empty filter, attribute filters, and a malformed one", () => {
    expect(
      landingSzuro({ category_ids: [], os_brand_ids: [], attribute_filters: [] })
    ).toBeNull()
    expect(
      landingSzuro({
        category_ids: ["c1"],
        os_brand_ids: [],
        attribute_filters: [{ key: "liter", op: "gte", value: 100 }],
      })
    ).toBeNull()
    expect(landingSzuro({ category_ids: "c1", os_brand_ids: [] })).toBeNull()
    expect(landingSzuro(null)).toBeNull()
  })
})

describe("leszarmazottakkal", () => {
  it("the whole subtree, once each, and a loop does not hang", () => {
    const fa = [
      { id: "a", parent_category_id: null },
      { id: "b", parent_category_id: "a" },
      { id: "c", parent_category_id: "b" },
      { id: "x", parent_category_id: "y" },
      { id: "y", parent_category_id: "x" },
    ]
    expect(leszarmazottakkal(fa, ["a"]).sort()).toEqual(["a", "b", "c"])
    expect(leszarmazottakkal(fa, ["x"]).sort()).toEqual(["x", "y"])
    expect(leszarmazottakkal(fa, ["nincs"])).toEqual(["nincs"])
  })
})

describe("GET /store/landing-pages/:handle/product-ids", () => {
  const scope = (data: {
    page?: { handle: string; filter: unknown } | null
    brandLinks?: { product_id: string; os_brand_id: string }[]
    products?: { id: string; categories: string[]; channels?: string[] }[]
  }) => {
    const productCalls: unknown[] = []
    return {
      productCalls,
      scope: {
        resolve: (key: string) => {
          if (key === "landing_page")
            return {
              listLandingPages: async (f: { handle: string; is_published: boolean }) =>
                data.page && f.is_published && f.handle === data.page.handle
                  ? [data.page]
                  : [],
            }
          if (key === "brand")
            return {
              listProductBrands: async (f: { os_brand_id: string[] }) =>
                (data.brandLinks ?? []).filter((l) => f.os_brand_id.includes(l.os_brand_id)),
            }
          if (key === "product")
            return {
              listProductCategories: async () => [
                { id: "c_tap", parent_category_id: null },
                { id: "c_kh", parent_category_id: "c_tap" },
                { id: "c_so", parent_category_id: null },
              ],
              listProducts: async (f: {
                id?: string[]
                categories?: { id: string[] }
              }) => {
                productCalls.push(f)
                return (data.products ?? []).filter(
                  (p) =>
                    (!f.id || f.id.includes(p.id)) &&
                    (!f.categories ||
                      p.categories.some((c) => f.categories!.id.includes(c)))
                )
              }
            }
          if (key === "query")
            return {
              graph: async (q: { filters: { id: string[] } }) => ({
                data: (data.products ?? [])
                  .filter((p) => q.filters.id.includes(p.id))
                  .map((p) => ({
                    id: p.id,
                    sales_channels: (p.channels ?? ["sc_web"]).map((id) => ({ id })),
                  })),
              }),
            }
          throw new Error(`unexpected ${key}`)
        },
      },
    }
  }
  const call = async (
    s: ReturnType<typeof scope>,
    handle = "kh-potlas",
    csatornak: string[] = ["sc_web"]
  ) => {
    const res = { body: undefined as unknown, json: (b: unknown) => (res.body = b) }
    await GET(
      {
        scope: s.scope,
        params: { handle },
        publishable_key_context: { key: "pk", sales_channel_ids: csatornak },
      } as never,
      res as never
    )
    return (res.body as { product_ids: string[] }).product_ids
  }
  const products = [
    { id: "p1", categories: ["c_kh"] },
    { id: "p2", categories: ["c_kh"] },
    { id: "p3", categories: ["c_so"] },
  ]

  it("brand AND category: only the products in both", async () => {
    const s = scope({
      page: { handle: "kh-potlas", filter: { category_ids: ["c_kh"], os_brand_ids: ["b_af"], attribute_filters: [] } },
      brandLinks: [
        { product_id: "p2", os_brand_id: "b_af" },
        { product_id: "p3", os_brand_id: "b_af" },
      ],
      products,
    })
    expect(await call(s)).toEqual(["p2"])
    expect(s.productCalls[0]).toMatchObject({ status: "published" })
  })

  it("a chosen category counts with its subcategories (nautilus, 29016)", async () => {
    const s = scope({
      page: {
        handle: "kh-potlas",
        filter: { category_ids: ["c_tap"], os_brand_ids: [], attribute_filters: [] },
      },
      products,
    })
    expect(await call(s)).toEqual(["p1", "p2"])
  })

  /*
    barracuda #544: a csak pultos termek nem szamit bele (kulonben a lapszam
    tobbet igerne, es ures lapok lennenek), es a sorrend megmarad.
  */
  it("only the products of the storefront's sales channel, in order", async () => {
    const s = scope({
      page: {
        handle: "kh-potlas",
        filter: { category_ids: ["c_kh"], os_brand_ids: [], attribute_filters: [] },
      },
      products: [
        { id: "p1", categories: ["c_kh"], channels: ["sc_web"] },
        { id: "p2", categories: ["c_kh"], channels: ["sc_pos"] },
        { id: "p4", categories: ["c_kh"], channels: ["sc_pos", "sc_web"] },
      ],
    })
    expect(await call(s)).toEqual(["p1", "p4"])
  })

  it("a brand with no products answers empty, without an unfiltered query", async () => {
    const s = scope({
      page: { handle: "kh-potlas", filter: { category_ids: [], os_brand_ids: ["b_none"], attribute_filters: [] } },
      products,
    })
    expect(await call(s)).toEqual([])
    expect(s.productCalls).toHaveLength(0)
  })

  it("unknown, unpublished, or invalid landing: 404", async () => {
    await expect(call(scope({ page: null }))).rejects.toThrow(/was not found/)
    await expect(
      call(
        scope({
          page: { handle: "kh-potlas", filter: { category_ids: [], os_brand_ids: [], attribute_filters: [] } },
          products,
        })
      )
    ).rejects.toThrow(/was not found/)
  })
})
