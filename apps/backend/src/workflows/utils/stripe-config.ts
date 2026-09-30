/**
 * STRIPE, A SECOND CARD PROVIDER NEXT TO SIMPLEPAY (Balázs, 2026-09-30 22:36
 * UTC, Stripe thread: "vegyuk fel a stripeot a fejlesztesbe ugy hogy a
 * simplepay is maradjon meg"). Test storefront only; SimplePay stays the
 * default (it is listed first in ACROPORA_PP_ONLINE_CARD).
 *
 * The provider is Medusa's own, `@medusajs/payment-stripe` 2.20.1 (a dependency
 * of `@medusajs/medusa`, resolved as `@medusajs/medusa/payment-stripe`), so its
 * id is `pp_stripe_stripe`. The options below are the package's `StripeOptions`
 * (dist/types/index.d.ts), measured in the installed version, not assumed.
 *
 * NO KEY, NO PROVIDER. The provider's `validateOptions` throws on a missing
 * `apiKey`, and a throwing provider stops the payment module, SimplePay and
 * cash on delivery with it. So without STRIPE_API_KEY it is not registered at
 * all, and nothing about the other payment methods changes.
 *
 * `capture: false` is the package's default made explicit: the card is
 * authorized at checkout and captured later from the admin. Measured in the
 * same package: its capture takes the WHOLE authorized amount (no
 * `amount_to_capture`), and Medusa passes no amount to it; refunds take the
 * amount. A partial capture is therefore Balázs's open question, not this
 * code's (agents/murena/megosztas/stripe-meres-2026-10-01.md).
 *
 * The webhook is Medusa's built-in `POST /hooks/payment/stripe_stripe`; without
 * STRIPE_WEBHOOK_SECRET the package only warns, and 3-D Secure or async
 * payments would not update the order.
 */
export const STRIPE_PROVIDER_ID = "pp_stripe_stripe" as const

export type StripeProviderEntry = {
  resolve: "@medusajs/medusa/payment-stripe"
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
      resolve: "@medusajs/medusa/payment-stripe",
      id: "stripe",
      options: {
        apiKey,
        ...(webhookSecret ? { webhookSecret } : {}),
        capture: false,
      },
    },
  ]
}
