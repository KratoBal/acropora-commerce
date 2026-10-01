import {
  type SimplePaySessionFacts,
  simplePayFactsOf,
} from "../../modules/simplepay/service"
import { stripeShareFactsOf } from "../../modules/stripe-capture/share"

/**
 * THE SHARED CARD PAYMENT'S FACTS, WHICHEVER PROVIDER CARRIES IT. SimplePay
 * and Stripe keep them in the same shape (transaction, total, own part,
 * joined), so the split's checks (`simplePayShareProblem`, `shared_payment`)
 * read both without knowing the provider.
 */
export const cardShareFactsOf = (data: unknown): SimplePaySessionFacts | null =>
  simplePayFactsOf(data) ??
  (stripeShareFactsOf(data) as unknown as SimplePaySessionFacts | null)
