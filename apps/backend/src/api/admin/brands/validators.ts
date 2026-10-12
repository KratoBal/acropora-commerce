import { z } from "@medusajs/framework/zod"

const text = z.string().trim().min(1)

/**
 * The whole brand record, as the Acropora OS sends it (SEO P0 PR 11). Every
 * key is required, so an OS that forgets one is refused rather than leaving
 * an old value in place; `null` is how a field is cleared.
 */
export const AdminPutBrand = z
  .object({
    name: text,
    handle: z
      .string()
      .min(1)
      .regex(/^[^\s/?#]+$/, "A handle is one URL segment"),
    description: z.string().nullable(),
    intro: z.string().nullable(),
    seo_title: z.string().max(120).nullable(),
    meta_description: z.string().max(320).nullable(),
    logo_url: z.string().url().nullable(),
    website_url: z.string().url().nullable(),
  })
  .strict()

export const AdminPutProductBrand = z
  .object({ os_brand_id: z.string().min(1).nullable() })
  .strict()

export type AdminPutBrandType = z.infer<typeof AdminPutBrand>
export type AdminPutProductBrandType = z.infer<typeof AdminPutProductBrand>
