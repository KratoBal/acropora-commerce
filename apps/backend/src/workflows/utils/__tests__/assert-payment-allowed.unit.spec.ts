import { MedusaError } from "@medusajs/framework/utils"

import {
  PAYMENT_NOT_ALLOWED_MESSAGE,
  PROCESSABLE_SESSION_STATUSES,
  assertPaymentAllowedForCart,
  paymentRefusalOf,
} from "../assert-payment-allowed"
import type { AllowedPaymentProvider } from "../payment-providers"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "../split-completion"

const loadDecision = jest.fn()
jest.mock("../load-cart-shipping-decision", () => ({
  loadCartShippingDecision: (...args: unknown[]) => loadDecision(...args),
}))

/*
  WHAT TURNS THIS RED (task commerce-fizetesi-mod-lezaras-20261125, card d31a66a3 slice 0; measured on the test shop 2026-11-25: a cart paid with a
  provider the offer did not name was placed by BOTH ways, HTTP 200): a session of a provider the cart is not offered placing the order; a
  provider the role map does not know placing it; any processable session among several slipping through (Medusa processes the first, and
  refuses on any); a session in a status Medusa does not process refusing; the pickup half of a split cart (paid by the pair's shared card)
  refused against its own store-pickup roles; a mixed cart offered the card the offer withholds; a cart with no session (zero total) refused;
  the customer's sentence naming a provider id.
*/
const CARD: AllowedPaymentProvider = { id: "pp_stripe_stripe", role: "ONLINE_CARD" }
const COD: AllowedPaymentProvider = { id: "pp_acropora_cod", role: "COD" }
const OFFER = [CARD, COD]
const session = (provider_id: string, status = "pending") => ({ provider_id, status })

describe("paymentRefusalOf", () => {
  it("a session of an offered provider is placed", () => {
    expect(paymentRefusalOf({ sessions: [session("pp_stripe_stripe")], offered: OFFER, pickupHalf: false })).toBeNull()
    expect(paymentRefusalOf({ sessions: [session("pp_acropora_cod", "authorized")], offered: OFFER, pickupHalf: false })).toBeNull()
  })

  it("a provider the offer does not name is refused, the bank transfer and the shop payment as measured", () => {
    for (const id of ["pp_acropora_transfer", "pp_system_default"])
      expect(paymentRefusalOf({ sessions: [session(id)], offered: OFFER, pickupHalf: false })).toEqual({ providerIds: [id] })
  })

  it("a provider the role map does not know is refused too, and so is a session without a provider", () => {
    expect(paymentRefusalOf({ sessions: [session("pp_ismeretlen")], offered: OFFER, pickupHalf: false })).toEqual({ providerIds: ["pp_ismeretlen"] })
    expect(paymentRefusalOf({ sessions: [{ status: "pending" }], offered: OFFER, pickupHalf: false })).toEqual({ providerIds: [""] })
  })

  it("ANY processable session counts, not only the first: a stale one of a refused provider next to an offered one refuses", () => {
    expect(
      paymentRefusalOf({ sessions: [session("pp_stripe_stripe"), session("pp_acropora_transfer")], offered: OFFER, pickupHalf: false })
    ).toEqual({ providerIds: ["pp_acropora_transfer"] })
  })

  it("only the statuses Medusa processes count: a canceled or errored session of a refused provider does not refuse", () => {
    for (const status of PROCESSABLE_SESSION_STATUSES)
      expect([status, paymentRefusalOf({ sessions: [session("pp_acropora_transfer", status)], offered: OFFER, pickupHalf: false })]).toEqual([
        status,
        { providerIds: ["pp_acropora_transfer"] },
      ])
    for (const status of ["canceled", "error"])
      expect(paymentRefusalOf({ sessions: [session("pp_acropora_transfer", status)], offered: OFFER, pickupHalf: false })).toBeNull()
  })

  it("no session (a zero total, a gift card or points covering it) is placed, and so are missing entries", () => {
    expect(paymentRefusalOf({ sessions: [], offered: OFFER, pickupHalf: false })).toBeNull()
    expect(paymentRefusalOf({ sessions: [null, undefined], offered: OFFER, pickupHalf: false })).toBeNull()
  })

  it("the pickup half of a split cart is left to its parent's check", () => {
    expect(paymentRefusalOf({ sessions: [session("pp_stripe_stripe")], offered: [], pickupHalf: true })).toBeNull()
  })
})

