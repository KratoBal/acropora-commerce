import { model } from "@medusajs/framework/utils"

/**
 * Shipping-relevant product attributes that Medusa itself does not model.
 *
 * These are shared concepts between Acropora OS and Medusa, so they get typed
 * columns rather than living in `product.metadata`.
 *
 * Every flag is set by hand. Acropora does not maintain reliable product
 * weights for shipping decisions, and the current UNAS webshop is operated by
 * marking products manually, so `is_heavy` is an explicit flag rather than
 * something derived from `ProductVariant.weight`. Weight is still not
 * duplicated here: it is simply not used for the shipping decision.
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

    /**
     * Heavy goods. Set by hand, never inferred from weight: Acropora has no
     * reliable product weights, and the UNAS practice this replaces is manual
     * marking too.
     */
    is_heavy: model.boolean().default(false),

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
