import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import AcroporaBankTransferService from "./service"

/**
 * PREPAYMENT BY BANK TRANSFER (card bb3a6bd5; Balázs, 2026-10-06 16:31 UTC:
 * "Elore utalas kell. Leadja a rendelest es mi kuldjuk neki gombbal a
 * dijbekerot").
 *
 * Registered in medusa-config.ts with id "transfer", so its provider id is
 * `pp_acropora_transfer`; the role map names it through
 * ACROPORA_PP_BANK_TRANSFER.
 */
export const BANK_TRANSFER_PROVIDER_ID = "pp_acropora_transfer" as const

export default ModuleProvider(Modules.PAYMENT, {
  services: [AcroporaBankTransferService],
})
