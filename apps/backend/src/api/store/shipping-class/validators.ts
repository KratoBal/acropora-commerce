import { z } from "@medusajs/framework/zod";

export const StoreGetShippingClassParams = z
  .object({
    cart_id: z.string().min(1),
  })
  .strict();
