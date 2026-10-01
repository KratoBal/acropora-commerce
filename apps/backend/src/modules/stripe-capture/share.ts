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
  /**
   * The intent's client secret, on the SHIPPED session only: the storefront
   * confirms the card with it at placement (the deferred card field).
   */
  clientSecret?: string
}

export const stripeShareFactsOf = (data: unknown): StripeShareFacts | null => {
  const facts = (data as Record<string, unknown> | null | undefined)?.[STRIPE_SHARE_KEY] as
    | StripeShareFacts
    | undefined
  return facts?.transactionId ? facts : null
}

/**
 * THE SHARED PAYMENT'S CAPTURE FOR BOTH ORDERS (part 2, at "Kiszállítás"). The
 * orchestration puts the two orders' parts on the shipped payment's data
 * before capturing it; the provider takes the whole sum from Stripe in ONE
 * capture and writes each part into the intent's metadata. The pickup
 * payment's capture then finds its part there and books it without a second
 * Stripe call. Amounts are in Stripe's smallest unit, keyed by Medusa payment id.
 */
export const STRIPE_CAPTURE_PARTS_KEY = "stripe_capture_parts"

export type StripeCaptureParts = {
  /** The sum of the parts: what Stripe captures. */
  total: number
  parts: Record<string, number>
}

/** The intent's metadata key for one payment's captured part (Stripe keys: 40 chars at most). */
export const capturedPartKey = (paymentId: string): string => `a:${paymentId}`
