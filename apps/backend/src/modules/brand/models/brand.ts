import { model } from "@medusajs/framework/utils"

/**
 * A brand as the storefront shows it (SEO P0 PR 11, C7).
 *
 * A read model: the Acropora OS `Brand` is the owner and writes the whole
 * record by its own id (`os_brand_id`). Nothing here is edited by hand. The
 * Medusa collection that carries the brand today stays as it is during the
 * move; this record is what the brand page (`/hu/marka/{handle}`) reads.
 */
export const Brand = model
  .define("brand", {
    id: model.id({ prefix: "brand" }).primaryKey(),
    os_brand_id: model.text(),
    name: model.text(),
    handle: model.text(),
    description: model.text().nullable(),
    intro: model.text().nullable(),
    seo_title: model.text().nullable(),
    meta_description: model.text().nullable(),
    logo_url: model.text().nullable(),
    website_url: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_brand_os_brand_id_unique",
      on: ["os_brand_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_brand_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default Brand
