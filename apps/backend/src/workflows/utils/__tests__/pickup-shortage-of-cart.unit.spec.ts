const runWorkflow = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  listShippingOptionsForCartWorkflow: () => ({ run: runWorkflow }),
}))
const variantHasStock = jest.fn()
jest.mock("../variant-stock", () => ({ variantHasStock: (...args: unknown[]) => variantHasStock(...args) }))

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { pickupShortLinesOfCart } from "../pickup-shortage-of-cart"

const scope = {
  resolve: (key: string) => {
    if (key === ContainerRegistrationKeys.QUERY)
      return {
        graph: async () => ({
          data: [
            {
              items: [
                { quantity: 1, title: "Alfa", product_handle: "alfa", variant_id: "variant_a" },
                { quantity: 2, title: "Beta", product_handle: "beta", variant_id: "variant_b" },
              ],
            },
          ],
        }),
      }
    if (key === Modules.INVENTORY) return {}
    throw new Error(`unexpected resolve ${key}`)
  },
} as never

const listing = (type: string, locationId: string) => ({
  result: [{ service_zone: { fulfillment_set: { type, location: { id: locationId } } } }],
})

beforeEach(() => {
  runWorkflow.mockReset()
  variantHasStock.mockReset()
})

/** What must fail: a foreign or delivery location answered with stock facts, the stock check run for it, the listing not asked. */
describe("pickupShortLinesOfCart: the location must be the cart's own pickup location", () => {
  it("POC-FOREIGN: a foreign location answers an empty list and the stock is never asked", async () => {
    runWorkflow.mockResolvedValue(listing("pickup", "sloc_shop"))
    variantHasStock.mockResolvedValue(false)
    expect(await pickupShortLinesOfCart(scope, "cart_1", "sloc_foreign")).toEqual([])
    expect(variantHasStock).not.toHaveBeenCalled()
  })

  it("POC-DELIVERY: the location of a delivery option answers an empty list too", async () => {
    runWorkflow.mockResolvedValue(listing("shipping", "sloc_delivery"))
    expect(await pickupShortLinesOfCart(scope, "cart_1", "sloc_delivery")).toEqual([])
    expect(variantHasStock).not.toHaveBeenCalled()
  })

  it("POC-OWN: the cart's own pickup location names the short lines, asking the cart's listing of THAT cart", async () => {
    runWorkflow.mockResolvedValue(listing("pickup", "sloc_shop"))
    variantHasStock.mockImplementation(async (_q, _i, variantId: string) => variantId !== "variant_b")
    expect(await pickupShortLinesOfCart(scope, "cart_1", "sloc_shop")).toEqual([{ title: "Beta", handle: "beta" }])
    expect(runWorkflow).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({ cart_id: "cart_1" }) }))
    expect(variantHasStock).toHaveBeenCalledWith(expect.anything(), expect.anything(), "variant_b", 2, ["sloc_shop"])
  })

  it("POC-FAILURE: a failing listing is not swallowed (the route answers 503)", async () => {
    runWorkflow.mockRejectedValue(new Error("boom"))
    await expect(pickupShortLinesOfCart(scope, "cart_1", "sloc_shop")).rejects.toThrow("boom")
  })
})
