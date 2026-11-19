import { z } from "@medusajs/framework/zod"

/** The points to redeem; absent means as many as the cart takes. Whole points; the rules (minimum, balance) are the route's. */
export const StorePostCartLoyaltyPoints = z
  .object({
    points: z.number().int().min(1).max(1_000_000_000).optional(),
  })
  .strict()

export type StorePostCartLoyaltyPointsType = z.infer<typeof StorePostCartLoyaltyPoints>
