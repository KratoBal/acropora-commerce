const completeSplitCart = jest.fn()
const splitCompletionOperations = jest.fn(() => ({ ops: true }))

jest.mock("../../../../../../workflows/utils/split-completion", () => ({
  completeSplitCart: (...args: unknown[]) => completeSplitCart(...args),
}))
jest.mock("../../../../../../workflows/utils/split-completion-operations", () => ({
  splitCompletionOperations: (...args: unknown[]) =>
    (splitCompletionOperations as any)(...args),
}))

const soldUniqueLinesOfCart = jest.fn()
jest.mock("../../../../../../workflows/utils/sold-lines-of-cart", () => ({
  soldUniqueLinesOfCart: (...args: unknown[]) => soldUniqueLinesOfCart(...args),
}))

const resolveCartShippingClass = jest.fn(async () => ({ split_line_ids: [] as string[] }))
jest.mock("../../../../../../workflows/utils/resolve-cart-shipping-class", () => ({
  resolveCartShippingClass: (...args: unknown[]) => (resolveCartShippingClass as any)(...args),
}))

import { MedusaError } from "@medusajs/framework/utils"

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
  soldUniqueLinesOfCart.mockReset()
  completeSplitCart.mockReset()
  splitCompletionOperations.mockClear()
})

describe("POST /store/carts/:id/complete-split", () => {
  /*
    A GIFT CARD ON A MIXED CART (card 495c0007; acrobot 56682): refused before anything is completed, also when the
    cart became mixed after the code was applied. WHAT TURNS RED: the split running anyway; a cart with no gift card,
    or one that is not mixed, refused.
  */
  describe("a gift card on a mixed cart", () => {
    const withCart = (credit_lines: unknown[]) => {
      process.env.ACROPORA_SO_PICKUP = "so_bolti"
      const graph = jest.fn(async () => ({
        data: [{ id: "cart_1", credit_lines, items: [{ id: "item_1", variant_id: "v1", requires_shipping: true }] }],
      }))
      return POST(
        { params: { id: "cart_1" }, scope: { resolve: () => ({ graph }) } } as never,
        { json: jest.fn() } as never
      ).then(
        () => null,
        (error: unknown) => error as MedusaError
      )
    }
    const giftCard = { id: "cl_1", amount: 5000, reference: "gift_card", reference_id: "gcard_1" }

    it("is refused before the split runs", async () => {
      resolveCartShippingClass.mockResolvedValueOnce({ split_line_ids: ["item_live"] })
      const error = await withCart([giftCard])
      expect(error).toBeInstanceOf(MedusaError)
      expect(error!.message).toMatch(/ajándékkártya .* egyelőre nem használható/)
      expect(completeSplitCart).not.toHaveBeenCalled()
    })

    it("a mixed cart without a gift card, and a gift card on a cart that is not mixed, go on", async () => {
      completeSplitCart.mockRejectedValue(new Error("reached the split"))
      resolveCartShippingClass.mockClear()
      // mixed, but no gift card: the class is not even asked
      resolveCartShippingClass.mockResolvedValue({ split_line_ids: ["item_live"] })
      expect((await withCart([{ ...giftCard, reference: "loyalty" }]))!.message).toBe("reached the split")
      expect(resolveCartShippingClass).not.toHaveBeenCalled()
      // a gift card, not mixed
      resolveCartShippingClass.mockResolvedValue({ split_line_ids: [] })
      expect((await withCart([giftCard]))!.message).toBe("reached the split")
    })
  })

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

  describe("a unique piece sold while it was in the cart (V2.5)", () => {
    const shortage = () =>
      new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Some variant does not have the required inventory",
        MedusaError.Codes.INSUFFICIENT_INVENTORY
      )
    const attempt = async () => {
      process.env.ACROPORA_SO_PICKUP = "so_bolti"
      return POST(
        // the gift card check reads the cart first: here a cart with no gift card
        { params: { id: "cart_1" }, scope: { resolve: () => ({ graph: jest.fn(async () => ({ data: [] })) }) } } as never,
        { json: jest.fn() } as never
      ).then(
        () => null,
        (error: unknown) => error as MedusaError
      )
    }

    it("names the sold unique pieces in the error's message, after the code", async () => {
      completeSplitCart.mockRejectedValue(shortage())
      soldUniqueLinesOfCart.mockResolvedValue([{ title: "WYSIWYG Acropora", handle: "wysiwyg-acropora" }])
      const error = await attempt()
      expect(error).toBeInstanceOf(MedusaError)
      expect(error!.message).toBe('unique_piece_sold:[{"title":"WYSIWYG Acropora","handle":"wysiwyg-acropora"}]')
      expect(soldUniqueLinesOfCart.mock.calls[0]![1]).toBe("cart_1")
    })

    it("a shortage on no unique piece goes on unchanged (the generic sentence stays)", async () => {
      const original = shortage()
      completeSplitCart.mockRejectedValue(original)
      soldUniqueLinesOfCart.mockResolvedValue([])
      expect(await attempt()).toBe(original)
    })

    it("any other failure goes on unchanged and the cart is not even asked", async () => {
      const other = new Error("boom")
      completeSplitCart.mockRejectedValue(other)
      expect(await attempt()).toBe(other)
      expect(soldUniqueLinesOfCart).not.toHaveBeenCalled()
    })
  })
})
