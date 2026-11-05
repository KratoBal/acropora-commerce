import { z } from "@medusajs/framework/zod"

import { MAX_ITEMS, MAX_NAME } from "../../../../../../../workflows/utils/withdrawal/rules"

/**
 * The signed-in customer's withdrawal body (V0.3). The order is the path's (and must be the session customer's own);
 * the address and the number of the guest pair are not asked. Strict: any other key is a 400.
 */
export const StorePostCustomerWithdrawal = z
  .object({
    customer_name: z.string().trim().min(1).max(MAX_NAME),
    item_ids: z.array(z.string().min(1).max(64)).min(1).max(MAX_ITEMS),
  })
  .strict()

export type StorePostCustomerWithdrawalType = z.infer<typeof StorePostCustomerWithdrawal>
