import { z } from "@medusajs/framework/zod"

/**
 * The OS's split (card 0a14f739, C/3): the selected lines with the quantity
 * that moves, one `request_id` per split (sending it again finishes or
 * repeats the same split, never a second one), and the OS user's name.
 */
export const AdminPostOrderSplit = z
  .object({
    lines: z
      .array(
        z
          .object({
            item_id: z.string().trim().min(1).max(100),
            quantity: z.number().int().min(1),
          })
          .strict()
      )
      .min(1)
      .max(100),
    request_id: z.string().trim().min(1).max(100),
    actor: z.string().trim().min(1).max(100).optional(),
  })
  .strict()

export type AdminPostOrderSplitType = z.infer<typeof AdminPostOrderSplit>
