import { z } from "@medusajs/framework/zod"

import { PAYMENT_ROLES } from "../../../workflows/utils/payment-eligibility"
import { SHIPPING_OPTION_ROLES } from "../../../workflows/utils/shipping-eligibility"

const PaymentRoleList = z.array(z.enum(PAYMENT_ROLES))

/**
 * The whole matrix at once (card e0e2378b): every shipping method with its
 * payment methods in the order the customer sees them. A shipping method left
 * out is an error, not "unchanged": a partial matrix would make the stored one
 * the sum of two edits nobody saw together. The checks a schema cannot express
 * (non-empty, no duplicate, impossible pairs) are in `matrixToRows`.
 */
export const AdminPutShippingPaymentRules = z
  .object({
    matrix: z
      .object(
        Object.fromEntries(
          SHIPPING_OPTION_ROLES.map((role) => [role, PaymentRoleList])
        ) as Record<(typeof SHIPPING_OPTION_ROLES)[number], typeof PaymentRoleList>
      )
      .strict(),
  })
  .strict()

export type AdminPutShippingPaymentRulesType = z.infer<
  typeof AdminPutShippingPaymentRules
>
