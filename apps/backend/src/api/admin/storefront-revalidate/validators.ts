import { z } from "@medusajs/framework/zod"

/** The tags the storefront's `/api/revalidate` accepts (`URITHETO_CIMKEK` there); `products` when none is named. */
export const REVALIDATE_TAGS = ["products", "redirects", "homepage-content", "brands"] as const

export const AdminStorefrontRevalidate = z
  .object({
    tags: z.array(z.enum(REVALIDATE_TAGS)).min(1).optional(),
  })
  .strict()

export type AdminStorefrontRevalidateType = z.infer<typeof AdminStorefrontRevalidate>
