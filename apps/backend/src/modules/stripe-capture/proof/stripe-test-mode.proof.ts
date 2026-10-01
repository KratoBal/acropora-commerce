import AcroporaStripeService from "../service"
import { smallestUnit } from "../smallest-unit"

/**
 * THE PROOF IN STRIPE TEST MODE that Balázs asked for (acrobot 25495):
 * authorization for the whole amount, an item drops out, the capture takes
 * the smaller amount, Medusa's amount and Stripe's agree, the rest of the
 * authorization is released.
 *
 * NOT PART OF ANY TEST RUN: the name matches none of the jest patterns
 * (jest.config.js), and it talks to Stripe. Run it by hand, with a TEST key:
 *
 *   cd apps/backend && STRIPE_PROOF_KEY=sk_test_... \
 *     npx jest --testMatch '**' + '/*.proof.ts' src/modules/stripe-capture/proof
 *
 * "Medusa's amount" here is the capture record the payment module creates
 * before it calls the provider (see ../service.ts); the record is stubbed with
 * the booked amount, everything on Stripe's side is real.
 */
const key = process.env.STRIPE_PROOF_KEY ?? ""

const proof = key.startsWith("sk_test_") ? describe : describe.skip

proof("partial capture in Stripe test mode", () => {
  jest.setTimeout(60_000)

  const AUTHORIZED = 12_000 // Ft, the whole order
  const BOOKED = 9_000 // Ft, after an item of 3 000 Ft dropped out

  const service = new AcroporaStripeService(
    {
      captureService: {
        retrieve: async (id: string) => ({ id, amount: BOOKED }),
      },
    },
    { apiKey: key }
  )
  const stripe = (service as any).stripe_
  const authorizedUnits = smallestUnit(AUTHORIZED, "huf")
  const bookedUnits = smallestUnit(BOOKED, "huf")

  it("captures the booked amount, and releases the rest", async () => {
    // Stripe's own request shape (smallest unit), built apart from the call
    const stripeIntentRequest: Record<string, unknown> = {
      amount: authorizedUnits,
      capture_method: "manual",
      payment_method: "pm_card_visa",
      payment_method_types: ["card"],
      confirm: true,
      description: "Acropora proof: partial capture (test mode)",
    }
    stripeIntentRequest["currency"] = "huf"
    const authorized = await stripe.paymentIntents.create(stripeIntentRequest)
    expect(authorized.status).toBe("requires_capture")
    expect(authorized.amount_capturable).toBe(authorizedUnits)

    await service.capturePayment({
      data: { id: authorized.id },
      context: { idempotency_key: `capt_proof_${Date.now()}` },
    })

    const after = await stripe.paymentIntents.retrieve(authorized.id, {
      expand: ["latest_charge"],
    })
    const charge = after.latest_charge

    // Medusa's booked amount and Stripe's received amount agree
    expect(after.status).toBe("succeeded")
    expect(after.amount_received).toBe(bookedUnits)
    // nothing is held any more: the rest of the authorization is released
    expect(after.amount_capturable).toBe(0)
    expect(charge.amount).toBe(authorizedUnits)
    expect(charge.amount_captured).toBe(bookedUnits)
    // and it was a smaller capture, not a full one followed by a refund
    expect(charge.amount_refunded).toBe(0)

    // a second capture is refused, not booked while Stripe takes nothing
    await expect(
      service.capturePayment({
        data: { id: authorized.id },
        context: { idempotency_key: `capt_proof_second_${Date.now()}` },
      })
    ).rejects.toThrow("already captured once")

    // the evidence, for the report
    console.log(
      JSON.stringify({
        payment_intent: after.id,
        authorized: authorized.amount_capturable,
        received: after.amount_received,
        capturable_after: after.amount_capturable,
        charge_captured: charge.amount_captured,
        charge_refunded: charge.amount_refunded,
      })
    )
  })
})

if (!key.startsWith("sk_test_")) {
  console.warn("SKIPPED: the proof needs STRIPE_PROOF_KEY=sk_test_... (a TEST key, never a live one)")
}

/**
 * THE MIXED CART'S PROOF (Balázs 2026-10-01, variant 1; acrobot 25507): one
 * Stripe payment for both orders, captured at Kiszállítás for their amounts
 * at that time; an animal dropped after that is a refund.
 *
 * Everything on Stripe's side is real (test mode). Medusa's side is stubbed
 * the way the payment module runs the provider: the capture records it makes
 * before calling the provider (each with its payment id and booked amount),
 * and the parts the orchestration puts on the shipped payment's data.
 *
 * The run:
 *   shipped order 4 950 Ft + pickup order 17 000 Ft = one hold of 21 950 Ft;
 *   a 950 Ft item drops from the shipped order before shipping (4 000 Ft);
 *   Kiszállítás: ONE capture of 21 000 Ft, booked 4 000 + 17 000;
 *   an 8 500 Ft animal drops after shipping: a refund of 8 500 Ft.
 */
