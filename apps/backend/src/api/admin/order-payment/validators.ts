import { z } from "@medusajs/framework/zod"

/**
 * "Csúszik a szállítás": the hold released. `notify_customer` is the OS's
 * "Vevő értesítése" checkbox, ticked by default: missing means true.
 */
export const AdminReleaseOrderPaymentHold = z
  .object({
    notify_customer: z.boolean().optional(),
  })
  .strict()

export type AdminReleaseOrderPaymentHoldType = z.infer<typeof AdminReleaseOrderPaymentHold>

/**
 * "Fizetési link küldése": a link for what the order owes now. Again with
 * `notify_customer`, ticked by default.
 */
export const AdminSendOrderPaymentLink = z
  .object({
    notify_customer: z.boolean().optional(),
  })
  .strict()

export type AdminSendOrderPaymentLinkType = z.infer<typeof AdminSendOrderPaymentLink>
