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

/**
 * "Megjött az előre utalás" (card bb3a6bd5): the bank reference, the day it
 * was booked, and the amount the OS paired (checked against the session).
 */
export const AdminRecordTransferReceipt = z
  .object({
    reference: z.string().trim().min(1).max(200),
    received_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.number().positive(),
  })
  .strict()

export type AdminRecordTransferReceiptType = z.infer<typeof AdminRecordTransferReceipt>

/**
 * "Átállítás előre utalásra" (card d31a66a3): who pressed it in the OS (the order's edit and the switch mark carry the name).
 * Nothing else: the amount is the order's total, the provider the shop's bank transfer.
 */
export const AdminSwitchOrderToTransfer = z
  .object({
    actor: z.string().trim().min(1).max(120),
  })
  .strict()

export type AdminSwitchOrderToTransferType = z.infer<typeof AdminSwitchOrderToTransfer>
