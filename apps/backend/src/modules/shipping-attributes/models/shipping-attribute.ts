import { model } from "@medusajs/framework/utils"

/**
 * Shipping-relevant product attributes that Medusa itself does not model.
 *
 * These are shared concepts between Acropora OS and Medusa, so they get typed
 * columns rather than living in `product.metadata`. Weight is deliberately NOT
 * duplicated here: `ProductVariant.weight` is the canonical Medusa weight field.
 */
export const ShippingAttribute = model
  .define("shipping_attribute", {
    id: model.id({ prefix: "shpatt" }).primaryKey(),

    /**
     * The product these attributes belong to. This is the natural key: Acropora OS
     * synchronizes by product id, and there is at most one record per product.
     */
    product_id: model.text(),

    /** The whole cart must be collected in store when any item has this set. */
    pickup_only: model.boolean().default(false),

    /** Foxpost must not be offered when any cart item has this set. */
    foxpost_forbidden: model.boolean().default(false),

    /** Frozen goods cannot be shipped, so they behave like `pickup_only`. */
    is_frozen: model.boolean().default(false),
  })
  .indexes([
    {
      // Enforces "at most one record per product". The soft-delete condition
      // matches every core Medusa model, so a deleted record does not block a
      // new one for the same product.
      name: "IDX_shipping_attribute_product_id_unique",
      on: ["product_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default ShippingAttribute
