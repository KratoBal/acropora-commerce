const completeSplitCart = jest.fn()
const splitCompletionOperations = jest.fn(() => ({ ops: true }))

jest.mock("../../../../../../workflows/utils/split-completion", () => ({
  completeSplitCart: (...args: unknown[]) => completeSplitCart(...args),
}))
jest.mock("../../../../../../workflows/utils/split-completion-operations", () => ({
  splitCompletionOperations: (...args: unknown[]) =>
    (splitCompletionOperations as any)(...args),
}))

import { POST } from "../route"

/**
 * THE SPLIT COMPLETION ROUTE. What must fail: the store pickup option or the
 * pay-in-shop provider not reaching the orchestrator; the answer losing the
 * order of the orders (shipped first) or their numbers; a pending pickup cart
 * not reported.
 */
const call = async (env: Record<string, string>) => {
  const saved = { ...process.env }
  Object.assign(process.env, env)
  const graph = jest.fn(async () => ({
    data: [
      { id: "order_2", display_id: 13 },
      { id: "order_1", display_id: 12 },
    ],
  }))
  const res = { json: jest.fn() }
  try {
    await POST(
      {
        params: { id: "cart_1" },
        scope: { resolve: () => ({ graph }) },
      } as never,
      res as never
    )
  } finally {
    process.env = saved
  }
  return res.json.mock.calls[0][0]
}

beforeEach(() => {
  completeSplitCart.mockReset()
  splitCompletionOperations.mockClear()
})

describe("POST /store/carts/:id/complete-split", () => {
  it("passes the store pickup option and the pay-in-shop provider, and lists both orders in order", async () => {
    completeSplitCart.mockResolvedValue({
      order_ids: ["order_1", "order_2"],
      pending_pickup_cart_id: null,
    })

    const body = await call({
      ACROPORA_PP_PAY_AT_STORE: " pp_system_default ",
      ACROPORA_PP_ONLINE_CARD: "pp_masik_kartya,pp_stripe_stripe",
      ACROPORA_SO_PICKUP: "so_bolti",
    })

    expect(splitCompletionOperations.mock.calls[0][1]).toEqual({
      storePickupOptionId: "so_bolti",
    })
    expect(completeSplitCart.mock.calls[0][0]).toBe("cart_1")
    expect(completeSplitCart.mock.calls[0][2]).toEqual({
      payAtStoreProviderId: "pp_system_default",
      onlineCardProviderIds: ["pp_masik_kartya", "pp_stripe_stripe"],
    })
    expect(body).toEqual({
      orders: [
        { id: "order_1", display_id: 12 },
        { id: "order_2", display_id: 13 },
      ],
      pending_pickup_cart_id: null,
    })
  })

  it("reports a pickup cart still to finish", async () => {
    completeSplitCart.mockResolvedValue({
      order_ids: ["order_1"],
      pending_pickup_cart_id: "cart_pickup_1",
    })
    const body = await call({ ACROPORA_PP_PAY_AT_STORE: "pp_system_default" })
    expect(body.pending_pickup_cart_id).toBe("cart_pickup_1")
    expect(body.orders).toEqual([{ id: "order_1", display_id: 12 }])
  })

  it("passes an empty provider when payment in the shop is not configured", async () => {
    completeSplitCart.mockResolvedValue({ order_ids: [], pending_pickup_cart_id: null })
    delete process.env.ACROPORA_PP_PAY_AT_STORE
    delete process.env.ACROPORA_PP_ONLINE_CARD
    await call({})
    expect(completeSplitCart.mock.calls[0][2]).toEqual({
      payAtStoreProviderId: "",
      onlineCardProviderIds: [],
    })
  })
})
