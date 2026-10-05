import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * THE SESSION DATA A CLIENT MAY SEND: NONE (acrobot 26232, the Stripe survey's
 * finding 3/2, 2026-10-05).
 *
 * Medusa's store route that creates a payment session
 * (`POST /store/payment-collections/:id/payment-sessions`) passes the request's
 * `data` to the provider unread. The stock Stripe provider
 * (`@medusajs/payment-stripe` 2.20.1, `normalizePaymentIntentParameters`) takes
 * `capture_method`, `payment_method_types`, `metadata`, `confirm`,
 * `setup_future_usage` and more from it into the PaymentIntent. So a client
 * could ask for an automatic capture (the whole amount at once, past our
 * capture of the booked amount), or write `a:` part keys into the metadata
 * that our webhook filter reads. The amount is not among them: Medusa takes it
 * from the cart.
 *
 * Until now only the shared payment's keys were refused (a deny list); every
 * other key went through. This is an ALLOW list, and it is empty: our
 * storefront sends `provider_id` alone (`lib/data/cart.ts`
 * `initiatePaymentSession`), and the shared payment's data is set by our own
 * server code, which does not go through this route (`startPayment` runs the
 * workflow directly). A key added here is a decision that the client may set
 * it, with the reason next to it.
 */
export const CLIENT_SESSION_DATA_KEYS: readonly string[] = []

export const refuseClientSessionData = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const data = (req.body as { data?: unknown } | undefined)?.data

  if (data === undefined || data === null) {
    next()
    return
  }

  const refused =
    typeof data !== "object" || Array.isArray(data)
      ? ["data"]
      : Object.keys(data).filter((key) => !CLIENT_SESSION_DATA_KEYS.includes(key))

  if (refused.length) {
    res.status(400).json({
      type: "invalid_data",
      message: `These payment session fields are set by the shop, not the client: ${refused.join(", ")}`,
    })
    return
  }

  next()
}
