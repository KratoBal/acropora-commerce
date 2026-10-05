import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  STRIPE_JOINED_KEY,
  STRIPE_JOINT_KEY,
  STRIPE_SHARE_KEY,
} from "../modules/stripe-capture/share"

/** The session data keys only our own server code may set. */
export const SERVER_ONLY_CARD_SHARE_KEYS = [
  STRIPE_SHARE_KEY,
  STRIPE_JOINT_KEY,
  STRIPE_JOINED_KEY,
] as const

/**
 * THE CLIENT CANNOT NAME A SHARED CARD PAYMENT (P4-3c).
 *
 * Medusa's store route that creates a payment session passes the request's
 * `data` to the provider. A pickup session JOINED to a PaymentIntent starts
 * nothing and carries the intent it is given; a JOINT session starts one for
 * the total it is given. Offered to the client, the first would let a
 * cart borrow someone else's paid intent, and the second would set its
 * own amount. Only our split route may set them, so the store route refuses
 * them outright.
 */
export const refuseClientCardShareKeys = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const data = (req.body as { data?: unknown } | undefined)?.data

  if (data && typeof data === "object") {
    const found = SERVER_ONLY_CARD_SHARE_KEYS.filter((key) =>
      Object.prototype.hasOwnProperty.call(data, key)
    )

    if (found.length) {
      res.status(400).json({
        type: "invalid_data",
        message: `These payment session fields are set by the shop, not the client: ${found.join(", ")}`,
      })
      return
    }
  }

  next()
}
