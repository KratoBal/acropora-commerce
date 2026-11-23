import { z } from "@medusajs/framework/zod"

/** The newest rows next to the balance: twenty by default, at most fifty. */
export const StoreGetLoyaltyParams = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) }).strict()

export type StoreGetLoyaltyParamsType = z.infer<typeof StoreGetLoyaltyParams>
