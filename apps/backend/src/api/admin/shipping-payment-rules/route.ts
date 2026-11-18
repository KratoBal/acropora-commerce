import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { COMMERCE_SETTINGS_MODULE } from "../../../modules/commerce-settings"
import type CommerceSettingsModuleService from "../../../modules/commerce-settings/service"
import { PAYMENT_ROLES } from "../../../workflows/utils/payment-eligibility"
import { SHIPPING_OPTION_ROLES } from "../../../workflows/utils/shipping-eligibility"
import { toShippingRolePayments } from "../../../workflows/utils/shipping-payment-rules"
import { matrixToRows } from "./rules"
import type { AdminPutShippingPaymentRulesType } from "./validators"

const service = (req: MedusaRequest): CommerceSettingsModuleService =>
  req.scope.resolve(COMMERCE_SETTINGS_MODULE)

/** The stored matrix, with the role lists the screen offers (card e0e2378b). */
const read = async (svc: CommerceSettingsModuleService) => ({
  matrix: toShippingRolePayments(
    await svc.listShippingPaymentRules({}, { take: null })
  ),
  shipping_roles: SHIPPING_OPTION_ROLES,
  payment_roles: PAYMENT_ROLES,
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json(await read(service(req)))
}

/** Replaces the whole matrix in one transaction; the answer is the stored state, read back. */
export const PUT = async (
  req: MedusaRequest<AdminPutShippingPaymentRulesType>,
  res: MedusaResponse
) => {
  const rows = matrixToRows(req.validatedBody.matrix)
  const svc = service(req)
  await svc.replaceShippingPaymentRules(rows)
  res.json(await read(svc))
}
