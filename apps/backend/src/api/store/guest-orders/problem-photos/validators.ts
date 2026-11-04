import { z } from "@medusajs/framework/zod"

/**
 * One photo of a problem report, as base64 text (no `data:` prefix). Strict: any other key is a 400. The
 * 7,000,000 characters bound is the text of 5 MB (the route decodes and checks the real size and the type).
 */
export const StorePostGuestProblemPhoto = z
  .object({
    order_number: z
      .string()
      .trim()
      .regex(/^#?\d{1,10}$/),
    email: z.string().trim().email().max(254),
    content: z.string().min(1).max(7_000_000),
  })
  .strict()

export type StorePostGuestProblemPhotoType = z.infer<typeof StorePostGuestProblemPhoto>
