import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  SimplePaySessionFacts,
  isSharedSimplePay,
  simplePayFactsOf,
} from "../../modules/simplepay/service"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "./split-completion"

/** A cart as the check sees it: its total and its SimplePay facts, if any. */
export type ShareView = {
  id: string
  total: number
  metadata: Record<string, unknown> | null
  facts: SimplePaySessionFacts | null
}

/**
 * WHAT A CARD PAYMENT MUST COVER BEFORE A CART BECOMES AN ORDER (P4-3c).
 *
 * - One cart, one transaction: its own amount is the cart's total.
 * - The shipped cart of a split paid together: its own amount is its total,
 *   and the transaction's total is its total plus the pickup cart's, whose
 *   session carries the same transaction.
 * - The pickup cart: its own amount is its total, and the transaction is the
 *   shipped cart's.
 *
 * The provider already refuses a FINISHED transaction for another total than
 * it started; this closes the rest: a total that no longer matches the carts,
 * or a session carrying a transaction that is not its split's.
 *
 * Returns the reason to refuse, or null.
 */
export const simplePayShareProblem = (cart: ShareView, other: ShareView | null): string | null => {
  const facts = cart.facts

  if (!facts) {
    return null
  }

  const own = Number(facts.own ?? facts.total)

  if (own !== Number(cart.total)) {
    return `The card payment is for ${own}, the cart's total is ${cart.total}`
  }

  if (facts.joined) {
    const shipped = other?.facts
    return shipped &&
      !shipped.joined &&
      String(shipped.transactionId) === String(facts.transactionId) &&
      Number(shipped.total) === Number(facts.total)
      ? null
      : "The pickup cart's card payment is not its shipped cart's"
  }

  if (isSharedSimplePay(facts)) {
    const pickup = other?.facts
    return pickup?.joined &&
      String(pickup.transactionId) === String(facts.transactionId) &&
      Number(facts.total) === Number(cart.total) + Number(other!.total)
      ? null
      : "The shared card payment is not the two carts' sum"
  }

  return null
}

const loadShareView = async (
  container: { resolve: (key: string) => any },
  cartId: string
): Promise<ShareView | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["id", "total", "metadata", "payment_collection.payment_sessions.data"],
  })
  const raw = data?.[0] as any

  if (!raw) {
    return null
  }

  const sessions = (raw.payment_collection?.payment_sessions ?? []) as { data?: unknown }[]
  const facts = sessions.map((session) => simplePayFactsOf(session?.data)).find(Boolean) ?? null

  return { id: raw.id, total: Number(raw.total), metadata: raw.metadata ?? null, facts }
}

/** The completion's check (the `validate` hook): throws when the card payment does not cover the cart. */
export const assertSimplePayShare = async (
  cartId: string,
  container: { resolve: (key: string) => any }
) => {
  const cart = await loadShareView(container, cartId)

  if (!cart?.facts) {
    return
  }

  const otherKey = cart.facts.joined
    ? PARENT_CART_METADATA_KEY
    : isSharedSimplePay(cart.facts)
      ? PICKUP_CART_METADATA_KEY
      : null
  const otherId = otherKey ? cart.metadata?.[otherKey] : null
  const other = typeof otherId === "string" && otherId ? await loadShareView(container, otherId) : null

  const problem = simplePayShareProblem(cart, other)

  if (problem) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, problem)
  }
}
