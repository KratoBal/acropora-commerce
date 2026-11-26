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
    // an advance proforma's transfer (card d31a66a3, 2b): only then may the amount be less than the order (barracuda on #908)
    advance: z.boolean().optional(),
    // the advance proforma's number (card d31a66a3, acrobot 63071): the guest page asks the customer to name it on the balance's
    // transfer, the number the OS's bank pairing looks for. A document number, nothing else: letters, digits, "/", "-", "_", "."
    balance_reference: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9/._-]{0,39}$/)
      .optional(),
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
