import { z } from "@medusajs/framework/zod"

/** The OS's list of the mails that did not go (Levélsablonok): only the stuck ones, paged. */
export const AdminGetWebshopMailOutboxParams = z
  .object({
    stuck: z.literal("true"),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict()

export type AdminGetWebshopMailOutboxParamsType = z.infer<typeof AdminGetWebshopMailOutboxParams>
