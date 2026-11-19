import { z } from "@medusajs/framework/zod"

import { MAX_POINTS, REASON_MAX, REFERENCE_MAX } from "../../../modules/loyalty/types"

/**
 * A manual credit or debit. `points` is a whole, signed, non-zero number within the sanity bound; `reason` is required
 * (a movement nobody can explain later is the one that gets disputed); `reference` is the caller's own key, so a retry
 * after a timeout stores one row.
 */
export const AdminPostLoyaltyAdjustment = z
  .object({
    customer_id: z.string().trim().min(1).max(100),
    points: z
      .number()
      .int()
      .refine((value) => value !== 0, "points must not be zero")
      .refine((value) => Math.abs(value) <= MAX_POINTS, `points must be at most ${MAX_POINTS} either way`),
    reason: z.string().trim().min(1).max(REASON_MAX),
    reference: z.string().trim().min(1).max(REFERENCE_MAX).optional(),
  })
  .strict()

export type AdminPostLoyaltyAdjustmentType = z.infer<typeof AdminPostLoyaltyAdjustment>

/** The newest rows to show next to the balance: fifty by default, at most one hundred. */
export const AdminGetLoyaltyParams = z
  .object({ limit: z.coerce.number().int().min(1).max(100).default(50) })
  .strict()

export type AdminGetLoyaltyParamsType = z.infer<typeof AdminGetLoyaltyParams>
