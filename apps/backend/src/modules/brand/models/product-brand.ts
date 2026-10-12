import { model } from "@medusajs/framework/utils"

/**
 * Which brand a product belongs to: at most one row per product.
 *
 * The row holds the OS brand id, not this module's own brand id, so the OS
 * can write a product's brand without first reading back an id it does not
 * own, and the order of the two writes cannot leave a dangling reference.
 * Like `shipping_attribute`, it owns `product_id`, and the read-only link in
 * `src/links/product-brand.ts` points it at the product.
 */
export const ProductBrand = model
  .define("product_brand", {
    id: model.id({ prefix: "pbrand" }).primaryKey(),
    product_id: model.text(),
    os_brand_id: model.text(),
  })
  .indexes([
    {
      name: "IDX_product_brand_product_id_unique",
      on: ["product_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_product_brand_os_brand_id",
      on: ["os_brand_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default ProductBrand
