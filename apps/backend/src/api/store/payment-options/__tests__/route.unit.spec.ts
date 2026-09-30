const resolveCartPaymentContext = jest.fn()
const loadCartShippingDecision = jest.fn()

jest.mock("../../../../workflows/utils/resolve-cart-payment-context", () => ({
  resolveCartPaymentContext: (...args: unknown[]) => resolveCartPaymentContext(...args),
}))
jest.mock("../../../../workflows/utils/load-cart-shipping-decision", () => ({
  loadCartShippingDecision: (...args: unknown[]) => loadCartShippingDecision(...args),
}))

import { GET } from "../route"

/**
 * THE OFFER FOR A CART THAT WILL BE SPLIT (Stripe next to SimplePay). What must
 * fail: Stripe offered to a cart with pickup-only lines, or to one already split
 * (its shipped half names the pickup cart); SimplePay or the other roles lost.
 */
const KINALAT = [
  { id: "pp_simplepay_simplepay", role: "ONLINE_CARD" },
  { id: "pp_stripe_stripe", role: "ONLINE_CARD" },
  { id: "pp_system_default", role: "PAY_AT_STORE" },
]

const call = async (
  splitLineIds: string[],
  metadata: Record<string, unknown> | null = null
) => {
  resolveCartPaymentContext.mockResolvedValue({
    allowed_payment_roles: ["ONLINE_CARD", "PAY_AT_STORE"],
    allowed_payment_providers: KINALAT,
    selected_payment_role: null,
    cash_on_delivery_fee: 0,
  })
  loadCartShippingDecision.mockResolvedValue({ split_line_ids: splitLineIds })
  const graph = jest.fn(async () => ({ data: [{ id: "cart_1", metadata }] }))
  const res = { json: jest.fn() }
  await GET(
    {
      validatedQuery: { cart_id: "cart_1" },
      scope: { resolve: () => ({ graph }) },
    } as never,
    res as never
  )
  return res.json.mock.calls[0][0].payment_options.allowed_payment_providers
}

describe("GET /store/payment-options", () => {
  it("a cart that is not split is offered every provider", async () => {
    expect(await call([])).toEqual(KINALAT)
  })

  it("a cart with pickup-only lines is not offered Stripe", async () => {
    expect(await call(["l2"])).toEqual([KINALAT[0], KINALAT[2]])
  })

  it("an already split shipped cart is not offered Stripe either", async () => {
    expect(await call([], { acropora_pickup_cart_id: "cart_2" })).toEqual([
      KINALAT[0],
      KINALAT[2],
    ])
  })
})
