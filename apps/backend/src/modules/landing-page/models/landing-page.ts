import { model } from "@medusajs/framework/utils"

/**
 * An SEO landing page as the storefront serves it (SEO P1-14, plan C10), at
 * `/hu/valogatas/{handle}` (Balázs, 2026-10-12).
 *
 * A read model, like the brand: the Acropora OS `SeoLandingPage` is the owner
 * and writes the whole record by its own id (`os_landing_id`). The filter
 * arrives already in the shop's terms: Medusa category ids (the OS translates
 * its own tree through its category links) and OS brand ids (what the brand
 * module keys on), in one `filter` object, as the OS keeps its own
 * `filterDefinition`. `attribute_filters` is kept as the OS sends it; the OS
 * refuses a non-empty one until the storefront can apply it.
 */
export const LandingPage = model
  .define("landing_page", {
    id: model.id({ prefix: "lpage" }).primaryKey(),
    os_landing_id: model.text(),
    handle: model.text(),
    title: model.text(),
    seo_title: model.text().nullable(),
    meta_description: model.text().nullable(),
    intro: model.text().nullable(),
    /** `{ category_ids, os_brand_ids, attribute_filters }` */
    filter: model.json(),
    is_published: model.boolean().default(false),
  })
  .indexes([
    {
      name: "IDX_landing_page_os_landing_id_unique",
      on: ["os_landing_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_landing_page_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default LandingPage
