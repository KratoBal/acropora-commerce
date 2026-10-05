/**
 * STRIPE, THE ONLY CARD PROVIDER (Balázs, 2026-10-05 09:33 UTC: only Stripe
 * stays, SimplePay goes; card, Apple Pay and Google Pay, no Link). It came in
 * next to SimplePay on 2026-09-30 and replaced it after the trial.
 *
 * The provider is Medusa's own, `@medusajs/payment-stripe` 2.20.1 (a dependency
 * of `@medusajs/medusa`, resolved as `@medusajs/medusa/payment-stripe`), behind
 * our thin subclass in `src/modules/stripe-capture` that captures the amount
 * Medusa books (Balázs, 2026-10-01 04:44 UTC); its id is `pp_stripe_stripe`. The options below are the package's `StripeOptions`
 * (dist/types/index.d.ts), measured in the installed version, not assumed.
 *
 * NO KEY, NO PROVIDER. The provider's `validateOptions` throws on a missing
 * `apiKey`, and a throwing provider stops the payment module, and cash on
 * delivery with it. So without STRIPE_API_KEY it is not registered at
 * all, and nothing about the other payment methods changes.
 *
 * `capture: false` is the package's default made explicit: the card is
 * authorized at checkout and captured later from the admin, for the amount
 * Medusa books (the subclass; the stock capture would take the whole
 * authorization).
 *
 * The webhook is Medusa's built-in `POST /hooks/payment/stripe_stripe`; without
 * STRIPE_WEBHOOK_SECRET the package only warns, and 3-D Secure or async
 * payments would not update the order.
 */
export const STRIPE_PROVIDER_ID = "pp_stripe_stripe" as const

export type StripeProviderEntry = {
  resolve: "./src/modules/stripe-capture"
  id: "stripe"
  options: { apiKey: string; webhookSecret?: string; capture: false }
}

export const stripeProviders = (
  env: NodeJS.ProcessEnv = process.env
): StripeProviderEntry[] => {
  const apiKey = env.STRIPE_API_KEY?.trim()

  if (!apiKey) {
    return []
  }

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim()

  return [
    {
      resolve: "./src/modules/stripe-capture",
      id: "stripe",
      options: {
        apiKey,
        ...(webhookSecret ? { webhookSecret } : {}),
        capture: false,
      },
    },
  ]
}
