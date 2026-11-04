import { z } from "@medusajs/framework/zod"

import { PROBLEM_KINDS } from "../../../../modules/order-problem-report/types"
import { MAX_DESCRIPTION, MAX_ITEMS, MAX_PHOTOS, PHONE_PATTERN } from "../../../../workflows/utils/problem-report/rules"

/**
 * The problem report's body (V1.2). Strict: any other key is a 400. The kind is one of the five reasons; the
 * items are line item ids (the route checks they are this order's); the photos are ids the photo route gave.
 */
export const StorePostGuestProblem = z
  .object({
    order_number: z
      .string()
      .trim()
      .regex(/^#?\d{1,10}$/),
    email: z.string().trim().email().max(254),
    kind: z.enum(PROBLEM_KINDS),
    item_ids: z.array(z.string().min(1).max(64)).min(1).max(MAX_ITEMS),
    received_at: z.string().datetime({ offset: true }).optional(),
    description: z.string().trim().min(1).max(MAX_DESCRIPTION),
    phone: z.string().trim().regex(PHONE_PATTERN).optional(),
    photo_ids: z.array(z.string().min(1).max(64)).max(MAX_PHOTOS).default([]),
  })
  .strict()

export type StorePostGuestProblemType = z.infer<typeof StorePostGuestProblem>
