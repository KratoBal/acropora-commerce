/**
 * ONE STRIPE PAYMENT FOR BOTH ORDERS OF A MIXED CART (Balázs, 2026-10-01 06:00
 * UTC: variant 1, acrobot 25507). The SimplePay pattern (P4-3c), with the same
 * facts shape so the same checks read both:
 *
 * - `stripe_joint` on the shipped cart's session: ONE PaymentIntent for the two
 *   carts together (`total`), this session's own part is `own`;
 * - `stripe_joined` on the pickup cart's session: no new intent, it carries the
 *   shipped session's intent and its own part.
 *
 * Both keys are set by our server code only (`refuseClientSimplePayKeys`).
 * Stripe captures an intent once; the shared payment is therefore captured
 * TOGETHER at shipment (a later part); until then a capture of a shared
 * payment is refused here, so nothing can be captured half.
 */
export const STRIPE_SHARE_KEY = "stripe_share"
export const STRIPE_JOINT_KEY = "stripe_joint"
export const STRIPE_JOINED_KEY = "stripe_joined"

export type StripeShareFacts = {
  /** The shared PaymentIntent (named like SimplePay's, so one check reads both). */
  transactionId: string
  /** The intent's amount, in major units: the two carts together. */
  total: number
  /** This session's own part, in major units. */
  own: number
  /** Set on the pickup session that carries the shipped session's intent. */
  joined?: boolean
}

export const stripeShareFactsOf = (data: unknown): StripeShareFacts | null => {
  const facts = (data as Record<string, unknown> | null | undefined)?.[STRIPE_SHARE_KEY] as
    | StripeShareFacts
    | undefined
  return facts?.transactionId ? facts : null
}
