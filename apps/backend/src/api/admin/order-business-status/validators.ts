import { z } from "@medusajs/framework/zod"

import { ORDER_BUSINESS_STATUSES } from "../../../modules/order-business-status/types"

export const AdminTransitionOrderBusinessStatus = z
  .object({
    status: z.enum(ORDER_BUSINESS_STATUSES),
  })
  .strict()

export type AdminTransitionOrderBusinessStatusType = z.infer<
  typeof AdminTransitionOrderBusinessStatus
>
