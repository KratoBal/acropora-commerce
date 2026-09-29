import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import SimplePayProviderService from "./service"

/**
 * Registered in medusa-config.ts with the id "simplepay", so its provider id is
 * `pp_simplepay_simplepay`; `ACROPORA_PP_ONLINE_CARD` names it for the
 * ONLINE_CARD role (`workflows/utils/payment-providers.ts`).
 */
export const SIMPLEPAY_PROVIDER_ID = "pp_simplepay_simplepay" as const

export default ModuleProvider(Modules.PAYMENT, {
  services: [SimplePayProviderService],
})
