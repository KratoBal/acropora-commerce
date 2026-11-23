import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { LOYALTY_MODULE } from "../../modules/loyalty"
import type LoyaltyModuleService from "../../modules/loyalty/service"
import { amountOf, giftCardCredits, type CreditLineRow } from "./gift-card-credit"
import {
  LOYALTY_OFF_MESSAGE,
  LOYALTY_WITH_GIFT_CARD_MESSAGE,
  loyaltyCredits,
  loyaltySettings,
  maxPoints,
  pointsOfCredit,
} from "./loyalty/loyalty-credit"

type Container = { resolve: <T = unknown>(key: string) => T }

/** What the completion took from the ledger, for its compensation; null when the cart pays with no points. */
export type CartLoyaltyRedemption = {
  customer_id: string
  cart_id: string
  points: number
  /** The redemption was already there (a repeated completion): this run took nothing, and must not give back. */
  repeated: boolean
} | null

/**
 * TAKES THE POINTS OFF THE LEDGER when the cart becomes an order (card dfb79916), in the complete-cart validate hook: the
 * last place a refusal is still free. The twin of `redeemCartGiftCard`, and it keeps the lessons its reviews bought:
 * the cart is READ here (not taken from the hook's cart, whose missing field would read as 0 and never fire the guard);
 * an already completed cart takes nothing (Medusa runs the validate hook again for a finished cart, after the lock let it
 * in); a credit larger than the cart pays is refused, so the customer applies the points again.
 *
 * It also checks what the store route checked, because the route is not the only way a credit line gets on a cart: the
 * credit's owner is the cart's customer, the amount is exactly the points at the point value, the redemption is still
 * switched on, and the cart still qualifies (order minimum, minimum points, at most the allowed share).
 */
export async function redeemCartLoyalty(
  cart: { id: string; credit_lines?: (CreditLineRow | null)[] | null },
  container: Container,
): Promise<CartLoyaltyRedemption> {
  const credits = loyaltyCredits(cart.credit_lines)
  if (!credits.length) return null
  if (credits.length > 1)
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Egy rendeléshez egyszer váltható be hűségpont.")
  if (giftCardCredits(cart.credit_lines).length)
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, LOYALTY_WITH_GIFT_CARD_MESSAGE)
  const settings = loyaltySettings()
  if (!settings.enabled) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, LOYALTY_OFF_MESSAGE)

  const line = credits[0]!
  const points = pointsOfCredit(line)
  if (!line.reference_id || points < 1)
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "A hűségpont-jóváírás nem nevezi meg a vevőt vagy a pontszámot.")
  if (amountOf(line.amount) !== points * settings.value)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "A hűségpont-jóváírás összege nem egyezik a pontszámmal. Vedd le, és váltsd be újra.",
    )

  const now = await cartNow(cart.id, container)
  // AN ALREADY COMPLETED CART TAKES NOTHING: its order exists, and its redemption is the one that stands.
  if (now.completed) return null
  if (now.customerId !== line.reference_id)
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "A hűségpont nem ennek a kosárnak a vevőjéé.")
  if (maxPoints({ beforeCredits: now.beforeCredits, balance: Number.MAX_SAFE_INTEGER, settings }) < points)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "A hűségpont-jóváírás több, mint amit a rendelés fizethet pontból. Vedd le, és váltsd be újra.",
    )
  const result = await container
    .resolve<LoyaltyModuleService>(LOYALTY_MODULE)
    .redeemPoints({ customer_id: line.reference_id, points, cart_id: cart.id })
  return { customer_id: line.reference_id, cart_id: cart.id, points, repeated: result.repeated }
}

/**
 * The cart as it is now: its customer, whether it is completed, and what it pays before its credit lines. A cart that
 * cannot be read is refused, not let through.
 */
async function cartNow(
  cartId: string,
  container: Container,
): Promise<{ completed: boolean; beforeCredits: number; customerId: string | null }> {
  const query = container.resolve<{
    graph: (input: Record<string, unknown>) => Promise<{ data: Record<string, unknown>[] }>
  }>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "customer_id", "completed_at", "total", "credit_line_total"],
    filters: { id: cartId },
  })
  const row = data?.[0] as
    | { customer_id?: string | null; completed_at?: unknown; total?: unknown; credit_line_total?: unknown }
    | undefined
  if (!row || row.total === null || row.total === undefined)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `The total of cart ${cartId} could not be read; the points are not taken without it.`,
    )
  return {
    completed: !!row.completed_at,
    beforeCredits: amountOf(row.total) + amountOf(row.credit_line_total),
    customerId: row.customer_id ?? null,
  }
}

/** The compensation: a completion rolled back gives the points back, so a retry can take them again. */
export async function voidCartLoyaltyRedemption(
  redemption: CartLoyaltyRedemption | undefined,
  container: Container,
): Promise<void> {
  if (!redemption || redemption.repeated) return
  await container
    .resolve<LoyaltyModuleService>(LOYALTY_MODULE)
    .voidPointsRedemption({ customer_id: redemption.customer_id, cart_id: redemption.cart_id })
}
