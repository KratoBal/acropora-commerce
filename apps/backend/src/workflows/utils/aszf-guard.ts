import { STRIPE_PROVIDER_ID } from "./stripe-config"
import { ASZF_METADATA_KEY } from "./split-completion"

/**
 * NO ORDER AND NO CARD PAYMENT WITHOUT THE ÁSZF ACCEPTANCE (acrobot 26330, card
 * 4a2b252d). The storefront writes the record on the cart before any payment
 * starts (`aszf_elfogadas`); this is the server's net under it, placed where
 * there is no money yet:
 *
 * - `stripe-start` (a mixed cart's shared PaymentIntent): refused without the
 *   record, so no intent is made and nothing can be held;
 * - `complete-split` (placing the order): refused without the record, EXCEPT
 *   on the card path (a Stripe session on the cart). There the card may
 *   already be held, and the session does not say so: Medusa authorizes the
 *   session only INSIDE the completion, so a held card still reads "pending"
 *   here. Refusing would leave the money held with no order. The card path's
 *   net is where its intent is made: `stripe-start` here, and the session's
 *   creation once the plain cart moves to the same deferred path (acrobot
 *   26333, the next PR).
 */
export const ASZF_HIANYZIK = "Az ÁSZF elfogadása nélkül a rendelés nem adható le."

export type AszfGuardCart = {
  metadata: Record<string, unknown> | null
  sessions: { provider_id: string | null; status: string | null }[]
}

const hasRecord = (metadata: Record<string, unknown> | null) => {
  const record = metadata?.[ASZF_METADATA_KEY] as { idopont?: unknown } | undefined
  return !!record && typeof record === "object" && typeof record.idopont === "string"
}

/** The cart pays by card (a Stripe session, held or not: see above). */
const cardPath = (cart: AszfGuardCart) =>
  cart.sessions.some((session) => session.provider_id === STRIPE_PROVIDER_ID)

export type AszfGuardResult = { action: "pass" } | { action: "refuse"; message: string }

export const guardAszf = (
  cart: AszfGuardCart | null,
  when: "start_card_payment" | "place_order"
): AszfGuardResult => {
  // an unknown cart is the route's to answer (404), not this guard's
  if (!cart) return { action: "pass" }
  if (hasRecord(cart.metadata)) return { action: "pass" }
  if (when === "place_order" && cardPath(cart)) return { action: "pass" }
  return { action: "refuse", message: ASZF_HIANYZIK }
}
