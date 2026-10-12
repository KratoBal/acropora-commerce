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
        // NOT YET (barracuda, #541): the storefront cannot apply an attribute
        // filter, and a page that ignored one would list MORE than its name
        // promises, silently. This second guard (the OS refuses one too) is
        // lifted in the PR that teaches the storefront to apply them.
        attribute_filters: z
          .array(
            z.object({ key: text, op: text, value: z.unknown() }).strict()
          )
          .max(0),
      })
      .strict()
      // an empty filter is the whole catalogue: a duplicate of /hu/store with
      // its own canonical and sitemap row, the opposite of what a landing is for
      .refine(
        (f) => f.category_ids.length > 0 || f.os_brand_ids.length > 0,
        "A landing page filters on at least one category or brand"
      ),
    is_published: z.boolean(),
  })
  .strict()

export type AdminPutLandingPageType = z.infer<typeof AdminPutLandingPage>
