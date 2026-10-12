import { z } from "@medusajs/framework/zod"

const text = z.string().trim().min(1)
const ids = z.array(text).max(200)

/**
 * The whole landing page record, as the Acropora OS sends it (SEO P1-14).
 * Every key is required, so an OS that forgets one is refused rather than
 * leaving an old value in place; `null` is how a text field is cleared.
 */
export const AdminPutLandingPage = z
  .object({
    handle: z
      .string()
      .min(1)
      .regex(/^[^\s/?#]+$/, "A handle is one URL segment"),
    title: text,
    seo_title: z.string().max(120).nullable(),
    meta_description: z.string().max(320).nullable(),
    intro: z.string().nullable(),
    filter: z
      .object({
        category_ids: ids,
        os_brand_ids: ids,
        attribute_filters: z
          .array(
            z.object({ key: text, op: text, value: z.unknown() }).strict()
          )
          .max(50),
      })
      .strict(),
    is_published: z.boolean(),
  })
  .strict()

export type AdminPutLandingPageType = z.infer<typeof AdminPutLandingPage>
