import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import AcroporaStripeService from "./service"

/**
 * Medusa's Stripe card provider with one change: the capture takes the amount
 * Medusa books (see ./service.ts). Registered in medusa-config.ts with the id
 * "stripe", so the provider id stays `pp_stripe_stripe` and the webhook stays
 * `/hooks/payment/stripe_stripe`.
 */
export default ModuleProvider(Modules.PAYMENT, {
  services: [AcroporaStripeService],
})
