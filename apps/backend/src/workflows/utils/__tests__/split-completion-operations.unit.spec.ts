const createCart = jest.fn()
const updateCart = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  // the real module stays (other workflow files built at load time use its steps); only these two are doubles
  ...jest.requireActual("@medusajs/medusa/core-flows"),
  createCartWorkflow: () => ({ run: async (args: unknown) => (createCart(args), { result: { id: "cart_pickup" } }) }),
  updateCartWorkflow: () => ({ run: async (args: unknown) => updateCart(args) }),
}))

import { splitCompletionOperations } from "../split-completion-operations"

const containerWith = (rawCart: Record<string, unknown>) =>
  ({
    resolve: (key: string) =>
      key === "query"
        ? { graph: async () => ({ data: [rawCart] }) }
        : { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  }) as never

afterEach(() => {
  createCart.mockReset()
  updateCart.mockReset()
})

/*
  THE WIRING, NOT ONLY THE FUNCTION (card d5c6befd; acrobot 41499, barracuda #645): the unit spec of
  `pickupCartMetadata` shows what it returns, and the split-completion spec uses a double that builds
  the pickup cart's metadata itself, so nothing showed that the real operation PASSES the parent's
  metadata through that function. A mixed cart's pickup order is created from that cart, and Medusa
  copies a cart's metadata onto its order, so a language lost here is a Hungarian mail for the
  live-animal half of an English customer's order.
*/
describe("createPickupCart", () => {
  const parent = {
    id: "cart_parent",
    currency_code: "huf",
    metadata: { aszf_elfogadas: { verzio: "1" }, storefront_locale: "en", egyeb: 1 },
  }

  it("creates the pickup cart with the parent's language and ASZF record, and no other key of the parent", async () => {
    const ops = splitCompletionOperations(containerWith(parent), { storePickupOptionId: "so_pickup" })
    expect(await ops.createPickupCart({ id: "cart_parent" } as never)).toBe("cart_pickup")
    expect(createCart).toHaveBeenCalledTimes(1)
    expect(createCart.mock.calls[0][0].input.metadata).toEqual({
      acropora_parent_cart_id: "cart_parent",
      aszf_elfogadas: { verzio: "1" },
      storefront_locale: "en",
    })
  })

  it("the parent cart keeps its own language when the pickup cart's id is written on it", async () => {
    const ops = splitCompletionOperations(containerWith(parent), { storePickupOptionId: "so_pickup" })
    await ops.createPickupCart({ id: "cart_parent" } as never)
    expect(updateCart).toHaveBeenCalledWith({
      input: {
        id: "cart_parent",
        metadata: { ...parent.metadata, acropora_pickup_cart_id: "cart_pickup" },
      },
    })
  })

  it("a parent without a language gives the pickup cart none", async () => {
    const ops = splitCompletionOperations(
      containerWith({ ...parent, metadata: { aszf_elfogadas: { verzio: "1" } } }),
      { storePickupOptionId: "so_pickup" }
    )
    await ops.createPickupCart({ id: "cart_parent" } as never)
    expect(createCart.mock.calls[0][0].input.metadata).not.toHaveProperty("storefront_locale")
  })
})

/*
  THE TWO ORDERS' CROSS-REFERENCES KEEP WHAT EACH ORDER ALREADY CARRIES (acrobot 41499): `linkOrders`
  writes the parent's id on the pickup order and the pickup order's id on the parent, each on top of
  its OWN stored metadata, so the language both orders got from their carts is still there after.
*/
describe("linkOrders", () => {
  it("writes the cross-references on top of each order's own metadata, language included", async () => {
    const updateOrders = jest.fn()
    const orders = [
      { id: "order_parent", metadata: { storefront_locale: "en", aszf_elfogadas: { verzio: "1" } } },
      { id: "order_pickup", metadata: { storefront_locale: "en" } },
    ]
    const container = {
      resolve: (key: string) =>
        key === "query"
          ? { graph: async () => ({ data: orders }) }
          : key === "order"
            ? { updateOrders }
            : { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
    } as never
    const ops = splitCompletionOperations(container, { storePickupOptionId: "so_pickup" })
    await ops.linkOrders("order_parent", "order_pickup")
    expect(updateOrders).toHaveBeenCalledWith([
      {
        id: "order_parent",
        metadata: { storefront_locale: "en", aszf_elfogadas: { verzio: "1" }, acropora_pickup_order_id: "order_pickup" },
      },
      { id: "order_pickup", metadata: { storefront_locale: "en", acropora_parent_order_id: "order_parent" } },
    ])
  })
})
