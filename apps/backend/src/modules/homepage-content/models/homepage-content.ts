import { model } from "@medusajs/framework/utils"

/**
 * The storefront home page's editable content: every title, subtitle, button
 * label and block text, the hero slides, and the shop's own details (address,
 * phone, opening hours, rating).
 *
 * A read model, like the brand and the landing page: the Acropora OS is the
 * owner and the only writer, and it writes the WHOLE record in one body. There
 * is one record, addressed by `key` (`main`), so a later second variant (a
 * campaign home page) needs no migration, only another key.
 *
 * `texts` is a flat `{ key: text }` map. The storefront owns the list of keys
 * and their starting values; a key the OS has not sent falls back to the
 * starting value, so the page never renders a hole. `slides` is the hero
 * carousel, at most five (Balázs, 2026-10-20); `null` means not set (the
 * storefront shows its starting slides), `[]` means no hero.
 *
 * `featured_handles` are the product handles the home page's "Egyedi korallok"
 * band shows, in order (the OS marks the products; at most 12). `null` and `[]`
 * both mean "none": the band is hidden.
 *
 * `featured_brand_handles` are the brand handles of the home page's logo strip,
 * in order (Balázs, 2026-10-27: any number of brands, set and ordered in the
 * OS). `null` and `[]` both mean "none": the block keeps its row of brand
 * names from the texts (hiding the block is the `blocks` list's job).
 *
 * `blocks` is the display order and visibility of the eight fixed home page
 * blocks; `null` means not set (the storefront's own order, all visible).
 * `footer` is the editable part of the footer (intro, link columns, social
 * addresses, bottom line); `null` means not set (the storefront's own footer).
 *
 * `newsletter` is the footer's newsletter row (kirakat-lablec-kep, 2026-10-27):
 * on or off, its title, text, consent text and button. `null` means not set:
 * the storefront shows its own row (on, with its own texts).
 */
export const HomepageContent = model
  .define("homepage_content", {
    id: model.id({ prefix: "hpc" }).primaryKey(),
    key: model.text(),
    texts: model.json(),
    slides: model.json().nullable(),
    featured_handles: model.json().nullable(),
    featured_brand_handles: model.json().nullable(),
    blocks: model.json().nullable(),
    footer: model.json().nullable(),
    newsletter: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_homepage_content_key_unique",
      on: ["key"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default HomepageContent
