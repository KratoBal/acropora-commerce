import { z } from "@medusajs/framework/zod"

import { ORDER_BUSINESS_STATUSES } from "../../../modules/order-business-status/types"

export const AdminTransitionOrderBusinessStatus = z
  .object({
    status: z.enum(ORDER_BUSINESS_STATUSES),
    /**
     * The OS's "Vevő értesítése" checkbox (Rendelések prompt, point 9), ticked
     * by default: missing means true. False changes the status without a mail.
     */
    notify_customer: z.boolean().optional(),
  })
  .strict()

export type AdminTransitionOrderBusinessStatusType = z.infer<
  typeof AdminTransitionOrderBusinessStatus
>

/**
 * "Értesítő újraküldése": the mail of one history row again. Without
 * `history_id`, the latest row (the current status).
 */
export const AdminResendOrderStatusNotification = z
  .object({
    history_id: z.string().min(1).optional(),
  })
  .strict()

export type AdminResendOrderStatusNotificationType = z.infer<
  typeof AdminResendOrderStatusNotification
>
