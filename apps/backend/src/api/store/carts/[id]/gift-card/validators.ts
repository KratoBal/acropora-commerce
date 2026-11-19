import { z } from "@medusajs/framework/zod"

/** A gift card code as the customer types it (card 495c0007); the service normalizes it. */
export const StorePostCartGiftCard = z
  .object({
    code: z.string().trim().min(1).max(64),
  })
  .strict()

export type StorePostCartGiftCardType = z.infer<typeof StorePostCartGiftCard>
