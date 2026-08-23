import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import AcroporaCashOnDeliveryService from "./service"

/**
 * The provider id Medusa builds from this registration is
 * `pp_${identifier}_${id}`, where the identifier is on the service and the id
 * is in `medusa-config.ts`. With `acropora` and `cod` that is
 * `pp_acropora_cod`, and the constant below is the one thing the rest of the
 * system should reference.
 *
 * It is a historical identifier: every cash-on-delivery order ever placed
 * carries it, and it cannot be rewritten afterwards. That is why the fee
 * architecture may not lean on the shared `pp_system_default`
 * (D-2026-08-23-24).
 */
export const CASH_ON_DELIVERY_PROVIDER_ID = "pp_acropora_cod" as const

export default ModuleProvider(Modules.PAYMENT, {
  services: [AcroporaCashOnDeliveryService],
})
