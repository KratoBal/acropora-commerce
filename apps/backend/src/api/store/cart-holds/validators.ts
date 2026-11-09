import { z } from "@medusajs/framework/zod"

/** One variant or several (`?variant_id=a&variant_id=b`), at most a cart's worth; the asking cart is optional. */
export const MAX_VARIANTS = 20

export const StoreGetCartHoldsParams = z
  .object({
    variant_id: z.preprocess(
      (value) => (Array.isArray(value) ? value : [value]),
      z.array(z.string().min(1)).min(1).max(MAX_VARIANTS)
    ),
    cart_id: z.string().min(1).optional(),
  })
  .strict()