proof("the mixed cart's one payment in Stripe test mode", () => {
  jest.setTimeout(90_000)

  const SHIPPED = 4_950
  const PICKUP = 17_000
  const SHIPPED_AFTER_DROP = 4_000
  const ANIMAL_REFUND = 8_500

  const records = new Map<string, { id: string; amount: number; payment_id: string }>()
  const service = new AcroporaStripeService(
    { captureService: { retrieve: async (id: string) => records.get(id) } },
    { apiKey: key }
  )
  const stripe = (service as any).stripe_

  it("one hold, one capture for both parts, a refund for the animal", async () => {
    // the shipped session starts the joint intent, card only (as STRIPE_SHARE)
    const shipped = await service.initiatePayment({
      amount: SHIPPED,
      currency_code: "huf",
      data: { stripe_joint: { total: SHIPPED + PICKUP }, payment_method_types: ["card"] },
    })
    const share = shipped.data.stripe_share
    expect(share.total).toBe(SHIPPED + PICKUP)

    // the pickup session joins it: no second intent
    const pickup = await service.initiatePayment({
      amount: PICKUP,
      currency_code: "huf",
      data: { stripe_joined: share },
    })
    expect(pickup.id).toBe(share.transactionId)

    // the customer confirms the card (test card), the hold is the whole sum
    const held = await stripe.paymentIntents.confirm(share.transactionId, {
      payment_method: "pm_card_visa",
    })
    expect(held.status).toBe("requires_capture")
    expect(held.amount_capturable).toBe(smallestUnit(SHIPPED + PICKUP, "huf"))

    // Kiszállítás: the parts on the shipped payment, then its capture
    const parts = {
      total: smallestUnit(SHIPPED_AFTER_DROP + PICKUP, "huf"),
      parts: {
        pay_ship: smallestUnit(SHIPPED_AFTER_DROP, "huf"),
        pay_pick: smallestUnit(PICKUP, "huf"),
      },
    }
    const stamp = Date.now()
    records.set(`capt_ship_${stamp}`, { id: `capt_ship_${stamp}`, amount: SHIPPED_AFTER_DROP, payment_id: "pay_ship" })
    records.set(`capt_pick_${stamp}`, { id: `capt_pick_${stamp}`, amount: PICKUP, payment_id: "pay_pick" })

    await service.capturePayment({
      data: { ...shipped.data, stripe_capture_parts: parts },
      context: { idempotency_key: `capt_ship_${stamp}` },
    })
    await service.capturePayment({
      data: pickup.data,
      context: { idempotency_key: `capt_pick_${stamp}` },
    })

    const after = await stripe.paymentIntents.retrieve(share.transactionId, {
      expand: ["latest_charge"],
    })
    // Stripe took exactly the two booked parts, in one capture, and holds nothing
    expect(after.status).toBe("succeeded")
    expect(after.amount_received).toBe(parts.total)
    expect(after.amount_capturable).toBe(0)
    expect(after.metadata["a:pay_ship"]).toBe(String(parts.parts.pay_ship))
    expect(after.metadata["a:pay_pick"]).toBe(String(parts.parts.pay_pick))
    expect(after.latest_charge.amount_captured).toBe(parts.total)

    // a second capture of the pickup for another amount is refused
    records.set(`capt_again_${stamp}`, { id: `capt_again_${stamp}`, amount: PICKUP - 1, payment_id: "pay_pick" })
    await expect(
      service.capturePayment({
        data: pickup.data,
        context: { idempotency_key: `capt_again_${stamp}` },
      })
    ).rejects.toThrow("captured for both together at shipment")

    // an animal dropped after Kiszállítás: a refund on the shared intent
    await service.refundPayment({
      amount: ANIMAL_REFUND,
      data: { ...pickup.data, currency: "huf" },
      context: { idempotency_key: `ref_${stamp}` },
    })
    const refunded = await stripe.paymentIntents.retrieve(share.transactionId, {
      expand: ["latest_charge"],
    })
    expect(refunded.latest_charge.amount_refunded).toBe(smallestUnit(ANIMAL_REFUND, "huf"))

    console.log(
      JSON.stringify({
        payment_intent: share.transactionId,
        held: held.amount_capturable,
        captured: after.amount_received,
        booked: parts.parts,
        refunded: refunded.latest_charge.amount_refunded,
      })
    )
  })
})
