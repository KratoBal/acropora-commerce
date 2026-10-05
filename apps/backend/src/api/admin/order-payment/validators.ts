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
