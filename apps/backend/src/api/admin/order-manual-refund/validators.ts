import { z } from "@medusajs/framework/zod"

import { SETTLED_BY_MAX, SETTLED_NOTE_MAX } from "../../../workflows/utils/manual-refund-settle"

/** Who settled the hand refund (the OS user's name) and an optional short note. Nothing else is accepted. */
export const AdminPostManualRefundSettle = z
  .object({
    settled_by: z.string().trim().min(1).max(SETTLED_BY_MAX),
    note: z.string().max(SETTLED_NOTE_MAX).nullable().optional(),
  })
  .strict()

export type AdminPostManualRefundSettleType = z.infer<typeof AdminPostManualRefundSettle>
