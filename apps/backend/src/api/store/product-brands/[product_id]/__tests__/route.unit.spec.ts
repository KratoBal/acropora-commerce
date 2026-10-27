const resolveService = jest.fn()
jest.mock("../../../../admin/brands/helpers", () => ({
  resolveBrandService: (...a: unknown[]) => resolveService(...a),
}))

import { GET } from "../route"

/**
 * THE PRODUCT'S BRAND FOR THE PAGE (audit S4). What must fail: a draft product
 * answering with its brand; a published product's brand name not coming from
 * the brand module (the feed's own reading); an untrimmed or empty name; a
 * product without a brand answering something other than null.
 */
const asked: { filters: Record<string, unknown> }[] = []
const scopeWith = (published: boolean) =>
  ({
    resolve: () => ({
      graph: async (q: { filters: Record<string, unknown> }) => {
        asked.push(q)
        return { data: published ? [{ id: "prod_1" }] : [] }
      },
    }),
  }) as never

const service = (links: { product_id: string; os_brand_id: string }[], names: Record<string, string>) => ({
  listProductBrands: async () => links,
  listBrands: async () => Object.entries(names).map(([os_brand_id, name]) => ({ os_brand_id, name })),
})

const call = async (published: boolean) => {
  const res = { json: jest.fn() }
  await GET({ params: { product_id: "prod_1" }, scope: scopeWith(published) } as never, res as never)
  return res.json.mock.calls[0][0]
}

describe("GET /store/product-brands/:product_id", () => {
  it("answers the brand module's name, trimmed, for a published product", async () => {
    resolveService.mockReturnValue(service([{ product_id: "prod_1", os_brand_id: "b1" }], { b1: "  Aquaforest " }))
    expect(await call(true)).toEqual({ product_brand: { product_id: "prod_1", name: "Aquaforest" } })
  })

  it("asks only for a PUBLISHED product (the filter, not just the answer)", async () => {
    asked.length = 0
    resolveService.mockReturnValue(service([], {}))
    await call(true)
    expect(asked[0].filters).toEqual({ id: "prod_1", status: "published" })
  })

  it("a product with no brand link answers null", async () => {
    resolveService.mockReturnValue(service([], {}))
    expect(await call(true)).toEqual({ product_brand: { product_id: "prod_1", name: null } })
  })

  it("a link whose brand has no usable name answers null", async () => {
    resolveService.mockReturnValue(service([{ product_id: "prod_1", os_brand_id: "b1" }], { b1: "   " }))
    expect(await call(true)).toEqual({ product_brand: { product_id: "prod_1", name: null } })
  })

  it("a product that is not published answers null and never reads the brand module", async () => {
    resolveService.mockClear()
    resolveService.mockReturnValue(service([{ product_id: "prod_1", os_brand_id: "b1" }], { b1: "Aquaforest" }))
    expect(await call(false)).toEqual({ product_brand: { product_id: "prod_1", name: null } })
    expect(resolveService).not.toHaveBeenCalled()
  })
})
