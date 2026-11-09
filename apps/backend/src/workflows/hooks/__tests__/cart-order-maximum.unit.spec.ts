/**
 * THE ORDER MAXIMUM HOOKS (card 6994c9a3). What must fail: one of the two
 * ways into a cart line left without the check, or the hook passing the
 * wrong change (adding as setting, or the wrong line).
 */
const handlers = {
  add: undefined as undefined | ((...a: any[]) => any),
  update: undefined as undefined | ((...a: any[]) => any),
}

jest.mock("@medusajs/medusa/core-flows", () => ({
  addToCartWorkflow: { hooks: { validate: (fn: any) => (handlers.add = fn) } },
  updateLineItemInCartWorkflow: {
    hooks: { validate: (fn: any) => (handlers.update = fn) },
  },
}))

const calls: unknown[] = []
jest.mock("../../utils/order-maximum", () => ({
  assertOrderMaximum: async (...args: unknown[]) => {
    calls.push(args.slice(1))
    if ((args[2] as any[]).some((change) => change.quantity > 99)) throw new Error("over the maximum")
  },
}))
// V2.3 (card 52024fc0): the hold comes after the maximum, on the same variants
jest.mock("../../utils/cart-hold", () => ({
  holdOnAdd: async (...args: unknown[]) => {
    calls.push(["hold", ...args.slice(1)])
  },
}))

beforeAll(() => {
  require("../cart-order-maximum")
})

describe("the order maximum on the cart's two ways in", () => {
  beforeEach(() => {
    calls.length = 0
  })

  it("adding passes each variant as an addition", async () => {
    await handlers.add!(
      { input: { items: [{ variant_id: "v1", quantity: 3 }, { quantity: 1 }] }, cart: { id: "cart_1" } },
      { container: {} }
    )
    expect(calls).toEqual([
      ["cart_1", [{ kind: "add", variant_id: "v1", quantity: 3 }]],
      ["hold", "cart_1", ["v1"]],
    ])
  })

  it("a line over the maximum asks for no hold", async () => {
    await expect(
      handlers.add!({ input: { items: [{ variant_id: "v1", quantity: 100 }] }, cart: { id: "cart_1" } }, { container: {} })
    ).rejects.toThrow("over the maximum")
    expect(calls).toEqual([["cart_1", [{ kind: "add", variant_id: "v1", quantity: 100 }]]])
  })

  it("updating passes the line as a new quantity", async () => {
    await handlers.update!(
      { input: { item_id: "l1", update: { quantity: 7 } }, cart: { id: "cart_1" } },
      { container: {} }
    )
    expect(calls).toEqual([["cart_1", [{ kind: "set", line_id: "l1", quantity: 7 }]]])
  })
})
