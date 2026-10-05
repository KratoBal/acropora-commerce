import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { type AszfGuardCart, guardAszf } from "../workflows/utils/aszf-guard"
import { STRIPE_PROVIDER_ID } from "../workflows/utils/stripe-config"

const loadCart = async (req: MedusaRequest, cartId: string): Promise<AszfGuardCart | null> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: [
      "id",
      "metadata",
      "payment_collection.payment_sessions.provider_id",
      "payment_collection.payment_sessions.status",
    ],
  })
  const cart = data?.[0] as any
  if (!cart) return null
  return {
    metadata: cart.metadata ?? null,
    sessions: (cart.payment_collection?.payment_sessions ?? [])
      .filter(Boolean)
      .map((session: any) => ({
        provider_id: session.provider_id ?? null,
        status: session.status ?? null,
      })),
  }
}

/**
 * The ÁSZF net before a card payment starts or an order is placed
 * (aszf-guard.ts). A refusal is a 400 in Hungarian; nothing else runs.
 */
export const requireAszfAcceptance =
  (when: "start_card_payment" | "place_order") =>
  async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const result = guardAszf(await loadCart(req, req.params.id), when)
    if (result.action === "refuse") {
      res.status(400).json({ type: "not_allowed", message: result.message })
      return
    }
    next()
  }

/** Before a mixed cart's shared PaymentIntent is made: no record, no intent. */
export const aszfBeforeCardStart = requireAszfAcceptance("start_card_payment")
/** Before an order is placed (the card path passes: see aszf-guard.ts). */
export const aszfBeforePlaceOrder = requireAszfAcceptance("place_order")

/**
 * A STRIPE SESSION IS A PAYMENTINTENT (acrobot 26333, path A): the plain cart
 * now starts its card payment through `stripe-start` like the mixed one, and
 * a session made directly on the payment collection would be an intent
 * without the record. So a Stripe session is refused here without it; any
 * other provider (cash on delivery, pay at store) passes, its net is at
 * placing the order.
 */
export const aszfBeforeCardSession = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const providerId = (req.body as { provider_id?: unknown } | undefined)?.provider_id
  if (providerId !== STRIPE_PROVIDER_ID) {
    next()
    return
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "payment_collection",
    filters: { id: req.params.id },
    fields: ["id", "cart.id"],
  })
  const cartId = (data?.[0] as any)?.cart?.id as string | undefined
  const result = guardAszf(cartId ? await loadCart(req, cartId) : null, "start_card_payment")
  if (result.action === "refuse") {
    res.status(400).json({ type: "not_allowed", message: result.message })
    return
  }
  next()
}
