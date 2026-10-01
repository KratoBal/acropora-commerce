const startCardPayment = jest.fn(async () => ({ payment_url: null, total: 21950 }))
const sharedPaymentOperations = jest.fn(() => ({ ops: true }))

jest.mock("../../../../../../workflows/utils/split-completion", () => ({
  ...jest.requireActual("../../../../../../workflows/utils/split-completion"),
  startCardPayment: (...args: unknown[]) => (startCardPayment as any)(...args),
}))
jest.mock("../../../../../../workflows/utils/split-completion-operations", () => ({
  sharedPaymentOperations: (...args: unknown[]) => (sharedPaymentOperations as any)(...args),
}))

import { STRIPE_SHARE } from "../../../../../../workflows/utils/split-completion"
import { POST } from "../route"

/**
 * THE STRIPE START (Balázs 2026-10-01: one Stripe payment for both orders).
 * What must fail: a provider but Stripe, or Stripe when it is not listed; the
 * SimplePay share used; the lock open without ACROPORA_STRIPE_MIXED_CART=true.
 */
const call = async (env: Record<string, string>) => {
  startCardPayment.mockClear()
  const saved = { ...process.env }
  Object.assign(process.env, { ACROPORA_SO_PICKUP: "so_bolt", ...env })
  const res = { json: jest.fn() }
  try {
    await POST({ params: { id: "cart_1" }, body: {}, scope: {} } as never, res as never)
  } finally {
    process.env = saved
  }
  return { config: (startCardPayment.mock.calls[0] as unknown[])[2], res }
}

describe("POST /store/carts/:id/stripe-start", () => {
  it("starts with Stripe by name and its share; the lock is closed by default", async () => {
    const { config, res } = await call({
      ACROPORA_PP_ONLINE_CARD: "pp_simplepay_simplepay,pp_stripe_stripe",
    })
    expect(config).toEqual({ providerId: "pp_stripe_stripe", share: STRIPE_SHARE, allowSplit: false })
    expect((sharedPaymentOperations.mock.calls[0] as unknown[])[1]).toEqual({ storePickupOptionId: "so_bolt" })
    expect(res.json).toHaveBeenCalledWith({ payment_url: null, total: 21950 })
  })

  it("the lock opens only with ACROPORA_STRIPE_MIXED_CART=true", async () => {
    const env = { ACROPORA_PP_ONLINE_CARD: "pp_stripe_stripe" }
    expect((await call({ ...env, ACROPORA_STRIPE_MIXED_CART: "true" })).config).toMatchObject({ allowSplit: true })
    expect((await call({ ...env, ACROPORA_STRIPE_MIXED_CART: "1" })).config).toMatchObject({ allowSplit: false })
  })

  it("not listed for the card role: not configured", async () => {
    expect((await call({ ACROPORA_PP_ONLINE_CARD: "pp_simplepay_simplepay" })).config).toMatchObject({
      providerId: "",
    })
  })
})
