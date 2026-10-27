import { verifyStripeWebhookSecret } from "../verify-stripe-webhook-secret"

/**
 * MI PIROSIT: ha kulcs mellett titok nelkul at lehetne menni; ha a kulcs nelkuli
 * bolt (utanvet, elore utalas) elutasitodna; ha az uzenet kiirna egy erteket.
 */
describe("verifyStripeWebhookSecret", () => {
  it("refuses a card key without a webhook secret, missing or blank", () => {
    for (const secret of [undefined, "", "   "]) {
      const r = verifyStripeWebhookSecret({ STRIPE_API_KEY: "kulcs", STRIPE_WEBHOOK_SECRET: secret })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.message).toContain("STRIPE_WEBHOOK_SECRET")
    }
  })

  it("accepts a key with a secret", () => {
    expect(verifyStripeWebhookSecret({ STRIPE_API_KEY: "kulcs", STRIPE_WEBHOOK_SECRET: "titok" })).toEqual({
      ok: true,
      stripe: true,
    })
  })

  it("accepts a shop without any Stripe key (cash on delivery and advance transfer), with or without a stray secret", () => {
    for (const env of [{}, { STRIPE_API_KEY: "  " }, { STRIPE_WEBHOOK_SECRET: "titok" }]) {
      expect(verifyStripeWebhookSecret(env)).toEqual({ ok: true, stripe: false })
    }
  })

  it("never prints the key in the message", () => {
    const key = "sk_test_NEM_VALODI_ZZ9"
    const r = verifyStripeWebhookSecret({ STRIPE_API_KEY: key })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).not.toContain(key)
  })
})