const context = (providers: AllowedPaymentProvider[] = OFFER) =>
  ({ allowed_payment_providers: providers, allowed_payment_roles: providers.map((p) => p.role), shipping_roles: ["COURIER"] }) as never

const run = async (cart: Record<string, unknown>, providers = OFFER, decision: unknown = { split_line_ids: [] }) => {
  loadDecision.mockReset().mockResolvedValue(decision)
  const warnings: string[] = []
  const container = { resolve: () => ({ warn: (message: string) => warnings.push(message) }) }
  const outcome = await assertPaymentAllowedForCart(cart as never, context(providers), container).then(
    () => null,
    (error: unknown) => error
  )
  return { outcome, warnings }
}

describe("assertPaymentAllowedForCart", () => {
  it("refuses a provider the offer does not name, with a sentence for the customer that names no provider, and logs which one", async () => {
    const { outcome, warnings } = await run({
      id: "cart_1",
      metadata: null,
      payment_collection: { payment_sessions: [session("pp_acropora_transfer")] },
    })
    expect(outcome).toBeInstanceOf(MedusaError)
    expect((outcome as MedusaError).type).toBe(MedusaError.Types.NOT_ALLOWED)
    expect((outcome as MedusaError).message).toBe(PAYMENT_NOT_ALLOWED_MESSAGE)
    expect((outcome as MedusaError).message).not.toMatch(/pp_/)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("cart_1")
    expect(warnings[0]).toContain("pp_acropora_transfer")
  })

  it("places an offered provider", async () => {
    const { outcome } = await run({ id: "cart_1", metadata: null, payment_collection: { payment_sessions: [session("pp_stripe_stripe")] } })
    expect(outcome).toBeNull()
  })

  it("the pickup half (it carries its parent's id) is not checked", async () => {
    const { outcome } = await run({
      id: "cart_pickup",
      metadata: { [PARENT_CART_METADATA_KEY]: "cart_1" },
      payment_collection: { payment_sessions: [session("pp_stripe_stripe")] },
    }, [])
    expect(outcome).toBeNull()
    expect(loadDecision).not.toHaveBeenCalled()
  })

  it("a MIXED cart (lines that will split, or already split) is offered the card only as the offer says: no card, the card session is refused", async () => {
    const cart = { id: "cart_1", metadata: null, payment_collection: { payment_sessions: [session("pp_stripe_stripe")] } }
    const split = await run(cart, OFFER, { split_line_ids: ["line_1"] })
    expect((split.outcome as MedusaError | null)?.message).toBe(PAYMENT_NOT_ALLOWED_MESSAGE)
    const already = await run({ ...cart, metadata: { [PICKUP_CART_METADATA_KEY]: "cart_2" } }, OFFER)
    expect((already.outcome as MedusaError | null)?.message).toBe(PAYMENT_NOT_ALLOWED_MESSAGE)
    // the shop payment / cash on delivery of a mixed cart stay as the offer leaves them
    const cod = await run({ ...cart, payment_collection: { payment_sessions: [session("pp_acropora_cod")] } }, OFFER, { split_line_ids: ["line_1"] })
    expect(cod.outcome).toBeNull()
  })

  it("a cart with no payment collection or no sessions is placed", async () => {
    expect((await run({ id: "cart_1", metadata: null, payment_collection: null })).outcome).toBeNull()
    expect((await run({ id: "cart_1", metadata: null })).outcome).toBeNull()
  })
})
