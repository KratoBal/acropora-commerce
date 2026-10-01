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
