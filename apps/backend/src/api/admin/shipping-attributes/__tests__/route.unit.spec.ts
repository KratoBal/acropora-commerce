import { GET } from "../route"

/*
  WHAT TURNS THIS RED. The list route asking the module for the default page (a few rows) instead of every row: the OS reads
  this list to find products that still carry a live animal kind in the shop, and a cut-off list reads as "nothing left".
  Or the product filter dropped (every row for a one-product question).
*/
const call = async (validatedQuery: Record<string, unknown>) => {
  const list = jest.fn().mockResolvedValue([{ id: "sa_1", product_id: "prod_1" }])
  const json = jest.fn()
  await GET(
    {
      validatedQuery,
      scope: { resolve: () => ({ listShippingAttributes: list }) },
    } as never,
    { json } as never
  )
  return { list, json }
}

describe("GET /admin/shipping-attributes", () => {
  it("asks for EVERY row (take null), not the module's default page", async () => {
    const { list, json } = await call({})
    expect(list).toHaveBeenCalledWith({}, { take: null })
    expect(json).toHaveBeenCalledWith({ shipping_attributes: [{ id: "sa_1", product_id: "prod_1" }] })
  })

  it("keeps the product filter", async () => {
    const { list } = await call({ product_id: "prod_1" })
    expect(list).toHaveBeenCalledWith({ product_id: "prod_1" }, { take: null })
  })
})
