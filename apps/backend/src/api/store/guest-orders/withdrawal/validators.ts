import { z } from "@medusajs/framework/zod"

import { MAX_ITEMS, MAX_NAME } from "../../../../workflows/utils/withdrawal/rules"

/**
 * The withdrawal's body (V0.3). Strict: any other key is a 400. The items are line item ids (the route checks they
 * are this order's); the name is the one the customer signs the declaration with.
 */
export const StorePostGuestWithdrawal = z
  .object({
    order_number: z
      .string()
      .trim()
      .regex(/^#?\d{1,10}$/),
    email: z.string().trim().email().max(254),
    customer_name: z.string().trim().min(1).max(MAX_NAME),
    item_ids: z.array(z.string().min(1).max(64)).min(1).max(MAX_ITEMS),
  })
  .strict()

export type StorePostGuestWithdrawalType = z.infer<typeof StorePostGuestWithdrawal>
