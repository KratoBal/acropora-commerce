import { finishPickupAfterOrderPlaced } from "../finish-pickup-after-order-placed"

/**
 * THE PICKUP ORDER IS FINISHED WHEN THE SHIPPED ORDER IS PLACED (acrobot
 * 25657). What must fail: a shipped order placed by the Stripe webhook leaving
 * the pickup cart open; the pickup order (or an ordinary order) running the
 * split; an order without a cart.
 */
describe("finishPickupAfterOrderPlaced", () => {
  const deps = (cart: { id: string; metadata: Record<string, unknown> | null } | null) => {
    const completeSplit = jest.fn(async () => ({ order_ids: ["order_ship", "order_pick"] }))
    return { cartOf: jest.fn(async () => cart), completeSplit }
  }

  it("a shipped order's cart with a pickup cart: the split's completion runs on it", async () => {
    const d = deps({ id: "cart_ship", metadata: { acropora_pickup_cart_id: "cart_pick" } })
    expect(await finishPickupAfterOrderPlaced("order_ship", d)).toEqual({
      finished: true,
      order_ids: ["order_ship", "order_pick"],
    })
    expect(d.completeSplit).toHaveBeenCalledWith("cart_ship")
  })

  it("the pickup order, an ordinary order, or no cart: nothing runs", async () => {
    for (const cart of [
      { id: "cart_pick", metadata: { acropora_parent_cart_id: "cart_ship" } },
      { id: "cart_1", metadata: null },
      null,
    ]) {
      const d = deps(cart)
      expect((await finishPickupAfterOrderPlaced("order_x", d)).finished).toBe(false)
      expect(d.completeSplit).not.toHaveBeenCalled()
    }
  })
})
