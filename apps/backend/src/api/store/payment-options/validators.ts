import { z } from "@medusajs/framework/zod"

export const StoreGetPaymentOptionsParams = z
  .object({
    cart_id: z.string().min(1),
  })
  .strict()
