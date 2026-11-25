import { MedusaError } from "@medusajs/framework/utils"

import { loadCartShippingDecision } from "./load-cart-shipping-decision"
import { providersForMixedCart, type AllowedPaymentProvider } from "./payment-providers"
import type { CartPaymentContext } from "./resolve-cart-payment-context"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "./split-completion"

/**
 * THE PAYMENT METHOD IS CHECKED WHERE THE ORDER IS PLACED (task commerce-fizetesi-mod-lezaras-20261125, card d31a66a3, slice 0; acrobot
 * 61171/61181, nautilus 61179). Measured on the test shop 2026-11-25 (nautilus on a Foxpost cart, and me on a GLS cart after "Előre utalás" was hidden
 * everywhere): `GET /store/payment-options` did not offer a provider (the bank transfer; the shop payment `pp_system_default` on a courier cart),
 * a payment session for it was created (HTTP 200), and BOTH ways of placing the order accepted it: the storefront's `POST .../complete-split`
 * and Medusa's own `POST .../complete` (an order, HTTP 200). The offer was the only place the shipping x payment table was ever applied
 * (`isPaymentRoleAllowedFor` has no caller): a direct API call could pay a cart with a method the shop hides.
 *
 * THE RULE, over the same answer the offer gives (`allowed_payment_providers`, narrowed for a mixed cart by `providersForMixedCart`): every
 * payment session Medusa would process at the completion (its own list: pending, requires_more, authorized, captured, pending_authorization;
 * the same list `validateCartPaymentsStep` reads, which also refuses on ANY of them) must belong to a provider the cart is offered. A session
 * of a provider the offer does not name, including one the role map does not know, refuses the placement; a cart with no processable session
 * (a zero total, a gift card or points covering all of it) passes, as before.
 *
 * WHAT IT LEAVES ALONE, on purpose: the PICKUP HALF of a split cart (its shipping is the store pickup, and its payment is the shared card
 * payment of the pair, which the parent's check and `assertCardShare` already hold; checking it against the pickup's own roles would refuse the
 * pair's card). The hook runs for both ways and both halves, so the check sits in the one hook (`complete-cart-cod-fee.ts`), not in the routes.
 */
export const PROCESSABLE_SESSION_STATUSES = ["pending", "requires_more", "authorized", "captured", "pending_authorization"] as const

export type SessionForPayment = { provider_id?: string | null; status?: string | null }

export type PaymentRefusal = { providerIds: string[] }

/** The sessions the completion would process whose provider is not in the offered list; `null` when all are offered (or none). */
export const paymentRefusalOf = (input: {
  sessions: (SessionForPayment | null | undefined)[]
  offered: AllowedPaymentProvider[]
  pickupHalf: boolean
}): PaymentRefusal | null => {
  if (input.pickupHalf) return null
  const offeredIds = new Set(input.offered.map((provider) => provider.id))
  const refused = input.sessions
    .filter((session): session is SessionForPayment => !!session)
    .filter((session) => (PROCESSABLE_SESSION_STATUSES as readonly string[]).includes(String(session.status)))
    .map((session) => session.provider_id ?? "")
    .filter((providerId) => !offeredIds.has(providerId))
  return refused.length ? { providerIds: Array.from(new Set(refused)) } : null
}

export const PAYMENT_NOT_ALLOWED_MESSAGE =
  "A választott fizetési mód ehhez a rendeléshez nem érhető el. Válassz másik fizetési módot a fizetés lépésben."

type CartForPaymentCheck = {
  id: string
  metadata?: Record<string, unknown> | null
  payment_collection?: { payment_sessions?: (SessionForPayment | null | undefined)[] | null } | null
}

/** The hook's part: the same offer the storefront reads, applied to the cart that is being placed. */
export const assertPaymentAllowedForCart = async (
  cart: CartForPaymentCheck,
  context: CartPaymentContext,
  container: { resolve: (key: string) => any }
): Promise<void> => {
  const metadata = cart.metadata ?? null
  const pickupHalf = typeof metadata?.[PARENT_CART_METADATA_KEY] === "string"
  if (pickupHalf) return
  // the same "mixed" the offer computes (payment-options/route.ts): lines that will split, or a cart already split
  const decision = await loadCartShippingDecision(cart.id, container)
  const mixed = !!decision?.split_line_ids.length || !!metadata?.[PICKUP_CART_METADATA_KEY]
  const refusal = paymentRefusalOf({
    sessions: cart.payment_collection?.payment_sessions ?? [],
    offered: providersForMixedCart(context.allowed_payment_providers, mixed),
    pickupHalf,
  })
  if (!refusal) return
  try {
    container
      .resolve("logger")
      ?.warn(`cart ${cart.id}: not placed, the payment provider ${refusal.providerIds.join(", ")} is not offered for it (shipping roles ${context.shipping_roles.join(", ") || "none"})`)
  } catch {
    // no logger: the refusal below is the record
  }
  throw new MedusaError(MedusaError.Types.NOT_ALLOWED, PAYMENT_NOT_ALLOWED_MESSAGE)
}
