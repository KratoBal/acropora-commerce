import { z } from "@medusajs/framework/zod"

/**
 * Marking needs a reason (it is what the next person reads); clearing does not.
 * `strict`: a body that tries to send the time or the actor is refused, they are
 * the server's.
 */
export const AdminPostPickupSkip = z
  .object({
    parent_cart_id: z.string().min(1),
    skip: z.boolean().default(true),
    reason: z.string().trim().min(3).max(300).optional(),
  })
  .strict()
  .refine((body) => !body.skip || !!body.reason, {
    message: "A reason is required when marking a cart 'do not retry'.",
    path: ["reason"],
  })

export type AdminPostPickupSkipType = z.infer<typeof AdminPostPickupSkip>
